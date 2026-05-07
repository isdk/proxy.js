import { fetchWithCache, FetchWithCacheOptions } from './fetchWithCache';

/**
 * 单一职责高阶函数：专门用于封装和隔离 activeCacheWrites 并发追踪器。
 * 
 * 每次调用此函数，都会创建一个完全独立的闭包 Map，
 * 并返回一个绑定了该 Map 的 `fetchWithCache` 变体函数。
 * 从而让使用者无需关心 `activeCacheWrites` 的维护，杜绝了误传或不传导致的并发击穿风险。
 */
export function createFetchWithCache() {
  // 仅限于此闭包内共享的并发请求追踪器
  const activeCacheWrites = new Map<string, Promise<void>>();

  return async function fetchWithCacheBound(
    request: Request,
    fetcher: (req: Request) => Promise<Response>,
    options: Omit<FetchWithCacheOptions, 'activeCacheWrites'>
  ): Promise<Response> {
    // 自动将隐藏的 activeCacheWrites 注入到底层调用中
    return fetchWithCache(request, fetcher, { ...options, activeCacheWrites });
  };
}
