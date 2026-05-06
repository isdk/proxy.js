import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { SmartCache, fetchWithCache } from './index';
import { SiteCacheConfig } from '../types';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

describe('fetchWithCache', () => {
  const config: SiteCacheConfig = {
    staleIfError: true,
  };

  // 辅助函数：在系统临时目录下创建一个唯一的测试缓存
  async function createTestCache(name: string, maxMemorySize?: number) {
    const storagePath = path.join(os.tmpdir(), `isdk-proxy-test-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.rm(storagePath, { recursive: true, force: true });
    const cache = new SmartCache({ storagePath, maxMemorySize });
    return { cache, storagePath };
  }

  // 测试结束后清理临时目录
  afterAll(async () => {
    const tmpDir = os.tmpdir();
    const files = await fs.readdir(tmpDir);
    for (const file of files) {
      if (file.startsWith('isdk-proxy-test-')) {
        await fs.rm(path.join(tmpDir, file), { recursive: true, force: true }).catch(() => {});
      }
    }
  });

  it('应该能正常获取并缓存数据', async () => {
    const { cache } = await createTestCache('basic');
    const request = new Request('https://api.example.com/data');
    const mockFetcher = vi.fn().mockResolvedValue(new Response('hello', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    await fetchWithCache(request, mockFetcher, { cache, config });
    const res2 = await fetchWithCache(request, mockFetcher, { cache, config });
    expect(await res2.text()).toBe('hello');
    expect(res2.headers.get('x-proxy-cache')).toBe('HIT');
  });

  it('应该支持 SWR (Stale-While-Revalidate)', async () => {
    const { cache } = await createTestCache('swr');
    const request = new Request('https://api.example.com/swr');
    
    await fetchWithCache(request, async () => new Response('old', {
      headers: { 'Cache-Control': 'public, max-age=1' }
    }), { cache, config });

    await new Promise(resolve => setTimeout(resolve, 1100));

    const mockFetcher2 = vi.fn().mockResolvedValue(new Response('new', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));
    
    const res = await fetchWithCache(request, mockFetcher2, { cache, config, backgroundUpdate: true });
    expect(await res.text()).toBe('old');
    expect(res.headers.get('x-proxy-cache')).toBe('STALE');

    await new Promise(resolve => setTimeout(resolve, 200));
    const res3 = await fetchWithCache(request, mockFetcher2, { cache, config });
    expect(await res3.text()).toBe('new');
  });

  it('应该处理并发冲突：SWR 请求触发后台更新，后续阻塞请求应获得新数据', async () => {
    const { cache } = await createTestCache('concurrency');
    const request = new Request('https://api.example.com/mixed-concurrency');
    
    await fetchWithCache(request, async () => new Response('old', {
      headers: { 'Cache-Control': 'public, max-age=0' }
    }), { cache, config });

    let solve: any;
    const slowPromise = new Promise<Response>(r => { solve = r; });
    const mockFetcher = vi.fn().mockReturnValue(slowPromise);

    const resA = await fetchWithCache(request, mockFetcher, { cache, config, backgroundUpdate: true });
    expect(await resA.text()).toBe('old');

    const pB = fetchWithCache(request, mockFetcher, { cache, config, backgroundUpdate: false });
    expect(mockFetcher).toHaveBeenCalledTimes(1);

    solve(new Response('new', { headers: { 'Cache-Control': 'public, max-age=3600' } }));
    const resB = await pB;
    expect(await resB.text()).toBe('new');
  });

  it('应该在网络失败时支持 stale-if-error', async () => {
    const { cache } = await createTestCache('error');
    const request = new Request('https://api.example.com/error');
    await fetchWithCache(request, async () => new Response('stale', {
      headers: { 'Cache-Control': 'public, max-age=0' }
    }), { cache, config });

    const mockFetcher = vi.fn().mockRejectedValue(new Error('Network Fail'));
    const res = await fetchWithCache(request, mockFetcher, { cache, config, backgroundUpdate: false });
    expect(await res.text()).toBe('stale');
    expect(res.headers.get('x-proxy-cache')).toBe('STALE_IF_ERROR');
  });

  it('大文件响应应自动 offload 到 L2 且 Meta 驻留内存', async () => {
    const { cache, storagePath } = await createTestCache('large', 5);
    const request = new Request('https://api.example.com/large-integrated');
    const largeContent = 'very large content';
    
    const mockFetcher = vi.fn().mockResolvedValue(new Response(largeContent, {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    // 1. 存入缓存
    await fetchWithCache(request, mockFetcher, { cache, config });
    
    // 2. 验证 Meta 在内存但 Body 在磁盘：
    // 我们通过修改路径来模拟磁盘不可用，而不直接删除目录
    (cache as any).storagePath = path.join(storagePath, 'non-existent-sub-path');
    
    // 3. 再次获取：
    // 因为 Body 不在内存，且我们把磁盘路径指歪了，它应该返回 null -> 导致穿透
    const res = await fetchWithCache(request, mockFetcher, { cache, config });
    expect(mockFetcher).toHaveBeenCalledTimes(2); 
  });
});
