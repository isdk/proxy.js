import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import CachePolicy from 'http-cache-semantics';
import type { SmartCache } from './SmartCache';
import { generateCacheKey } from './generateCacheKey';
import { SiteCacheConfig, CacheMetadata, CacheEntry, CacheRule } from '../types';
import { isMatch } from '../utils';

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
   * 传入一个外部维护的 Map，用于在跨请求、跨实例时防止针对同一文件的并发重复下载。
   * Map 的 Key 是缓存 Key，Value 是一个代表写入完成的 Promise。
   */
  activeCacheWrites?: Map<string, Promise<void>>;
}

/** 内部流水线上下文，合并了入参和计算出的关键状态 */
export interface FetchWithCacheContext extends FetchWithCacheOptions {
  request: Request;
  fetcher: (req: Request) => Promise<Response>;
  cacheKey: string;
  activeCacheWrites: Map<string, Promise<void>>;
}

/**
 * 核心辅助：将 Buffer 或 Node Stream 转换为 Web Response Body
 */
function createResponseBody(body: any): BodyInit {
  if (body instanceof Buffer) {
    return new Uint8Array(body);
  }
  if (body && typeof body.pipe === 'function') {
    // Node.js Stream 转 Web ReadableStream (Node 16.5+)
    return Readable.toWeb(body) as any;
  }
  return body;
}

/**
 * 构建响应对象
 */
function buildResponseFromCache(entry: CacheEntry, cacheStatus: string): Response {
  // Web 标准规定 204、304 甚至 1xx 响应是不允许携带 Body 的
  const body = (entry.status === 204 || entry.status === 304 || entry.status < 200)
    ? null
    : createResponseBody(entry.body);

  return new Response(body, {
    status: entry.status,
    headers: { ...entry.headers, 'x-proxy-cache': cacheStatus }
  });
}

/**
 * 构建上下文对象 (异步)
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
 * 判断当前请求是否满足可缓存的基础条件
 *
 * 该函数执行两阶段过滤：
 * 1. **方法过滤**: 检查请求方法是否在 `allowedMethods` 配置列表中（默认为 GET, HEAD）。
 * 2. **规则过滤**: 如果配置了 `cacheRules`，请求必须匹配其中至少一条规则。
 *    - 支持路径匹配 (`path`)：支持正则、Glob (含否定 `!`) 及前缀匹配。
 *    - 支持方法精确匹配 (`method`)。
 *    - 支持复杂的查询参数匹配 (`query`)，键值对均支持正则和 Glob。
 *    - 支持 Body 类型判定 (`bodyType`) 及内容匹配 (`body`)。
 *
 * @param request - 原始 Web 标准 Request 对象
 * @param config - 站点级缓存配置
 * @returns 如果请求允许进入缓存流程则返回 true，否则返回 false 直接穿透至源站
 */
async function isCacheable(request: Request, config: SiteCacheConfig): Promise<boolean> {
  const method = request.method.toUpperCase();
  const allowedMethods = config.methods || ['GET', 'HEAD'];

  // 1. 检查方法是否在允许列表中
  if (!allowedMethods.includes(method)) {
    return false;
  }

  // 2. 如果配置了 cacheRules，则必须至少匹配其中一条
  if (config.cacheRules && config.cacheRules.length > 0) {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    let bodyText: string | null = null;
    let bodyChecked = false;

    for (const rule of config.cacheRules) {
      if (await matchRule(rule, method, url, searchParams, request)) {
        return true;
      }
    }
    return false;

    async function matchRule(
      rule: CacheRule,
      method: string,
      url: URL,
      searchParams: URLSearchParams,
      request: Request
    ): Promise<boolean> {
      // 匹配方法 (如果 rule 指定了方法)
      if (rule.method && rule.method.toUpperCase() !== method) {
        return false;
      }

      // 匹配路径
      if (rule.path && !isMatch(rule.path, url.pathname, true)) {
        return false;
      }

      // 匹配 Query 参数
      if (rule.query) {
        for (const [key, pattern] of Object.entries(rule.query)) {
          const hasParam = searchParams.has(key);
          const paramValue = searchParams.get(key) || '';

          if (typeof pattern === 'boolean') {
            if (pattern && !hasParam) return false;
            if (!pattern && hasParam) return false;
          } else {
            if (!isMatch(pattern, paramValue)) return false;
          }
        }
      }

      // 匹配 Body 类型 (如果指定)
      if (rule.bodyType || rule.body) {
        const contentType = request.headers.get('content-type') || '';
        const actualType = contentType.includes('application/json')
          ? 'json'
          : (contentType.includes('text/') || contentType.includes('application/xml') || contentType.includes('x-www-form-urlencoded'))
            ? 'text'
            : 'binary';

        if (rule.bodyType && rule.bodyType !== actualType) {
          return false;
        }

        // 匹配 Body 内容
        if (rule.body) {
          if (actualType === 'binary') return false; // 二进制 Body 不支持内容正则匹配
          
          if (!bodyChecked) {
            try {
              const limit = config.maxBodyMatchLength || 1024;
              // 注意：由于 Request Body 只能读取一次，这里必须 clone
              // 且为了性能，我们只读取前 limit 个字符
              const fullText = await request.clone().text();
              bodyText = fullText.slice(0, limit);
            } catch (e) {
              bodyText = '';
            }
            bodyChecked = true;
          }

          if (!bodyText || !isMatch(rule.body, bodyText)) {
            return false;
          }
        }
      }

      return true;
    }
  }

  return true;
}

/**
 * 评估缓存策略状态
 */
function evaluateCachePolicy(ctx: FetchWithCacheContext, entry: CacheEntry): 'HIT' | 'STALE' | 'MISS' {
  const policy = CachePolicy.fromObject(entry.policy);
  const reqForPolicy = {
    url: entry.url, // 使用缓存条目中的原始 URL，确保 http-cache-semantics 判定一致
    method: ctx.request.method,
    headers: Object.fromEntries(ctx.request.headers)
  };

  if (policy.satisfiesWithoutRevalidation(reqForPolicy)) {
    return 'HIT';
  }
  return 'STALE';
}

/**
 * 触发后台 SWR 更新
 */
function triggerBackgroundUpdate(ctx: FetchWithCacheContext, fallbackEntry: CacheEntry): void {
  const promise = executeFetchAndCache(ctx, fallbackEntry).catch(error => {
    console.error(`[SWR Error] Background update failed for ${ctx.cacheKey}:`, error);
    return buildResponseFromCache(fallbackEntry, 'STALE_IF_ERROR');
  });
  ctx.onBackgroundUpdate?.(promise);
}

/**
 * 排队等待正在进行的缓存写入，并回读缓存
 */
async function waitForActiveCacheWrite(ctx: FetchWithCacheContext): Promise<Response | null> {
  const writePromise = ctx.activeCacheWrites.get(ctx.cacheKey);
  if (!writePromise) return null;

  try {
    await writePromise;
    // 写入完成后，尝试从缓存中获取完整数据
    const cachedEntry = await ctx.cache.get(ctx.cacheKey);
    if (cachedEntry) {
      return buildResponseFromCache(cachedEntry, 'HIT'); // 当作 HIT 处理
    }
  } catch (error) {
    // 并发写入任务失败，降级返回 null，让当前流程继续去尝试 fetch
    console.warn(`[Cache Warning] Awaited active cache write failed for ${ctx.cacheKey}`);
  }
  return null;
}

/**
 * 真正发起请求、拆流 (Tee) 并启动异步缓存写入
 */
async function executeFetchAndCache(ctx: FetchWithCacheContext, fallbackEntry?: CacheEntry | null): Promise<Response> {
  // 1. 创建并发控制的 Promise，并在真正 Fetch 前就注册，防止并发击穿
  let resolveWrite!: () => void;
  let rejectWrite!: (err: any) => void;
  
  // 【警告】请勿使用 writePromise.finally() 来清理 Map！
  // 在 ES6 Promise 规范中，.finally() 会返回一个全新的 Promise 实例，并透传父级的 Reject 状态。
  // 如果在此处使用 .finally() 进行清理，一旦 Fetch 失败，它返回的新 Promise 会变成一个无人捕获的孤儿，
  // 从而在 Node.js 中触发难以追踪的 UnhandledPromiseRejection 错误。
  // 因此，我们必须在原始的 resolve 和 reject 回调中直接执行清理。
  const writePromise = new Promise<void>((resolve, reject) => {
    resolveWrite = () => {
      ctx.activeCacheWrites.delete(ctx.cacheKey);
      resolve();
    };
    rejectWrite = (err: any) => {
      ctx.activeCacheWrites.delete(ctx.cacheKey);
      reject(err);
    };
  });
  
  // 只有一条纯净的 Promise 链，在这里垫一个空的 catch。
  // 它的作用是：当后台异步更新（SWR）发起 Fetch 且遭遇网络错误时，由于没有别的并发请求在 await 它，
  // 这个垫底的 catch 能够阻止 Node.js 抛出全局的 Unhandled Rejection。
  // 注意：真正排队等待该请求的并发者，由于直接 await writePromise，依然能正常捕获到这个 Error。
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
      resolveWrite(); // 不需要写入缓存，提早结束等待
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

    // 异步执行：将 Web Stream 转为 Node Stream，并管道输入到 SmartCache
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
    rejectWrite(error); // 发起 Fetch 失败，通知其他等待者
    // 错误降级逻辑
    if (fallbackEntry && ctx.config.staleIfError) {
      return buildResponseFromCache(fallbackEntry, 'STALE_IF_ERROR');
    }
    throw error;
  }

}

/**
 * 核心协调函数 (Fetcher Orchestrator)
 *
 * 实现了基于流的混合缓存代理核心逻辑，主要机制包括：
 * - **多方法支持与过滤**：支持通过 `allowedMethods` 配置可缓存的方法（如 POST, PUT），并通过 `cacheRules` 进行精细化的路径与参数匹配拦截。
 * - **异步 Request Body 处理**：当缓存 POST/PUT 请求时，会自动读取 Body 并计算唯一指纹（支持 JSON 字段过滤）。
 * - **大文件流式处理**：底层完全通过 Streams 实现，代理大文件时自动写入磁盘且防 OOM。
 * - **SWR (Stale-While-Revalidate)**：后台静默更新机制。
 * - **并发防击穿 (Request Coalescing)**：利用 `activeCacheWrites` 将并发请求合并。
 * - **强制离线容灾**：支持 `staleIfError` 和 `forceCache`（无视 Cache-Control 强制入库）。
 *
 * 并且会在响应头中自动注入 `x-proxy-cache` 标明缓存命中状态 (`HIT`, `STALE`, `MISS`, `STALE_IF_ERROR`)。
 *
 * @param request - 原始 Web 标准 Request 对象
 * @param fetcher - 实际执行网络请求的函数
 * @param options - 缓存配置选项
 * @returns 带有缓存标识头和流式 Body 的 Response 对象
 */
export async function fetchWithCache(
  request: Request,
  fetcher: (req: Request) => Promise<Response>,
  options: FetchWithCacheOptions
): Promise<Response> {
  // 0. 判断当前请求是否允许缓存
  if (!(await isCacheable(request, options.config))) {
    return fetcher(request);
  }

  // 1. 初始化统一上下文
  const ctx = await buildFetchWithCacheContext(request, fetcher, options);

  // 2. 尝试读取现有缓存
  const cachedEntry = await ctx.cache.get(ctx.cacheKey);

  if (cachedEntry) {
    const policyStatus = evaluateCachePolicy(ctx, cachedEntry);

    if (policyStatus === 'HIT') {
      return buildResponseFromCache(cachedEntry, 'HIT');
    }

    if (policyStatus === 'STALE' && ctx.backgroundUpdate !== false) {
      triggerBackgroundUpdate(ctx, cachedEntry);
      return buildResponseFromCache(cachedEntry, 'STALE');
    }
  }

  // 3. 检查是否有其他人正在下载这个文件（防击穿）
  if (ctx.activeCacheWrites.has(ctx.cacheKey)) {
    // 策略一：排队等待写入完成
    const waitResponse = await waitForActiveCacheWrite(ctx);
    if (waitResponse) return waitResponse;
    // 如果等完发现写入失败或没找到缓存，则继续往下走，自己发请求
  }

  // 4. 真正发起请求、拆流 (Tee) 并启动异步缓存写入
  return executeFetchAndCache(ctx, cachedEntry);
}
