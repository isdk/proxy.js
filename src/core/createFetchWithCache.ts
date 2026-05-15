import { fetchWithCache, FetchWithCacheOptions } from './fetchWithCache';

/**
 * 单一职责高阶函数：专门用于封装和隔离 activeCacheWrites 并发追踪器。
 *
 * 每次调用此函数，都会创建一个完全独立的闭包 Map（或复用传入的 Map），
 * 并返回一个绑定了该 Map 的 `fetchWithCache` 变体函数。
 * 从而让使用者无需关心 `activeCacheWrites` 的维护，杜绝了误传或不传导致的并发击穿风险。
 *
 * @param activeCacheWrites - 可选参数，用于跨实例共享的并发写入追踪器。
 *                            如果未提供，将自动创建一个新的 Map。
 *                            传入同一个 Map 可以让多个 `createFetchWithCache` 实例共享
 *                            并发追踪状态，从而在整个应用范围内防止缓存击穿。
 * @returns 一个绑定了并发追踪器的 `fetchWithCache` 变体函数。
 */
export function createFetchWithCache(activeCacheWrites?: Map<string, Promise<void>>) {
  // 仅限于此闭包内共享的并发请求追踪器
  if (!activeCacheWrites) {
    activeCacheWrites = new Map();
  }

  return async function fetchWithCacheBound(
    request: Request,
    fetcher: (req: Request) => Promise<Response>,
    options: FetchWithCacheOptions
  ): Promise<Response> {
    // 自动将隐藏的 activeCacheWrites 注入到底层调用中
    return fetchWithCache(request, fetcher, { ...options, activeCacheWrites });
  };
}
