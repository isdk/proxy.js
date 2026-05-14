import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { SmartCache, fetchWithCache } from './index';
import { OfflineCacheMissError, OfflineCacheMissErrorCode } from '../errors';
import type { ProxySiteConfig } from '../types';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

describe('Offline Mode', () => {
  const testDirs: string[] = [];

  // 辅助函数：在系统临时目录下创建一个唯一的测试缓存
  async function createTestCache(name: string) {
    const storagePath = path.join(os.tmpdir(), `isdk-proxy-test-offline-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    testDirs.push(storagePath);
    await fs.rm(storagePath, { recursive: true, force: true });
    const cache = new SmartCache({ storagePath });
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

  describe('OfflineCacheMissError', () => {
    it('应该创建包含正确信息的错误', () => {
      const url = 'https://api.example.com/data';
      const error = new OfflineCacheMissError(url);

      expect(error.message).toBe(`Offline mode: No cached response for ${url}`);
      expect(error.name).toBe('OfflineCacheMissError');
      expect(error.code).toBe(OfflineCacheMissErrorCode);
    });
  });

  describe('offline mode', () => {
    it('应该返回 OFFLINE_HIT 当缓存存在时', async () => {
      const { cache, activeCacheWrites } = await createTestCache('offline-hit');
      const offlineConfig: ProxySiteConfig = { offline: true };

      // 先正常缓存数据
      const request = new Request('https://api.example.com/data');
      await fetchWithCache(request, async () => new Response('cached data', {
        headers: { 'Cache-Control': 'public, max-age=3600' }
      }), { cache, config: { offline: false }, activeCacheWrites });
      await Promise.all(activeCacheWrites.values());

      // 再次请求，这次启用 offline 模式
      const res = await fetchWithCache(request, async () => {
        throw new Error('Should not be called in offline mode');
      }, { cache, config: offlineConfig, activeCacheWrites });

      expect(await res.text()).toBe('cached data');
      expect(res.headers.get('x-proxy-cache')).toBe('OFFLINE_HIT');
    });

    it('应该返回 Response with OfflineCacheMissErrorCode 当缓存不存在时', async () => {
      const { cache, activeCacheWrites } = await createTestCache('offline-miss');
      const offlineConfig: ProxySiteConfig = { offline: true };

      const request = new Request('https://api.example.com/no-such-data');

      // offline 模式下缓存未命中应返回 Response 而不是抛出错误
      const res = await fetchWithCache(request, async () => {
        throw new Error('Should not be called in offline mode');
      }, { cache, config: offlineConfig, activeCacheWrites });

      expect(res.status).toBe(OfflineCacheMissErrorCode);
      expect(await res.text()).toBe('Offline mode: No cached response');
      expect(res.headers.get('x-proxy-cache')).toBe('OFFLINE_HIT');
    });

    it('offline 模式下不应调用 fetcher', async () => {
      const { cache, activeCacheWrites } = await createTestCache('offline-no-fetch');
      const offlineConfig: ProxySiteConfig = { offline: true };

      // 先正常缓存数据
      const request = new Request('https://api.example.com/fetch-test');
      await fetchWithCache(request, async () => new Response('data', {
        headers: { 'Cache-Control': 'public, max-age=3600' }
      }), { cache, config: { offline: false }, activeCacheWrites });
      await Promise.all(activeCacheWrites.values());

      // offline 模式下不应调用 fetcher
      const mockFetcher = vi.fn().mockImplementation(async () => {
        throw new Error('Fetcher should not be called in offline mode');
      });

      const res = await fetchWithCache(request, mockFetcher, {
        cache,
        config: offlineConfig,
        activeCacheWrites
      });

      expect(mockFetcher).not.toHaveBeenCalled();
      expect(await res.text()).toBe('data');
    });

    it('offline 模式下并发请求应都能命中缓存', async () => {
      const { cache, activeCacheWrites } = await createTestCache('offline-concurrent');
      const offlineConfig: ProxySiteConfig = { offline: true };

      // 先正常缓存数据
      const request = new Request('https://api.example.com/concurrent');
      await fetchWithCache(request, async () => new Response('concurrent data', {
        headers: { 'Cache-Control': 'public, max-age=3600' }
      }), { cache, config: { offline: false }, activeCacheWrites });
      await Promise.all(activeCacheWrites.values());

      // 并发请求
      const promises = Array.from({ length: 5 }).map(() =>
        fetchWithCache(new Request('https://api.example.com/concurrent'), async () => {
          throw new Error('Should not be called');
        }, { cache, config: offlineConfig, activeCacheWrites })
      );

      const results = await Promise.all(promises);
      for (const res of results) {
        expect(res.headers.get('x-proxy-cache')).toBe('OFFLINE_HIT');
        expect(await res.text()).toBe('concurrent data');
      }
    });

    it('offline 模式下即使缓存过期也应返回 OFFLINE_HIT', async () => {
      const { cache, activeCacheWrites } = await createTestCache('offline-stale');
      const offlineConfig: ProxySiteConfig = { offline: true };

      // 先缓存一个已过期的数据
      const request = new Request('https://api.example.com/stale-data');
      await fetchWithCache(request, async () => new Response('old data', {
        headers: { 'Cache-Control': 'public, max-age=1' }
      }), { cache, config: { offline: false }, activeCacheWrites });
      await Promise.all(activeCacheWrites.values());

      // 等待缓存过期
      await new Promise(resolve => setTimeout(resolve, 1100));

      // offline 模式应直接返回过期缓存
      const res = await fetchWithCache(request, async () => {
        throw new Error('Should not be called');
      }, { cache, config: offlineConfig, activeCacheWrites });

      expect(await res.text()).toBe('old data');
      expect(res.headers.get('x-proxy-cache')).toBe('OFFLINE_HIT');
    });

    it('offline 模式下不应触发 staleIfError，而是返回 Response', async () => {
      const { cache, activeCacheWrites } = await createTestCache('offline-staleiferror');
      const offlineConfig: ProxySiteConfig = { offline: true, staleIfError: true };

      // 没有任何缓存
      const request = new Request('https://api.example.com/no-cache');

      // offline 模式下应返回 Response 而不是抛出错误
      const res = await fetchWithCache(request, vi.fn().mockRejectedValue(new Error('Network Error')), {
        cache,
        config: offlineConfig,
        activeCacheWrites
      });

      expect(res.status).toBe(OfflineCacheMissErrorCode);
      expect(await res.text()).toBe('Offline mode: No cached response');
    });

    it('offline 模式下不应触发 SWR 后台更新', async () => {
      const { cache, activeCacheWrites } = await createTestCache('offline-swr');
      const offlineConfig: ProxySiteConfig = { offline: true };

      // 先缓存一个过期数据
      const request = new Request('https://api.example.com/swr-offline');
      await fetchWithCache(request, async () => new Response('old', {
        headers: { 'Cache-Control': 'public, max-age=1' }
      }), { cache, config: { offline: false }, activeCacheWrites });
      await Promise.all(activeCacheWrites.values());

      await new Promise(resolve => setTimeout(resolve, 1100));

      const mockFetcher = vi.fn().mockImplementation(async () => {
        throw new Error('Should not be called');
      });

      // offline 模式直接返回缓存，不触发 SWR
      const res = await fetchWithCache(request, mockFetcher, {
        cache,
        config: offlineConfig,
        backgroundUpdate: true, // 尝试启用后台更新
        activeCacheWrites
      });

      expect(mockFetcher).not.toHaveBeenCalled();
      expect(await res.text()).toBe('old');
      expect(res.headers.get('x-proxy-cache')).toBe('OFFLINE_HIT');
    });

    it('非 offline 模式下不应返回 OFFLINE_HIT', async () => {
      const { cache, activeCacheWrites } = await createTestCache('non-offline');
      const normalConfig: ProxySiteConfig = { offline: false };

      // 先正常缓存
      const request = new Request('https://api.example.com/normal');
      await fetchWithCache(request, async () => new Response('data', {
        headers: { 'Cache-Control': 'public, max-age=3600' }
      }), { cache, config: normalConfig, activeCacheWrites });
      await Promise.all(activeCacheWrites.values());

      // 非 offline 模式应返回 HIT
      const res = await fetchWithCache(request, async () => new Response('new', {
        headers: { 'Cache-Control': 'public, max-age=3600' }
      }), { cache, config: normalConfig, activeCacheWrites });

      expect(res.headers.get('x-proxy-cache')).toBe('HIT');
    });

    it('offline 模式应阻断即使不可缓存的请求', async () => {
      const { cache, activeCacheWrites } = await createTestCache('offline-uncacheable');
      // 默认只允许 GET/HEAD，这里我们尝试 POST
      const offlineConfig: ProxySiteConfig = {
        offline: true,
        methods: ['GET'] // 显式只允许 GET
      };

      const request = new Request('https://api.example.com/post-data', {
        method: 'POST',
        body: 'some data'
      });

      // 在非 offline 模式下，这个请求会因为 method 不匹配而穿透 (isCacheable 返回 false)
      // 但在 offline 模式下，它应该在 isCacheable 之前就被拦截并返回 Response（因为没有缓存）
      const mockFetcher = vi.fn();

      const res = await fetchWithCache(request, mockFetcher, {
        cache,
        config: offlineConfig,
        activeCacheWrites
      });

      expect(res.status).toBe(OfflineCacheMissErrorCode);
      expect(mockFetcher).not.toHaveBeenCalled();
    });
  });
});
