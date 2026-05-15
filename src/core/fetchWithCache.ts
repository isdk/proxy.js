import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import CachePolicy from 'http-cache-semantics';
import { debug as debugFactory } from 'debug';

import type { SmartCache } from './SmartCache';
import { generateCacheKey } from './generateCacheKey';
import { ProxySiteConfig, ProxyCacheMetadata, ProxyCacheEntry, ProxyCacheRule } from '../types';
import { OfflineCacheMissErrorCode, OfflineCacheMissErrorMsg } from '../errors';
import { isCacheable } from './isCacheable';
import { isResponseCacheable } from './isResponseCacheable';
import { createResponse, getEffectiveConfig } from '../utils';

/**
 * fetchWithCache 选项
 */
export interface FetchWithCacheOptions {
  /** 混合缓存实例 */
  cache: SmartCache;
  /** 站点级基础配置 */
  config: ProxySiteConfig;
  /** 是否启用后台异步更新 (SWR) */
  backgroundUpdate?: boolean;
  /** 是否强制刷新缓存（跳过读取，但请求成功后会更新缓存） */
  refresh?: boolean;
  /** 后台更新 Promise 触发时的回调 */
  onBackgroundUpdate?: (promise: Promise<Response>) => void;
  /** 自定义缓存键生成函数 */
  generateKey?: typeof generateCacheKey;
  /**
   * 并发写入任务追踪器
   */
  activeCacheWrites?: Map<string, Promise<void>>;
}

/** 内部流水线上下文 */
export interface FetchWithCacheContext extends FetchWithCacheOptions {
  request: Request;
  fetcher: (req: Request) => Promise<Response>;
  cacheKey: string;
  activeCacheWrites: Map<string, Promise<void>>;
  /** 最终生效的合并配置 */
  effectiveConfig: ProxyCacheRule;
}

const debug = debugFactory('@isdk/proxy:fetchWithCache');

/**
 * 核心辅助：将 Buffer、Node Stream 或 Uint8Array 转换为标准的 Web Response Body
 */
function createResponseBody(body: any): BodyInit {
  if (body instanceof Buffer) {
    return new Uint8Array(body);
  }
  if (body && typeof body.pipe === 'function') {
    try {
      const readable = (typeof body._read === 'function' && typeof body._readableState === 'object')
        ? body
        : Readable.from(body);
      return Readable.toWeb(readable) as any;
    } catch (e) {
      return body;
    }
  }
  return body;
}

/**
 * 从Cache构建响应对象
 */
function buildResponseFromCache(entry: ProxyCacheEntry, cacheStatus: string): Response {
  const body = (entry.status === 204 || entry.status === 304 || entry.status < 200)
    ? null
    : createResponseBody(entry.body);

  return createResponse(body, {
    status: entry.status,
    headers: { ...entry.headers, 'x-proxy-cache': cacheStatus },
    url: entry.url
  });
}

/**
 * 评估缓存策略状态
 */
function evaluateCachePolicy(ctx: FetchWithCacheContext, entry: ProxyCacheEntry): 'HIT' | 'STALE' {
  const policy = CachePolicy.fromObject(entry.policy);
  const reqForPolicy = {
    url: entry.url,
    method: ctx.request.method,
    headers: Object.fromEntries(ctx.request.headers)
  };

  return policy.satisfiesWithoutRevalidation(reqForPolicy) ? 'HIT' : 'STALE';
}

/**
 * 触发后台 SWR 更新
 */
function triggerBackgroundUpdate(ctx: FetchWithCacheContext, fallbackEntry: ProxyCacheEntry): void {
  if (ctx.activeCacheWrites.has(ctx.cacheKey)) return;

  const promise = executeFetchAndCache(ctx, fallbackEntry).catch(error => {
    console.error(`[SWR Error] ${ctx.cacheKey}:`, error);
    return buildResponseFromCache(fallbackEntry, 'STALE_IF_ERROR');
  });
  try {
    ctx.onBackgroundUpdate?.(promise);
  } catch (e) {
    console.error(`[SWR Callback Error] ${ctx.cacheKey}:`, e);
  }
}

/**
 * 排队等待正在进行的缓存写入
 */
async function waitForActiveCacheWrite(ctx: FetchWithCacheContext): Promise<Response | null> {
  const writePromise = ctx.activeCacheWrites.get(ctx.cacheKey);
  if (!writePromise) return null;

  await writePromise;
  const cachedEntry = await ctx.cache.get(ctx.cacheKey);
  if (cachedEntry) {
    return buildResponseFromCache(cachedEntry, 'HIT');
  }
  return null;
}

/**
 * 执行 Fetch 并写入缓存
 */
async function executeFetchAndCache(ctx: FetchWithCacheContext, fallbackEntry?: ProxyCacheEntry | null): Promise<Response> {
  let resolveWrite!: () => void;
  let rejectWrite!: (err: any) => void;

  const writePromise = new Promise<void>((resolve, reject) => {
    resolveWrite = () => { ctx.activeCacheWrites.delete(ctx.cacheKey); resolve(); };
    rejectWrite = (err: any) => { ctx.activeCacheWrites.delete(ctx.cacheKey); reject(err); };
  });

  writePromise.catch(() => { });
  ctx.activeCacheWrites.set(ctx.cacheKey, writePromise);

  try {
    const response = await ctx.fetcher(ctx.request.clone());
    const responseHeaders = new Headers(response.headers);

    // 1. 响应侧校验 (WAF 识别、脏数据拦截)
    const validation = await isResponseCacheable(response, ctx.effectiveConfig);
    if (!validation.cacheable) {
      debug('Response not cacheable:', validation.reason);
      resolveWrite();

      // 如果触发了容灾保护 (例如命中 WAF 挑战且存在旧缓存)，则返回旧缓存
      if (validation.keepOldCache && fallbackEntry) {
        const reason = validation.reason?.toUpperCase().replace(/[^A-Z0-9]/g, '_') || 'UNKNOWN';
        debug(`Triggering DR protection (${reason}), returning old cache`);
        return buildResponseFromCache(fallbackEntry, `STALE_RESCUE_${reason}`);
      }

      // 观点 A：即使不缓存，也打上细化的标记说明原因
      const reason = validation.reason?.toUpperCase().replace(/[^A-Z0-9]/g, '_') || 'UNKNOWN';
      responseHeaders.set('x-proxy-cache', `MISS_EXCLUDED_${reason}`);
      return createResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        url: response.url
      });
    }

    const newPolicy = new CachePolicy(
      { url: ctx.request.url, method: ctx.request.method, headers: Object.fromEntries(ctx.request.headers) },
      { status: response.status, headers: Object.fromEntries(response.headers) }
    );

    debug('executeFetch And Cache', ctx.request.url)

    // 2. 存储决策
    // forceCache 允许忽略 no-store，但基础状态码仍需由 isResponseCacheable 保证 (默认 2xx, 404 等)
    const isStorable = newPolicy.storable() || ctx.effectiveConfig.forceCache;

    if (!isStorable) {
      resolveWrite();
      responseHeaders.set('x-proxy-cache', 'MISS_UNSTORABLE');
      return createResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        url: response.url
      });
    }

    responseHeaders.set('x-proxy-cache', 'MISS');

    const metadata: Omit<ProxyCacheMetadata, 'size'> = {
      status: response.status,
      headers: Object.fromEntries(response.headers),
      policy: newPolicy.toObject(),
      url: ctx.request.url,
      method: ctx.request.method,
      timestamp: Date.now(),
    };

    if (!response.body) {
      await ctx.cache.set(ctx.cacheKey, Buffer.alloc(0), metadata);
      resolveWrite();
      return createResponse(null, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        url: response.url
      });
    }

    const [streamForClient, streamForCache] = response.body.tee();

    pipeline(
      Readable.fromWeb(streamForCache as any),
      ctx.cache.setStream(ctx.cacheKey, metadata)
    )
      .then(resolveWrite)
      .catch(rejectWrite);

    return createResponse(streamForClient, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      url: response.url
    });

  } catch (error) {
    rejectWrite(error);
    if (fallbackEntry && ctx.effectiveConfig.staleIfError) {
      return buildResponseFromCache(fallbackEntry, 'STALE_IF_ERROR');
    }
    throw error;
  }
}

/**
 * 核心协调函数：协调请求、缓存命中、并发控制和 SWR
 */
export async function fetchWithCache(
  request: Request,
  fetcher: (req: Request) => Promise<Response>,
  options: FetchWithCacheOptions
): Promise<Response> {
  const { config, cache } = options;

  // 1. 请求分析 (门控、规则匹配、配置合并)
  const cacheabled = await isCacheable(request, config);
  const effectiveConfig = getEffectiveConfig(cacheabled?.matchedRule || {}, config);

  // 2. 检查可缓存性
  if (!cacheabled) {
    if (effectiveConfig.offline) {
      return createResponse(OfflineCacheMissErrorMsg, {
        status: OfflineCacheMissErrorCode,
        headers: { 'x-proxy-cache': 'OFFLINE_MISS_EXCLUDED_REQUEST' },
        url: request.url
      });
    }
    const response = await fetcher(request) || {};
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('x-proxy-cache', 'MISS_EXCLUDED_REQUEST');

    return createResponse(createResponseBody(response.body), {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      url: response.url
    });
  }

  const { bodyState } = cacheabled;

  // 3. 生成缓存键 (利用已有的 bodyState 和 effectiveConfig 避免重复读取/合并)
  const genKey = options.generateKey || generateCacheKey;
  const cacheKey = await genKey(request, config, bodyState, effectiveConfig);

  const ctx: FetchWithCacheContext = {
    ...options,
    request,
    fetcher,
    cacheKey,
    effectiveConfig,
    activeCacheWrites: options.activeCacheWrites || new Map<string, Promise<void>>()
  };

  // 4. 尝试读取缓存
  const cachedEntry = await cache.get(cacheKey);

  // 5. 处理离线模式
  if (effectiveConfig.offline) {
    if (cachedEntry) return buildResponseFromCache(cachedEntry, 'OFFLINE_HIT');
    return createResponse(OfflineCacheMissErrorMsg, {
      status: OfflineCacheMissErrorCode,
      headers: { 'x-proxy-cache': 'OFFLINE_HIT' },
      url: request.url
    });
  }

  // 6. 判定命中状态 (如果开启 refresh 则跳过命中判定，强制回源)
  if (cachedEntry && !options.refresh) {
    const status = evaluateCachePolicy(ctx, cachedEntry);
    debug('evaluateCachePolicy:', request.url, status)

    if (status === 'HIT') {
      return buildResponseFromCache(cachedEntry, 'HIT');
    }

    if (status === 'STALE' && options.backgroundUpdate !== false) {
      triggerBackgroundUpdate(ctx, cachedEntry);
      return buildResponseFromCache(cachedEntry, 'STALE');
    }
  }

  // 7. 防击穿处理
  if (ctx.activeCacheWrites.has(cacheKey)) {
    const waitResponse = await waitForActiveCacheWrite(ctx);
    if (waitResponse) {
      debug('activeCacheWrites has this, waiting response', request.url)
      // 如果当前是强制刷新模式，合并后的响应也应标注为刷新状态
      if (options.refresh) {
        const headers = new Headers(waitResponse.headers);
        headers.set('x-proxy-cache', 'MISS');
        return createResponse(waitResponse.body, {
          status: waitResponse.status,
          statusText: waitResponse.statusText,
          headers,
          url: waitResponse.url
        });
      }
      return waitResponse;
    }
  }

  // 8. 发起请求并缓存
  return executeFetchAndCache(ctx, cachedEntry);
}
