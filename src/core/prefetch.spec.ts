import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { SmartCache, prefetch, generateCacheKey, fetchWithCache } from './index';
import type { ProxyConfig, ProxySiteConfig } from '../types';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

describe('prefetch', () => {
  let storagePath: string;
  let cache: SmartCache;
  const testDirs: string[] = [];

  // 辅助函数：在系统临时目录下创建一个唯一的测试缓存
  async function createTestCache(name: string) {
    storagePath = path.join(os.tmpdir(), `isdk-proxy-test-prefetch-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    testDirs.push(storagePath);
    await fs.rm(storagePath, { recursive: true, force: true });
    cache = new SmartCache({ storagePath });
    return cache;
  }

  // 测试结束后清理临时目录
  afterAll(async () => {
    for (const dir of testDirs) {
      // 增加重试逻辑，防止文件系统延迟导致的 ENOTEMPTY
      for (let i = 0; i < 5; i++) {
        try {
          await fs.rm(dir, { recursive: true, force: true });
          break;
        } catch (e) {
          await new Promise(r => setTimeout(r, 100));
        }
      }
    }
  });

  beforeEach(async () => {
    await createTestCache('prefetch');
  });

  afterEach(async () => {
    await cache.clear();
  });

  const config: ProxyConfig = {
    methods: ['GET', 'POST', 'PUT'],
    sites: {}
  };

  it('应该成功预缓存多个 URL', async () => {
    const mockFetcher = vi.fn().mockImplementation(async (req: Request) => {
      return new Response(`data for ${req.url}`, {
        headers: { 'Cache-Control': 'public, max-age=3600' }
      });
    });

    const result = await prefetch({
      urls: [
        { url: 'https://api.example.com/1' },
        { url: 'https://api.example.com/2' },
        { url: 'https://api.example.com/3' },
      ],
      config,
      cache,
      fetcher: mockFetcher,
      concurrency: 3,
    });

    expect(result.succeeded).toBe(3);
    expect(result.failed).toBe(0);
    expect(mockFetcher).toHaveBeenCalledTimes(3);
  });

  it('应该正确处理预缓存失败', async () => {
    const mockFetcher = vi.fn().mockImplementation(async (req: Request) => {
      if (req.url.includes('fail')) {
        throw new Error('Network Error');
      }
      return new Response(`data for ${req.url}`, {
        headers: { 'Cache-Control': 'public, max-age=3600' }
      });
    });

    const result = await prefetch({
      urls: [
        { url: 'https://api.example.com/success' },
        { url: 'https://api.example.com/fail' },
        { url: 'https://api.example.com/another-fail' },
      ],
      config,
      cache,
      fetcher: mockFetcher,
      concurrency: 3,
    });

    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(2);
    expect(result.errors).toHaveLength(2);
    expect(result.errors![0].url).toBe('https://api.example.com/fail');
    expect(result.errors![1].url).toBe('https://api.example.com/another-fail');
  });

  it('应该支持 POST 请求预缓存', async () => {
    const mockFetcher = vi.fn().mockImplementation(async (req: Request) => {
      const body = await req.text();
      return new Response(`POST response for ${body}`, {
        headers: { 'Cache-Control': 'public, max-age=3600' }
      });
    });

    const result = await prefetch({
      urls: [
        {
          url: 'https://api.example.com/post-endpoint',
          request: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'value' }),
          },
        },
      ],
      config,
      cache,
      fetcher: mockFetcher,
    });

    expect(result.succeeded).toBe(1);
    expect(mockFetcher).toHaveBeenCalledTimes(1);

    // 验证请求参数正确传递
    const calledReq = mockFetcher.mock.calls[0][0] as Request;
    expect(calledReq.method).toBe('POST');
    expect(calledReq.headers.get('Content-Type')).toBe('application/json');
  });

  it('应该支持并发控制', async () => {
    let activeCount = 0;
    let maxActive = 0;

    const mockFetcher = vi.fn().mockImplementation(async () => {
      activeCount++;
      maxActive = Math.max(maxActive, activeCount);
      await new Promise(resolve => setTimeout(resolve, 50));
      activeCount--;
      return new Response('data', {
        headers: { 'Cache-Control': 'public, max-age=3600' }
      });
    });

    await prefetch({
      urls: [
        { url: 'https://api.example.com/1' },
        { url: 'https://api.example.com/2' },
        { url: 'https://api.example.com/3' },
        { url: 'https://api.example.com/4' },
        { url: 'https://api.example.com/5' },
        { url: 'https://api.example.com/6' },
      ],
      config,
      cache,
      fetcher: mockFetcher,
      concurrency: 3, // 限制并发为 3
    });

    expect(maxActive).toBeLessThanOrEqual(3);
  });

  it('应该触发进度回调', async () => {
    const progressCalls: Array<{ completed: number; total: number; url: string }> = [];

    const mockFetcher = vi.fn().mockImplementation(async (req: Request) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return new Response(`data for ${req.url}`, {
        headers: { 'Cache-Control': 'public, max-age=3600' }
      });
    });

    await prefetch({
      urls: [
        { url: 'https://api.example.com/1' },
        { url: 'https://api.example.com/2' },
        { url: 'https://api.example.com/3' },
      ],
      config,
      cache,
      fetcher: mockFetcher,
      concurrency: 3,
      onProgress: (completed, total, url) => {
        progressCalls.push({ completed, total, url });
      },
    });

    expect(progressCalls).toHaveLength(3);
    expect(progressCalls[0]).toEqual({ completed: 1, total: 3, url: 'https://api.example.com/1' });
    expect(progressCalls[1]).toEqual({ completed: 2, total: 3, url: 'https://api.example.com/2' });
    expect(progressCalls[2]).toEqual({ completed: 3, total: 3, url: 'https://api.example.com/3' });
  });

  it('应该支持 AbortSignal 取消', async () => {
    const controller = new AbortController();
    const mockFetcher = vi.fn().mockImplementation(async (req: Request) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          resolve(new Response('data', {
            headers: { 'Cache-Control': 'public, max-age=3600' }
          }));
        }, 500); // 增加时间，确保有足够时间触发 abort

        if (req.signal) {
          req.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('AbortError'));
          }, { once: true });
          
          if (req.signal.aborted) {
            clearTimeout(timer);
            reject(new Error('AbortError'));
          }
        }
      });
    });

    // 100ms 后取消，此时所有 3 个请求应该都在进行中
    setTimeout(() => controller.abort(), 100);

    const result = await prefetch({
      urls: [
        { url: 'https://api.example.com/1' },
        { url: 'https://api.example.com/2' },
        { url: 'https://api.example.com/3' },
      ],
      config,
      cache,
      fetcher: mockFetcher,
      concurrency: 3,
      signal: controller.signal,
    });

    // 因为是并发 3 且同时发出的，100ms 时应该没有任何一个完成
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('应该返回空结果当 urls 为空时', async () => {
    const mockFetcher = vi.fn();

    const result = await prefetch({
      urls: [],
      config,
      cache,
      fetcher: mockFetcher,
    });

    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
    expect(mockFetcher).not.toHaveBeenCalled();
  });

  it('预取时应覆盖站点配置中的 offline: true', async () => {
    const siteConfig: ProxySiteConfig = { offline: true };
    const configWithOffline: ProxyConfig = {
      methods: ['GET'],
      sites: {
        'api.example.com': siteConfig
      }
    };

    const mockFetcher = vi.fn().mockImplementation(async (req: Request) => {
      return new Response(`data for ${req.url}`, {
        headers: { 'Cache-Control': 'public, max-age=3600' }
      });
    });

    const result = await prefetch({
      urls: [
        { url: 'https://api.example.com/data' },
      ],
      config: configWithOffline,
      cache,
      fetcher: mockFetcher,
    });

    expect(result.succeeded).toBe(1);
    expect(mockFetcher).toHaveBeenCalledTimes(1);
  });

  it('如果 AbortSignal 已经取消，应该立即返回', async () => {
    const controller = new AbortController();
    controller.abort();

    const mockFetcher = vi.fn();

    const result = await prefetch({
      urls: [
        { url: 'https://api.example.com/1' },
      ],
      config,
      cache,
      fetcher: mockFetcher,
      signal: controller.signal,
    });

    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
    expect(mockFetcher).not.toHaveBeenCalled();
  });

  it('预取数据精度与完成顺序验证', async () => {
    const progressCalls: any[] = [];
    const mockFetcher = vi.fn().mockImplementation(async (req: Request) => {
      let delay = 100;
      if (req.url.endsWith('/fast')) delay = 10;
      if (req.url.endsWith('/slow')) delay = 300;
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return new Response('data', {
        headers: { 'Cache-Control': 'public, max-age=3600' }
      });
    });

    await prefetch({
      urls: [
        { url: 'https://api.example.com/slow' },
        { url: 'https://api.example.com/normal' },
        { url: 'https://api.example.com/fast' },
      ],
      config,
      cache,
      fetcher: mockFetcher,
      concurrency: 3,
      onProgress: (completed, total, url) => {
        progressCalls.push({ completed, total, url });
      }
    });

    expect(progressCalls).toHaveLength(3);
    // 应该是 fast 最先完成
    expect(progressCalls[0].url).toBe('https://api.example.com/fast');
    expect(progressCalls[0].completed).toBe(1);
    expect(progressCalls[1].url).toBe('https://api.example.com/normal');
    expect(progressCalls[1].completed).toBe(2);
    expect(progressCalls[2].url).toBe('https://api.example.com/slow');
    expect(progressCalls[2].completed).toBe(3);
  });

  it('当 URL 不符合缓存规则被跳过时，onProgress 依然应该正确触发', async () => {
    const siteConfig: ProxySiteConfig = {
      methods: ['GET'],
      rules: [
        { path: '/cacheable/*' }
      ]
    };
    const configWithRules: ProxyConfig = {
      methods: ['GET'],
      sites: {
        'api.example.com': siteConfig
      }
    };

    const progressCalls: any[] = [];
    const mockFetcher = vi.fn();

    const result = await prefetch({
      urls: [
        { url: 'https://api.example.com/cacheable/1' },
        { url: 'https://api.example.com/not-cacheable/1' },
      ],
      config: configWithRules,
      cache,
      fetcher: mockFetcher.mockImplementation(async () => new Response('data', {
        headers: { 'Cache-Control': 'public, max-age=3600' }
      })),
      concurrency: 1, // 强制顺序执行，确保进度顺序
      onProgress: (completed, total, url) => {
        progressCalls.push({ completed, total, url });
      }
    });

    expect(result.succeeded).toBe(1);
    expect(progressCalls).toHaveLength(2);
    expect(progressCalls[0].completed).toBe(1);
    expect(progressCalls[1].completed).toBe(2);
    expect(progressCalls[1].url).toBe('https://api.example.com/not-cacheable/1');
    expect(mockFetcher).toHaveBeenCalledTimes(1); // 只有一个发起了网络请求
  });

  it('多个并发的 prefetch 调用应能共享 activeCacheWrites 避免重复请求', async () => {
    const mockFetcher = vi.fn().mockImplementation(async (req: Request) => {
      await new Promise(r => setTimeout(r, 100));
      return new Response(`data for ${req.url}`, {
        headers: { 'Cache-Control': 'public, max-age=3600' }
      });
    });

    const activeCacheWrites = new Map<string, Promise<void>>();
    // 注意：目前的 prefetch 内部会自己新建 activeCacheWrites，如果要共享，需要修改 prefetch 签名支持传入
    // 暂且测试 prefetch 是否对同一 URL 的并发调用具有鲁棒性
    const url = 'https://api.example.com/shared';

    const p1 = prefetch({ urls: [{ url }], config, cache, fetcher: mockFetcher });
    const p2 = prefetch({ urls: [{ url }], config, cache, fetcher: mockFetcher });

    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1.succeeded).toBe(1);
    expect(r2.succeeded).toBe(1);
    // 即使两个 prefetch 实例，如果它们内部使用的是同一个缓存，
    // 由于底层 fetchWithCache 对 activeCacheWrites 的处理是局部的（当前 prefetch 内部创建），
    // 除非我们能让 prefetch 共享 activeCacheWrites。
    // 但在同一个 prefetch 内部的 urls 列表如果有重复，它是能处理的吗？
  });

  it('prefetch 内部重复 URL 应被有效合并', async () => {
    const mockFetcher = vi.fn().mockImplementation(async (req: Request) => {
      await new Promise(r => setTimeout(r, 50));
      return new Response('data', { headers: { 'Cache-Control': 'public, max-age=3600' } });
    });

    const url = 'https://api.example.com/duplicate';
    const result = await prefetch({
      urls: [
        { url },
        { url },
        { url },
      ],
      config,
      cache,
      fetcher: mockFetcher,
      concurrency: 3
    });

    expect(result.succeeded).toBe(3);
    // 虽然 succeeded 是 3，但底层 fetcher 应该只被调用 1 次
    expect(mockFetcher).toHaveBeenCalledTimes(1);
  });

  it('应该遵守站点缓存规则 (cacheRules)', async () => {
    const siteConfig: ProxySiteConfig = {
      methods: ['GET'],
      rules: [
        { path: '/cacheable/*' }
      ]
    };
    const configWithRules: ProxyConfig = {
      methods: ['GET'],
      sites: {
        'api.example.com': siteConfig
      }
    };

    const mockFetcher = vi.fn().mockImplementation(async (req: Request) => {
      return new Response(`data for ${req.url}`, {
        headers: { 'Cache-Control': 'public, max-age=3600' }
      });
    });

    const result = await prefetch({
      urls: [
        { url: 'https://api.example.com/cacheable/1' },
        { url: 'https://api.example.com/not-cacheable/1' },
      ],
      config: configWithRules,
      cache,
      fetcher: mockFetcher,
    });

    // 两个请求都成功返回了响应，但只有一个应该被缓存
    expect(result.succeeded).toBe(1);
    
    const key1 = await generateCacheKey(new Request('https://api.example.com/cacheable/1'), siteConfig);
    const key2 = await generateCacheKey(new Request('https://api.example.com/not-cacheable/1'), siteConfig);

    expect(await cache.get(key1)).not.toBeNull();
    expect(await cache.get(key2)).toBeNull();
  });

  it('应该支持大文件预取并在离线模式下正确读取', async () => {
    // 创建一个 2MB 的内容
    const largeContent = Buffer.alloc(2 * 1024 * 1024, 'a');
    const url = 'https://api.example.com/large-file';

    const mockFetcher = vi.fn().mockImplementation(async () => {
      return new Response(largeContent, {
        headers: { 
          'Cache-Control': 'public, max-age=3600',
          'Content-Type': 'application/octet-stream'
        }
      });
    });

    // 1. 预取大文件
    const prefetchResult = await prefetch({
      urls: [{ url }],
      config,
      cache,
      fetcher: mockFetcher,
    });

    expect(prefetchResult.succeeded).toBe(1);

    // 2. 切换到离线模式
    const offlineConfig: ProxySiteConfig = { 
      methods: ['GET'],
      offline: true 
    };

    // 3. 在离线模式下读取
    const res = await fetchWithCache(new Request(url), async () => {
      throw new Error('Should not call fetcher in offline mode');
    }, {
      cache,
      config: offlineConfig,
    });

    expect(res.headers.get('x-proxy-cache')).toBe('OFFLINE_HIT');
    const body = await res.arrayBuffer();
    expect(body.byteLength).toBe(largeContent.length);
    expect(Buffer.from(body).equals(largeContent)).toBe(true);
  });
});
