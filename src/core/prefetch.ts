import type { ProxyConfig } from '../types';
import { getSiteConfig } from '../utils';
import { SmartCache } from './SmartCache';
import { createFetchWithCache } from './createFetchWithCache';
import { isCacheable } from './isCacheable';

/**
 * 预缓存请求选项
 */
export interface PrefetchRequest {
  /** 请求 URL */
  url: string;
  /** 可选的请求配置（method, headers, body 等） */
  request?: RequestInit;
}

export interface PrefetchOptions {
  /** 要预缓存的 URL 列表及其请求选项 */
  urls: PrefetchRequest[];
  /** 完整的代理配置 */
  config: ProxyConfig;
  /** SmartCache 实例 */
  cache: SmartCache;
  /** 自定义 fetcher，默认使用 globalThis.fetch */
  fetcher?: (req: Request) => Promise<Response>;
  /** 并发数，默认 3 */
  concurrency?: number;
  /** 进度回调 (completed, total, url) */
  onProgress?: (completed: number, total: number, url: string) => void;
  /** 取消信号 */
  signal?: AbortSignal;
}

export interface PrefetchResult {
  /** 成功数量 */
  succeeded: number;
  /** 失败数量 */
  failed: number;
  /** 失败详情 */
  errors?: Array<{ url: string; error: Error }>;
}

/**
 * 预缓存函数
 *
 * 提前将指定的 URL 列表内容存入缓存，支持并发控制和进度回调。
 * 复用了 `createCachedFetch` 的完整逻辑，自动支持：
 * - GET/POST/PUT/PATCH/DELETE 等所有方法
 * - POST body 过滤和缓存键生成
 * - 站点级配置
 *
 * @param options - 预缓存选项
 * @returns 预缓存结果，包含成功/失败数量和错误详情
 */
export async function prefetch(options: PrefetchOptions): Promise<PrefetchResult> {
  const {
    urls,
    config,
    cache,
    fetcher = (req) => globalThis.fetch(req),
    concurrency = 3,
    onProgress,
    signal,
  } = options;

  const result: PrefetchResult = {
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  if (urls.length === 0) {
    return result;
  }

  if (signal?.aborted) {
    return result;
  }

  // 创建带并发追踪的 fetchWithCache
  const activeCacheWrites = new Map<string, Promise<void>>();
  const fetchWithCache = createFetchWithCache(activeCacheWrites);

  // 使用并发工作池模式进行处理
  const queue = [...urls];
  let completed = 0;

  const runWorker = async () => {
    while (queue.length > 0 && !signal?.aborted) {
      const item = queue.shift();
      if (!item) break;

      try {
        const siteConfig = getSiteConfig(item.url, config);
        const req = new Request(item.url, { ...item.request, signal });
        
        // 关键：在 prefetch 层面，如果不允许缓存，我们就直接跳过，不调用 fetchWithCache
        // 这样可以确保 prefetch 结果中 succeeded 只包含真正入库的。
        if (!(await isCacheable(req, siteConfig))) {
          // 不符合缓存规则的请求不计入成功预取，也不发起请求
          continue;
        }

        const res = await fetchWithCache(
          req,
          fetcher,
          {
            cache,
            // 预取时强制关闭 offline 模式，否则无法填充缓存
            config: { ...siteConfig, offline: false },
            // 强制关闭后台更新，避免预缓存时触发额外请求
            backgroundUpdate: false,
          }
        );

        // 检查响应头，确保真的经过了缓存逻辑（不是穿透）
        if (res.headers.has('x-proxy-cache')) {
          // 只有真正走缓存流程的才算成功预取
          await res.arrayBuffer();
          result.succeeded++;
        }
      } catch (error: any) {
        // 如果是由于取消导致的错误，则不再记录为失败并直接终止
        if (error.name === 'AbortError' || signal?.aborted) {
          break;
        }
        result.failed++;
        result.errors!.push({ url: item.url, error });
      } finally {
        completed++;
        onProgress?.(completed, urls.length, item.url);
      }
    }
  };

  // 启动指定数量的 worker
  const workers = Array.from(
    { length: Math.min(concurrency, urls.length) },
    () => runWorker()
  );

  await Promise.all(workers);

  // 关键：等待所有后台缓存写入任务完成，确保预取真正落盘
  if (activeCacheWrites.size > 0) {
    await Promise.allSettled(activeCacheWrites.values());
  }

  return result;
}
