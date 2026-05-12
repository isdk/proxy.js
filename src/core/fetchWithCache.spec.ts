import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { SmartCache, fetchWithCache } from './index';
import { ProxySiteConfig } from '../types';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

describe('fetchWithCache', () => {
  const config: ProxySiteConfig = {
    staleIfError: true,
  };

  const testDirs: string[] = [];

  // 辅助函数：在系统临时目录下创建一个唯一的测试缓存
  async function createTestCache(name: string, maxMemorySize?: number) {
    const storagePath = path.join(os.tmpdir(), `isdk-proxy-test-fetch-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    testDirs.push(storagePath);
    await fs.rm(storagePath, { recursive: true, force: true });
    const cache = new SmartCache({ storagePath, maxMemorySize });
    const activeCacheWrites = new Map<string, Promise<void>>();
    return { cache, storagePath, activeCacheWrites };
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

  it('应该能正常获取并缓存数据', async () => {
    const { cache, activeCacheWrites } = await createTestCache('basic');
    const request = new Request('https://api.example.com/data');
    const mockFetcher = vi.fn().mockImplementation(async () => new Response('hello', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    const res1 = await fetchWithCache(request, mockFetcher, { cache, config, activeCacheWrites });
    await res1.text(); // 消费流
    await Promise.all(activeCacheWrites.values()); // 确保磁盘写入完全结束

    const res2 = await fetchWithCache(request, mockFetcher, { cache, config, activeCacheWrites });
    expect(await res2.text()).toBe('hello');
    expect(res2.headers.get('x-proxy-cache')).toBe('HIT');
  });

  it('应该支持 SWR (Stale-While-Revalidate)', async () => {
    const { cache, activeCacheWrites } = await createTestCache('swr');
    const request = new Request('https://api.example.com/swr');

    const res0 = await fetchWithCache(request, async () => new Response('old', {
      headers: { 'Cache-Control': 'public, max-age=1' }
    }), { cache, config, activeCacheWrites });
    await res0.text();
    await Promise.all(activeCacheWrites.values());

    await new Promise(resolve => setTimeout(resolve, 1100));

    const mockFetcher2 = vi.fn().mockImplementation(async () => new Response('new', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    const res = await fetchWithCache(request, mockFetcher2, { cache, config, backgroundUpdate: true, activeCacheWrites });
    expect(await res.text()).toBe('old');
    expect(res.headers.get('x-proxy-cache')).toBe('STALE');

    await new Promise(resolve => setTimeout(resolve, 200));
    const res3 = await fetchWithCache(request, mockFetcher2, { cache, config, activeCacheWrites });
    expect(await res3.text()).toBe('new');
  });

  it('应该处理并发冲突：SWR 请求触发后台更新，后续阻塞请求应获得新数据', async () => {
    const { cache, activeCacheWrites } = await createTestCache('concurrency');
    const request = new Request('https://api.example.com/mixed-concurrency');

    const res0 = await fetchWithCache(request, async () => new Response('old', {
      headers: { 'Cache-Control': 'no-cache' }
    }), { cache, config, activeCacheWrites });
    await res0.text();
    await Promise.all(activeCacheWrites.values());

    let solve: any;
    const slowPromise = new Promise<Response>(r => { solve = r; });
    const mockFetcher = vi.fn().mockReturnValue(slowPromise);

    const resA = await fetchWithCache(request, mockFetcher, { cache, config, backgroundUpdate: true, activeCacheWrites });
    expect(await resA.text()).toBe('old');
    expect(resA.headers.get('x-proxy-cache')).toBe('STALE');

    const pB = fetchWithCache(request, mockFetcher, { cache, config, backgroundUpdate: false, activeCacheWrites });
    expect(mockFetcher).toHaveBeenCalledTimes(1);

    solve(new Response('new', { headers: { 'Cache-Control': 'public, max-age=3600' } }));
    const resB = await pB;
    expect(await resB.text()).toBe('new');
  });

  it('应该在网络失败时支持 stale-if-error', async () => {
    const { cache, activeCacheWrites } = await createTestCache('error');
    const request = new Request('https://api.example.com/error');
    const res0 = await fetchWithCache(request, async () => new Response('stale', {
      headers: { 'Cache-Control': 'public, max-age=0' }
    }), { cache, config, activeCacheWrites });
    await res0.text();
    await Promise.all(activeCacheWrites.values());

    const mockFetcher = vi.fn().mockRejectedValue(new Error('Network Fail'));
    const res = await fetchWithCache(request, mockFetcher, { cache, config, backgroundUpdate: false, activeCacheWrites });
    expect(await res.text()).toBe('stale');
    expect(res.headers.get('x-proxy-cache')).toBe('STALE_IF_ERROR');
  });

  it('应该防击穿：多个并发请求相同时，只发起一次网络请求并共享结果', async () => {
    const { cache, activeCacheWrites } = await createTestCache('coalescing');
    const request = new Request('https://api.example.com/coalesce');

    // 模拟一个需要一定时间才能响应的慢速网络请求
    const mockFetcher = vi.fn().mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 100));
      return new Response('coalesced_data', {
        headers: { 'Cache-Control': 'public, max-age=3600' }
      });
    });

    // 同时发起 3 个完全相同的请求
    const promises = [
      fetchWithCache(request.clone(), mockFetcher, { cache, config, activeCacheWrites }),
      fetchWithCache(request.clone(), mockFetcher, { cache, config, activeCacheWrites }),
      fetchWithCache(request.clone(), mockFetcher, { cache, config, activeCacheWrites })
    ];

    const responses = await Promise.all(promises);

    // 等待所有流被消费
    const texts = await Promise.all(responses.map(res => res.text()));

    // 三个请求拿到的内容应该完全一致
    expect(texts[0]).toBe('coalesced_data');
    expect(texts[1]).toBe('coalesced_data');
    expect(texts[2]).toBe('coalesced_data');

    // 关键断言：虽然有 3 个并发请求，但底层 fetcher 只应该被调用 1 次！
    expect(mockFetcher).toHaveBeenCalledTimes(1);

    // 第一个是去源站拉取的，后续两个是等前面的缓存写完直接读盘的
    expect(responses[0].headers.get('x-proxy-cache')).toBe('MISS');
    expect(responses[1].headers.get('x-proxy-cache')).toBe('HIT');
    expect(responses[2].headers.get('x-proxy-cache')).toBe('HIT');

    await Promise.all(activeCacheWrites.values());
  });

  it('应该不缓存带有 Cache-Control: no-store 的响应', async () => {
    const { cache, activeCacheWrites } = await createTestCache('nostore');
    const request = new Request('https://api.example.com/no-store');

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('secret data', {
      headers: { 'Cache-Control': 'no-store' }
    }));

    const res1 = await fetchWithCache(request, mockFetcher, { cache, config, activeCacheWrites });
    expect(await res1.text()).toBe('secret data');
    expect(res1.headers.get('x-proxy-cache')).toBe('MISS');

    await Promise.all(activeCacheWrites.values());

    const res2 = await fetchWithCache(request, mockFetcher, { cache, config, activeCacheWrites });
    expect(await res2.text()).toBe('secret data');
    expect(res2.headers.get('x-proxy-cache')).toBe('MISS');

    expect(mockFetcher).toHaveBeenCalledTimes(2);
  });

  it('开启 forceCache 时，应该无视 no-store 强制缓存', async () => {
    const { cache, activeCacheWrites } = await createTestCache('forcecache');
    const request = new Request('https://api.example.com/no-store-force');

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('secret data', {
      headers: { 'Cache-Control': 'no-store' }
    }));

    // 开启 forceCache
    const testConfig = { ...config, forceCache: true };

    const res1 = await fetchWithCache(request, mockFetcher, { cache, config: testConfig, activeCacheWrites });
    expect(await res1.text()).toBe('secret data');
    expect(res1.headers.get('x-proxy-cache')).toBe('MISS');

    await Promise.all(activeCacheWrites.values());

    const res2 = await fetchWithCache(request, mockFetcher, { cache, config: testConfig, activeCacheWrites });
    expect(await res2.text()).toBe('secret data');
    // 由于是 no-store，它的 policy 永远是过期的，所以一定会触发 SWR 并返回 STALE
    expect(res2.headers.get('x-proxy-cache')).toBe('STALE');

    expect(mockFetcher).toHaveBeenCalledTimes(2);
  });

  it('应该正常处理无 Body 的响应 (例如 204 No Content)', async () => {
    const { cache, activeCacheWrites } = await createTestCache('nobody');
    const request = new Request('https://api.example.com/204');

    const mockFetcher = vi.fn().mockImplementation(async () => new Response(null, {
      status: 204,
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    const res1 = await fetchWithCache(request, mockFetcher, { cache, config, activeCacheWrites });
    expect(res1.status).toBe(204);
    expect(res1.headers.get('x-proxy-cache')).toBe('MISS');
    await Promise.all(activeCacheWrites.values());

    const res2 = await fetchWithCache(request, mockFetcher, { cache, config, activeCacheWrites });
    expect(res2.status).toBe(204);
    expect(res2.headers.get('x-proxy-cache')).toBe('HIT');

    expect(mockFetcher).toHaveBeenCalledTimes(1);
  });

  it('大文件响应应自动 offload 到 L2 且 Meta 驻留内存', async () => {
    const { cache, storagePath, activeCacheWrites } = await createTestCache('large', 5);
    const request = new Request('https://api.example.com/large-integrated');
    const largeContent = 'very large content';

    const mockFetcher = vi.fn().mockImplementation(async () => new Response(largeContent, {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    // 1. 存入缓存
    const res1 = await fetchWithCache(request, mockFetcher, { cache, config, activeCacheWrites });
    await res1.text(); // 必须消费，否则写入不会完成
    await Promise.all(activeCacheWrites.values());

    // 2. 验证 Meta 在内存但 Body 在磁盘：
    // 我们通过修改路径来模拟磁盘不可用，而不直接删除目录
    (cache as any).storagePath = path.join(storagePath, 'non-existent-sub-path');

    // 3. 再次获取：
    // 因为 Body 不在内存，且我们把磁盘路径指歪了，获取流抛错，于是降级执行新请求
    const res = await fetchWithCache(request, mockFetcher, { cache, config, activeCacheWrites });
    expect(mockFetcher).toHaveBeenCalledTimes(2);
    await res.text();
  });

  it('在并发请求合并时，如果发起者 Fetch 失败，所有并发等待者应收到相同错误且不重试', async () => {
    const { cache, activeCacheWrites } = await createTestCache('coalesce-fail');
    const request = new Request('https://api.example.com/fail');

    const mockFetcher = vi.fn().mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 50));
      throw new Error('Network Error');
    });

    const p1 = fetchWithCache(request.clone(), mockFetcher, { cache, config, activeCacheWrites });
    const p2 = fetchWithCache(request.clone(), mockFetcher, { cache, config, activeCacheWrites });

    await expect(p1).rejects.toThrow('Network Error');
    await expect(p2).rejects.toThrow('Network Error');

    // 关键：fetcher 应该只被调用了 1 次
    expect(mockFetcher).toHaveBeenCalledTimes(1);
  });

  it('应该支持后台更新 (SWR) 的并发合并', async () => {
    const { cache, activeCacheWrites } = await createTestCache('swr-coalesce');
    const request = new Request('https://api.example.com/swr-coalesce');

    // 1. 存入一个已过期的缓存
    const res0 = await fetchWithCache(request, async () => new Response('old', {
      headers: { 'Cache-Control': 'public, max-age=1' }
    }), { cache, config, activeCacheWrites });
    await res0.text();
    await Promise.all(activeCacheWrites.values());

    await new Promise(r => setTimeout(r, 1100)); // 确保过期

    // 2. 模拟一个较慢的网络响应
    const mockFetcher = vi.fn().mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 100));
      return new Response('new', { headers: { 'Cache-Control': 'public, max-age=3600' } });
    });

    // 3. 同时发起两个 STALE 请求
    const [resA, resB] = await Promise.all([
      fetchWithCache(request.clone(), mockFetcher, { cache, config, backgroundUpdate: true, activeCacheWrites }),
      fetchWithCache(request.clone(), mockFetcher, { cache, config, backgroundUpdate: true, activeCacheWrites })
    ]);

    expect(resA.headers.get('x-proxy-cache')).toBe('STALE');
    expect(resB.headers.get('x-proxy-cache')).toBe('STALE');

    // 等待后台更新完成
    await new Promise(r => setTimeout(r, 20));
    await Promise.all(activeCacheWrites.values());

    // 关键：即使有两个 STALE 请求，后台 fetcher 应该只被调用一次
    expect(mockFetcher).toHaveBeenCalledTimes(1);
  });
});
