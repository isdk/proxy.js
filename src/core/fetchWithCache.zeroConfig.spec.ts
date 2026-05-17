import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { SmartCache, fetchWithCache } from './index';
import { ProxyConfig, ProxyCacheRule } from '../types';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

describe('fetchWithCache Zero Config & Site Mapping', () => {
  const testDirs: string[] = [];

  // 辅助函数：在系统临时目录下创建一个唯一的测试缓存
  async function createTestCache(name: string) {
    const storagePath = path.join(os.tmpdir(), `isdk-proxy-test-zero-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    testDirs.push(storagePath);
    await fs.rm(storagePath, { recursive: true, force: true });
    const cache = new SmartCache({ storagePath });
    const activeCacheWrites = new Map<string, Promise<void>>();
    return { cache, storagePath, activeCacheWrites };
  }

  // 测试结束后清理临时目录
  afterAll(async () => {
    for (const dir of testDirs) {
      try {
        await fs.rm(dir, { recursive: true, force: true });
      } catch (e) {}
    }
  });

  it('应该在完全没有 config 的情况下依然能缓存 GET 请求 (Zero Config)', async () => {
    const { cache, activeCacheWrites } = await createTestCache('zero-config');
    const request = new Request('https://api.example.com/data');
    const mockFetcher = vi.fn().mockImplementation(async () => new Response('hello', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    // 第一次请求 (MISS)
    const res1 = await fetchWithCache(request, mockFetcher, { cache, activeCacheWrites });
    expect(await res1.text()).toBe('hello');
    expect(res1.headers.get('x-proxy-cache')).toBe('MISS');
    await Promise.all(activeCacheWrites.values());

    // 第二次请求 (HIT)
    const res2 = await fetchWithCache(request, mockFetcher, { cache, activeCacheWrites });
    expect(await res2.text()).toBe('hello');
    expect(res2.headers.get('x-proxy-cache')).toBe('HIT');
    expect(mockFetcher).toHaveBeenCalledTimes(1);
  });

  it('应该支持传入全局 ProxyConfig 并自动匹配站点 (Site Mapping)', async () => {
    const { cache, activeCacheWrites } = await createTestCache('site-mapping');

    const globalConfig: ProxyConfig = {
      sites: {
        'api.a.com': { forceCache: true }, // A 站点强制缓存
        'api.b.com': { methods: ['POST'] }  // B 站点只允许 POST 缓存
      }
    };

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('data', {
      headers: { 'Cache-Control': 'no-store' } // 后端要求不缓存
    }));

    // 请求 A 站点 (由于匹配到 api.a.com 且 forceCache: true，应该缓存)
    const reqA = new Request('https://api.a.com/data');
    const resA1 = await fetchWithCache(reqA, mockFetcher, { cache, config: globalConfig, activeCacheWrites });
    await resA1.text();
    await Promise.all(activeCacheWrites.values());

    const resA2 = await fetchWithCache(reqA, mockFetcher, { cache, config: globalConfig, activeCacheWrites });
    expect(resA2.headers.get('x-proxy-cache')).toBe('STALE'); // no-store + forceCache = STALE (语义上是命中了但需要再验证)

    // 请求 B 站点 GET (匹配到 api.b.com 但方法不匹配，不应缓存)
    const reqB = new Request('https://api.b.com/data');
    const resB1 = await fetchWithCache(reqB, mockFetcher, { cache, config: globalConfig, activeCacheWrites });
    await resB1.text();
    await Promise.all(activeCacheWrites.values());

    const resB2 = await fetchWithCache(reqB, mockFetcher, { cache, config: globalConfig, activeCacheWrites });
    expect(resB2.headers.get('x-proxy-cache')).toBe('MISS_EXCLUDED_REQUEST');
  });

  it('全局 ProxyConfig 中的顶级规则应该应用于所有站点 (Global Rules)', async () => {
    const { cache, activeCacheWrites } = await createTestCache('global-rules');

    const globalConfig: ProxyConfig = {
      forceCache: true, // 全局强制缓存
      sites: {
        'api.special.com': { forceCache: false } // 唯独这个站点不强制
      }
    };

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('data', {
      headers: { 'Cache-Control': 'no-store' }
    }));

    // 请求普通站点 (受全局 forceCache: true 影响，应该缓存)
    const reqNormal = new Request('https://api.normal.com/data');
    const resN1 = await fetchWithCache(reqNormal, mockFetcher, { cache, config: globalConfig, activeCacheWrites });
    await resN1.text();
    await Promise.all(activeCacheWrites.values());
    const resN2 = await fetchWithCache(reqNormal, mockFetcher, { cache, config: globalConfig, activeCacheWrites });
    expect(resN2.headers.get('x-proxy-cache')).toBe('STALE');

    // 请求特殊站点 (受站点 forceCache: false 覆盖，不应缓存)
    const reqSpecial = new Request('https://api.special.com/data');
    const resS1 = await fetchWithCache(reqSpecial, mockFetcher, { cache, config: globalConfig, activeCacheWrites });
    await resS1.text();
    await Promise.all(activeCacheWrites.values());
    const resS2 = await fetchWithCache(reqSpecial, mockFetcher, { cache, config: globalConfig, activeCacheWrites });
    expect(resS2.headers.get('x-proxy-cache')).toBe('MISS_UNSTORABLE');
  });

  it('fetcher 应该能通过 this 访问缓存上下文 (cacheKey, config, request)', async () => {
    const { cache, activeCacheWrites } = await createTestCache('fetcher-this-context');
    const request = new Request('https://api.example.com/data?id=123');

    // 使用常规 function 捕获 this 上下文
    let capturedContext: { cacheKey?: string; config?: ProxyCacheRule; request?: Request } = {};
    const mockFetcher = vi.fn().mockImplementation(async function(this: any, req) {
      // 通过 this 访问缓存上下文
      capturedContext.cacheKey = this.cacheKey;
      capturedContext.config = this.config;
      capturedContext.request = this.request;
      return new Response('hello', {
        headers: { 'Cache-Control': 'public, max-age=3600' }
      });
    });

    // 传入 config 确保 effectiveConfig 存在
    await fetchWithCache(request, mockFetcher, { cache, activeCacheWrites, config: { forceCache: true } });
    await Promise.all(activeCacheWrites.values());

    // 验证 this 上下文被正确传递
    expect(capturedContext.cacheKey).toBeDefined();
    expect(typeof capturedContext.cacheKey).toBe('string');
    expect(capturedContext.cacheKey!.length).toBeGreaterThan(0);
    expect(capturedContext.config).toBeDefined();
    expect(capturedContext.request).toBe(request);
  });

  it('箭头函数 fetcher 中的 this 应该指向 globalThis 而非 ctx', async () => {
    const { cache, activeCacheWrites } = await createTestCache('fetcher-arrow-context');
    const request = new Request('https://api.example.com/data');

    // 箭头函数捕获外部 this，这里捕获 globalThis
    let outerThis: any;
    const mockFetcher = async (req: Request) => {
      // 箭头函数会使用外层的 this（词法绑定）
      outerThis = this as any;
      return new Response('hello', {
        headers: { 'Cache-Control': 'public, max-age=3600' }
      });
    }

    await fetchWithCache(request, mockFetcher, { cache, activeCacheWrites, config: { forceCache: true } });

    // outerThis 应该保持原值，说明箭头函数没有访问到 ctx 的 this
    expect(outerThis).toEqual(this);
  });
});
