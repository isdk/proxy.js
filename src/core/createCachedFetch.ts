import { createFetchWithCache } from './createFetchWithCache';
import { FetchWithCacheOptions } from './fetchWithCache';

export type CreateCachedFetchOptions = Omit<FetchWithCacheOptions, 'activeCacheWrites'>;

/**
 * 缓存请求工厂函数 (针对终端用户的顶层高阶 API)
 *
 * 为用户提供一个只需配置一次（如 Cache 实例、默认 Config），
 * 即可在整个应用生命周期中随处调用的 `cachedFetch` 方法。
 *
 * 底层调用了 `createFetchWithCache` 来保证单一职能隔离，内部自动维护并发追踪。
 */
export function createCachedFetch(defaultOptions: CreateCachedFetchOptions) {
  // 调用单一职责的高阶函数，获取已绑定并发追踪器的 fetchWithCache 实例
  const fetchWithCacheBound = createFetchWithCache();

  return async function cachedFetch(
    request: Request,
    fetcher: (req: Request) => Promise<Response>,
    overrideOptions?: Partial<CreateCachedFetchOptions>
  ): Promise<Response> {
    return fetchWithCacheBound(request, fetcher, {
      ...defaultOptions,
      ...overrideOptions,
    });
  };
}
