import { describe, it, expect, vi, afterAll } from 'vitest';
import { SmartCache, fetchWithCache } from './index';
import type { ProxySiteConfig } from '../types';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

describe('fetchWithCache Extra Validations', () => {
  const testDirs: string[] = [];

  async function createTestCache(name: string) {
    const storagePath = path.join(os.tmpdir(), `isdk-proxy-test-extra-${name}-${Date.now()}`);
    testDirs.push(storagePath);
    await fs.rm(storagePath, { recursive: true, force: true });
    const cache = new SmartCache({ storagePath });
    const activeCacheWrites = new Map<string, Promise<void>>();
    return { cache, storagePath, activeCacheWrites };
  }

  afterAll(async () => {
    for (const dir of testDirs) {
      try {
        await fs.rm(dir, { recursive: true, force: true });
      } catch (e) {
        // ignore
      }
    }
  });

  it('应该支持 onBackgroundUpdate 回调', async () => {
    const { cache, activeCacheWrites } = await createTestCache('swr-callback');
    const request = new Request('https://api.example.com/swr-callback');

    // 1. 存入一个已过期的缓存
    await fetchWithCache(request, async () => new Response('old', {
      headers: { 'Cache-Control': 'public, max-age=1' }
    }), { cache, config: {}, activeCacheWrites });
    await Promise.all(activeCacheWrites.values());

    await new Promise(r => setTimeout(r, 1100)); // 确保过期

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('new', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    let capturedPromise: Promise<Response> | undefined;
    const onBackgroundUpdate = (promise: Promise<Response>) => {
      capturedPromise = promise;
    };

    // 2. 触发 SWR
    const res = await fetchWithCache(request, mockFetcher, {
      cache,
      config: {},
      backgroundUpdate: true,
      onBackgroundUpdate,
      activeCacheWrites
    });

    expect(await res.text()).toBe('old');
    expect(capturedPromise).toBeDefined();

    // 等待后台更新完成
    const bgRes = await capturedPromise!;
    expect(await bgRes.text()).toBe('new');
  });

  it('如果 onBackgroundUpdate 抛出错误，不应影响主流程', async () => {
    const { cache, activeCacheWrites } = await createTestCache('swr-error-callback');
    const request = new Request('https://api.example.com/swr-error-callback');

    await fetchWithCache(request, async () => new Response('old', {
      headers: { 'Cache-Control': 'public, max-age=1' }
    }), { cache, config: {}, activeCacheWrites });
    await Promise.all(activeCacheWrites.values());
    await new Promise(r => setTimeout(r, 1100));

    const onBackgroundUpdate = () => {
      throw new Error('Callback Error');
    };

    // 虽然回调抛错，但 fetchWithCache 应该能正常返回旧数据
    const res = await fetchWithCache(request, async () => new Response('new'), {
      cache,
      config: {},
      backgroundUpdate: true,
      onBackgroundUpdate,
      activeCacheWrites
    });

    expect(await res.text()).toBe('old');
  });

  it('应该处理不可存入缓存但满足匹配规则的响应', async () => {
    const { cache, activeCacheWrites } = await createTestCache('non-storable');
    const request = new Request('https://api.example.com/non-storable');

    // 明确要求不准缓存的响应
    const mockFetcher = vi.fn().mockImplementation(async () => new Response('data', {
      headers: { 'Cache-Control': 'no-store' }
    }));

    // 第一次：MISS
    const res1 = await fetchWithCache(request, mockFetcher, { cache, config: {}, activeCacheWrites });
    expect(res1.headers.get('x-proxy-cache')).toBe('MISS_UNSTORABLE');
    await res1.text();
    await Promise.all(activeCacheWrites.values());

    // 第二次：依然应该是 MISS，因为上一个没存入
    const res2 = await fetchWithCache(request, mockFetcher, { cache, config: {}, activeCacheWrites });
    expect(res2.headers.get('x-proxy-cache')).toBe('MISS_UNSTORABLE');
    expect(mockFetcher).toHaveBeenCalledTimes(2);
  });

  it('应该支持自定义 generateKey 函数', async () => {
    const { cache, activeCacheWrites } = await createTestCache('custom-key');
    const request = new Request('https://api.example.com/data');

    const customKey = 'my-custom-key';
    const generateKey = vi.fn().mockResolvedValue(customKey);

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('data', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    // 1. 使用自定义 key 存储
    await fetchWithCache(request, mockFetcher, { cache, config: {}, generateKey, activeCacheWrites });
    await Promise.all(activeCacheWrites.values());

    expect(generateKey).toHaveBeenCalled();

    // 2. 验证缓存是否真的存到了自定义 key 下
    const entry = await cache.get(customKey);
    expect(entry).not.toBeNull();
    expect(await createResponseBody(entry!.body).text()).toBe('data');
  });

  // 辅助函数，模拟核心逻辑中的转换
  function createResponseBody(body: any): Response {
    if (body instanceof Buffer) {
      return new Response(new Uint8Array(body));
    }
    return new Response(body);
  }
});
