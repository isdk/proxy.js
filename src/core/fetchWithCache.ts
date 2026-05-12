import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import CachePolicy from 'http-cache-semantics';
import type { SmartCache } from './SmartCache';
import { generateCacheKey } from './generateCacheKey';
import { ProxySiteConfig, ProxyCacheMetadata, ProxyCacheEntry, ProxyCacheRule } from '../types';
import { OfflineCacheMissError } from '../errors';
import { getEffectiveConfigFromRequest, isCacheable } from './isCacheable';

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
 * 构建响应对象
 */
function buildResponseFromCache(entry: ProxyCacheEntry, cacheStatus: string): Response {
  const body = (entry.status === 204 || entry.status === 304 || entry.status < 200)
    ? null
    : createResponseBody(entry.body);

  return new Response(body, {
    status: entry.status,
    headers: { ...entry.headers, 'x-proxy-cache': cacheStatus }
  });
}

/**
 * 构建上下文对象
 */
async function buildFetchWithCacheContext(
  request: Request,
  fetcher: (req: Request) => Promise<Response>,
  options: FetchWithCacheOptions
): Promise<FetchWithCacheContext> {
  const genKey = options.generateKey || generateCacheKey;
  const cacheKey = await genKey(request, options.config);
  const effectiveConfig = await getEffectiveConfigFromRequest(request, options.config);

  return {
    ...options,
    request,
    fetcher,
    cacheKey,
    effectiveConfig,
    activeCacheWrites: options.activeCacheWrites || new Map<string, Promise<void>>()
  };
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

    const newPolicy = new CachePolicy(
      { url: ctx.request.url, method: ctx.request.method, headers: Object.fromEntries(ctx.request.headers) },
      { status: response.status, headers: Object.fromEntries(response.headers) }
    );

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('x-proxy-cache', 'MISS');

    if (!newPolicy.storable() && !ctx.effectiveConfig.forceCache) {
      resolveWrite();
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    }

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
      return new Response(null, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    }

    const [streamForClient, streamForCache] = response.body.tee();

    pipeline(
      Readable.fromWeb(streamForCache as any),
      ctx.cache.setStream(ctx.cacheKey, metadata)
    )
      .then(resolveWrite)
      .catch(rejectWrite);

    return new Response(streamForClient, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
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
  // 1. 初始化上下文（生成 Key 并合并配置）
  const ctx = await buildFetchWithCacheContext(request, fetcher, options);
  const { effectiveConfig } = ctx;

  // 2. 尝试读取缓存
  const cachedEntry = await ctx.cache.get(ctx.cacheKey);

  // 3. 处理离线模式：使用最终合并后的 effectiveConfig
  if (effectiveConfig.offline) {
    if (cachedEntry) return buildResponseFromCache(cachedEntry, 'OFFLINE_HIT');
    throw new OfflineCacheMissError(request.url);
  }

  // 4. 判断当前请求是否允许进入缓存流程
  // 注意：isCacheable 内部也会尝试匹配 rules，这里已经匹配过了，
  // 但为了逻辑解耦，我们依然调用它（它内部很快，因为 bodyState 可能已被缓存，或者这里我们可以优化）。
  if (!(await isCacheable(request, options.config))) {
    return fetcher(request);
  }

  // 5. 判定命中状态
  if (cachedEntry) {
    const status = evaluateCachePolicy(ctx, cachedEntry);

    if (status === 'HIT') {
      return buildResponseFromCache(cachedEntry, 'HIT');
    }

    if (status === 'STALE' && options.backgroundUpdate !== false) {
      triggerBackgroundUpdate(ctx, cachedEntry);
      return buildResponseFromCache(cachedEntry, 'STALE');
    }
  }

  // 6. 防击穿处理
  if (ctx.activeCacheWrites.has(ctx.cacheKey)) {
    const waitResponse = await waitForActiveCacheWrite(ctx);
    if (waitResponse) return waitResponse;
  }

  // 7. 发起请求并缓存
  return executeFetchAndCache(ctx, cachedEntry);
}
