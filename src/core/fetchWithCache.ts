import CachePolicy from 'http-cache-semantics';
import type { SmartCache } from './SmartCache';
import { generateCacheKey } from './generateCacheKey';
import { SiteCacheConfig, CacheMetadata } from '../types';

/**
 * fetchWithCache 选项
 */
export interface FetchWithCacheOptions {
  /** 混合缓存实例 */
  cache: SmartCache;
  /** 站点级缓存配置 */
  config: SiteCacheConfig;
  /** 
   * 是否启用后台异步更新 (SWR)。
   * 如果为 true，且命中过期缓存，则立即返回旧数据并在后台触发更新。
   * 如果为 false，则阻塞等待最新数据。
   */
  backgroundUpdate?: boolean;
  /** 后台更新 Promise 触发时的回调（用于在 Serverless 环境中追踪生命周期） */
  onBackgroundUpdate?: (promise: Promise<Response>) => void;
  /** 自定义缓存键生成函数 */
  generateKey?: typeof generateCacheKey;
}

// 请求合并追踪器：确保同一时间只有一个真实的 fetch 请求在运行
const inFlightRequests = new Map<string, Promise<Response>>();

/**
 * 核心协调函数 (Fetcher Orchestrator)
 * 
 * 这是一个框架无关的函数，实现了完整的缓存生命周期：
 * 1. **Cache Look-up**: 查找 SmartCache (L1/L2)。
 * 2. **Policy Evaluation**: 使用 http-cache-semantics 判断缓存新鲜度。
 * 3. **Request Collapsing**: 并发请求合并，防止缓存击穿。
 * 4. **SWR (Stale-While-Revalidate)**: 过期缓存先用，后台静默更新。
 * 5. **Fallback (Stale-If-Error)**: 网络异常时自动回退到旧缓存。
 * 
 * @param request 标准 Web Request 对象
 * @param fetcher 真实的获取数据函数 (例如 fetchBypass, axios.request 等)
 * @param options 配置选项
 * @returns 标准 Web Response 对象
 */
export async function fetchWithCache(
  request: Request,
  fetcher: (req: Request) => Promise<Response>,
  options: FetchWithCacheOptions
): Promise<Response> {
  const { cache, config, backgroundUpdate = true, onBackgroundUpdate } = options;
  const genKey = options.generateKey || generateCacheKey;
  const key = genKey(request, config);

  // 1. 尝试获取缓存条目
  const cached = await cache.get(key);
  let policy: CachePolicy | undefined;

  if (cached) {
    policy = CachePolicy.fromObject(cached.policy);
    
    // 命中新鲜缓存 (HIT)
    if (policy.satisfiesWithoutRevalidation(request)) {
      return new Response(cached.body, {
        status: cached.status,
        headers: { ...cached.headers, 'x-proxy-cache': 'HIT' }
      });
    }
  }

  // 2. 检查请求合并
  let responsePromise = inFlightRequests.get(key);

  if (!responsePromise) {
    // 我是第一个发起真实请求的人 (The Orchestrator)
    responsePromise = (async () => {
      try {
        const response = await fetcher(request.clone());
        
        const newPolicy = new CachePolicy(
          { url: request.url, method: request.method, headers: Object.fromEntries(request.headers) },
          { status: response.status, headers: Object.fromEntries(response.headers) }
        );

        // 如果响应是可缓存的，执行回写
        if (newPolicy.storable()) {
          const bodyBuffer = Buffer.from(await response.clone().arrayBuffer());
          const metadata: Omit<CacheMetadata, 'size'> = {
            status: response.status,
            headers: Object.fromEntries(response.headers),
            policy: newPolicy.toObject(),
            url: request.url,
            method: request.method,
            timestamp: Date.now(),
          };
          await cache.set(key, bodyBuffer, metadata);
        }

        return response;
      } catch (error) {
        // 错误降级 (Stale-If-Error)
        if (cached && config.staleIfError) {
          return new Response(cached.body, {
            status: cached.status,
            headers: { ...cached.headers, 'x-proxy-cache': 'STALE_IF_ERROR' }
          });
        }
        throw error;
      } finally {
        inFlightRequests.delete(key);
      }
    })();

    inFlightRequests.set(key, responsePromise);
  }

  // 3. 处理 SWR 逻辑
  if (cached && backgroundUpdate) {
    // 触发后台更新，但不等待它
    onBackgroundUpdate?.(responsePromise);

    // 立即返回 Stale 数据
    return new Response(cached.body, {
      status: cached.status,
      headers: { ...cached.headers, 'x-proxy-cache': 'STALE' }
    });
  }

  // 4. 等待新数据 (MISS 或非 SWR)
  const freshResponse = await responsePromise;
  return freshResponse.clone();
}
