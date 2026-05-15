import { createFetchWithCache } from './createFetchWithCache';
import { FetchWithCacheOptions } from './fetchWithCache';

/**
 * 缓存请求工厂函数 (针对终端用户的顶层高阶 API)
 *
 * 为用户提供一个只需配置一次（如 Cache 实例、默认 Config），
 * 即可在整个应用生命周期中随处调用的 `cachedFetch` 方法。
 *
 * 底层调用了 `createFetchWithCache` 来保证单一职能隔离，内部自动维护并发追踪。
 *
 * @param defaultOptions - 默认缓存配置选项。
 *                       可以包含 `activeCacheWrites` 字段，用于跨多个 `createCachedFetch`
 *                       实例共享并发追踪状态，实现应用级别的缓存击穿防护。
 * @returns 一个预配置的 `cachedFetch` 函数，可直接用于发起带缓存的请求。
 */
export function createCachedFetch(defaultOptions: FetchWithCacheOptions) {
  // 调用单一职责的高阶函数，获取已绑定并发追踪器的 fetchWithCache 实例
  const fetchWithCacheBound = createFetchWithCache(defaultOptions.activeCacheWrites);

  return async function cachedFetch(
    request: Request,
    fetcher: (req: Request) => Promise<Response>,
    overrideOptions?: FetchWithCacheOptions
  ): Promise<Response> {
    return fetchWithCacheBound(request, fetcher, {
      ...defaultOptions,
      ...overrideOptions,
      activeCacheWrites: overrideOptions?.activeCacheWrites || defaultOptions.activeCacheWrites,
      refresh: overrideOptions?.refresh
    });
  };
}
