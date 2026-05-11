import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import CachePolicy from 'http-cache-semantics';
import type { SmartCache } from './SmartCache';
import { generateCacheKey } from './generateCacheKey';
import { SiteCacheConfig, CacheMetadata, CacheEntry } from '../types';
import { OfflineCacheMissError } from '../errors';
import { isCacheable } from './isCacheable';

/**
 * fetchWithCache 选项
 */
export interface FetchWithCacheOptions {
  /** 混合缓存实例 */
  cache: SmartCache;
  /** 站点级缓存配置 */
  config: SiteCacheConfig;
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
}

/**
 * 核心辅助：将 Buffer、Node Stream 或 Uint8Array 转换为标准的 Web Response Body
 * 特别修复了对 Pipeline 等非标准 Readable 流的兼容性，支持 Readable.toWeb。
 */
function createResponseBody(body: any): BodyInit {
  if (body instanceof Buffer) {
    return new Uint8Array(body);
  }
  if (body && typeof body.pipe === 'function') {
    try {
      // 关键修复：兼容 Pipeline 等非标准 Readable 流
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
function buildResponseFromCache(entry: CacheEntry, cacheStatus: string): Response {
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
  return {
    ...options,
    request,
    fetcher,
    cacheKey,
    activeCacheWrites: options.activeCacheWrites || new Map<string, Promise<void>>()
  };
}

/**
 * 评估缓存策略状态
 */
function evaluateCachePolicy(ctx: FetchWithCacheContext, entry: CacheEntry): 'HIT' | 'STALE' {
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
function triggerBackgroundUpdate(ctx: FetchWithCacheContext, fallbackEntry: CacheEntry): void {
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
async function executeFetchAndCache(ctx: FetchWithCacheContext, fallbackEntry?: CacheEntry | null): Promise<Response> {
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

    if (!newPolicy.storable() && !ctx.config.forceCache) {
      resolveWrite();
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    }

    const metadata: Omit<CacheMetadata, 'size'> = {
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
    if (fallbackEntry && ctx.config.staleIfError) {
      return buildResponseFromCache(fallbackEntry, 'STALE_IF_ERROR');
    }
    throw error;
  }
}

/**
 * 核心协调函数：协调请求、缓存命中、并发控制和 SWR
 *
 * 流程如下：
 * 1. 初始化上下文并生成缓存键。
 * 2. 检查离线模式：若开启则强读取，未命中直接抛错。
 * 3. 检查请求是否符合缓存规则 (isCacheable)。
 * 4. 尝试读取缓存并判定状态 (HIT / STALE)。
 * 5. 处理 SWR (后台更新)。
 * 6. 处理请求合并 (Request Coalescing)，防止缓存击穿。
 * 7. 若缓存缺失，发起网络请求并流式写入。
 *
 * @param request - 标准 Web Request 对象
 * @param fetcher - 底层发起真实请求的函数
 * @param options - 缓存协调配置项
 * @returns 标准 Web Response 对象 (带 x-proxy-cache 标头)
 */
export async function fetchWithCache(
  request: Request,
  fetcher: (req: Request) => Promise<Response>,
  options: FetchWithCacheOptions
): Promise<Response> {
  const { config } = options;

  // 1. 初始化上下文（生成 Key）
  const ctx = await buildFetchWithCacheContext(request, fetcher, options);

  // 2. 尝试读取缓存
  const cachedEntry = await ctx.cache.get(ctx.cacheKey);

  // 3. 处理离线模式：离线模式下，如果有缓存直接给，没有就报错
  if (config.offline) {
    if (cachedEntry) return buildResponseFromCache(cachedEntry, 'OFFLINE_HIT');
    throw new OfflineCacheMissError(request.url);
  }

  // 4. 判断当前请求是否允许进入缓存流程
  if (!(await isCacheable(request, config))) {
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
