import { describe, it, expect, vi, afterAll } from 'vitest';
import { SmartCache, fetchWithCache } from './index';
import { ProxySiteConfig } from '../types';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

describe('fetchWithCache Runtime Options (isdkProxy)', () => {
  const testDirs: string[] = [];

  async function createTestCache(name: string) {
    const storagePath = path.join(os.tmpdir(), `isdk-proxy-runtime-test-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    testDirs.push(storagePath);
    await fs.rm(storagePath, { recursive: true, force: true });
    const cache = new SmartCache({ storagePath });
    const activeCacheWrites = new Map<string, Promise<void>>();
    return { cache, storagePath, activeCacheWrites };
  }

  afterAll(async () => {
    for (const dir of testDirs) {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => { });
    }
  });

  it('isdkProxy.refresh 应该具有最高优先级，强制穿透缓存', async () => {
    const { cache, activeCacheWrites } = await createTestCache('refresh');
    const url = 'https://api.example.com/runtime-refresh';
    const request = new Request(url);

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('data', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    // 1. 正常缓存
    await fetchWithCache(request.clone(), mockFetcher, { cache, config: {}, activeCacheWrites });
    await Promise.all(activeCacheWrites.values());
    expect(mockFetcher).toHaveBeenCalledTimes(1);

    // 2. 普通请求应该是 HIT
    const res1 = await fetchWithCache(request.clone(), mockFetcher, { cache, config: {}, activeCacheWrites });
    expect(res1.headers.get('x-proxy-cache')).toBe('HIT');
    expect(mockFetcher).toHaveBeenCalledTimes(1);

    // 3. 在 Request 上设置 isdkProxy.refresh = true
    const refreshReq = new Request(url);
    (refreshReq as any).isdkProxy = { refresh: true };

    const res2 = await fetchWithCache(refreshReq, mockFetcher, { cache, config: {}, activeCacheWrites });
    // 注意：虽然是刷新，但由于我们等待了写入，且逻辑上是 MISS (回源)
    expect(res2.headers.get('x-proxy-cache')).toBe('MISS');
    expect(mockFetcher).toHaveBeenCalledTimes(2); // 关键：第二次调用了源站
  });

  it('isdkProxy.config 应该能动态开启 forceCache', async () => {
    const { cache, activeCacheWrites } = await createTestCache('force-cache');
    const url = 'https://api.example.com/dynamic-force';
    const request = new Request(url);

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('no-cache-data', {
      headers: { 'Cache-Control': 'no-store' } // 默认不可缓存
    }));

    // 1. 默认配置下不缓存
    const res1 = await fetchWithCache(request.clone(), mockFetcher, { cache, config: { forceCache: false }, activeCacheWrites });
    expect(res1.headers.get('x-proxy-cache')).toBe('MISS_UNSTORABLE');

    // 2. 在 Request 上通过 isdkProxy 动态开启 forceCache
    const forceReq = new Request(url);
    (forceReq as any).isdkProxy = {
      config: { forceCache: true }
    };

    const res2 = await fetchWithCache(forceReq, mockFetcher, { cache, config: { forceCache: false }, activeCacheWrites });
    expect(res2.headers.get('x-proxy-cache')).toBe('MISS'); // 变为了 MISS (代表已存入)
    await Promise.all(activeCacheWrites.values());

    // 验证确实存进去了
    const res3 = await fetchWithCache(request.clone(), mockFetcher, { cache, config: { forceCache: true }, activeCacheWrites });
    expect(res3.headers.get('x-proxy-cache')).toBe('STALE'); // no-store 强制存入后读取会是过期
  });

  it('isdkProxy.config 应该能覆盖已匹配的 Rule 配置', async () => {
    const { cache, activeCacheWrites } = await createTestCache('rule-override');
    const url = 'https://api.example.com/rule-override';

    // 全局配置：有规则要求 forceCache: true
    const siteConfig: ProxySiteConfig = {
      rules: [
        { path: '/rule-override', forceCache: true }
      ]
    };

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('data', {
      headers: { 'Cache-Control': 'no-store' }
    }));

    // 1. 正常匹配规则时，应该是 MISS (因为 rule 开启了 forceCache)
    const res1 = await fetchWithCache(new Request(url), mockFetcher, { cache, config: siteConfig, activeCacheWrites });
    expect(res1.headers.get('x-proxy-cache')).toBe('MISS');
    await Promise.all(activeCacheWrites.values());

    // 2. 在 Request 上明确要求不强制缓存 (使用另一个 URL 确保不受前一步缓存干扰)
    const url2 = 'https://api.example.com/rule-override-2';
    const overrideReq = new Request(url2);
    (overrideReq as any).isdkProxy = {
      config: { forceCache: false }
    };

    const res2 = await fetchWithCache(overrideReq, mockFetcher, { cache, config: siteConfig, activeCacheWrites });
    // 即使匹配到了 rule (forceCache: true)，Request 上的 false 也应该胜出
    expect(res2.headers.get('x-proxy-cache')).toBe('MISS_UNSTORABLE');
  });

  it('isdkProxy 应该支持 backgroundUpdate 的运行时切换', async () => {
    const { cache, activeCacheWrites } = await createTestCache('swr-toggle');
    const url = 'https://api.example.com/swr-toggle';

    // 1. 存入一个过期数据
    await fetchWithCache(new Request(url), async () => new Response('old', {
      headers: { 'Cache-Control': 'public, max-age=0' }
    }), { cache, config: {}, activeCacheWrites });
    await Promise.all(activeCacheWrites.values());

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('new'));

    // 2. Request 明确要求关闭 SWR (即等待更新)
    const noSwrReq = new Request(url);
    (noSwrReq as any).isdkProxy = { backgroundUpdate: false };

    const res = await fetchWithCache(noSwrReq, mockFetcher, { cache, config: {}, backgroundUpdate: true, activeCacheWrites });
    // 因为禁用了 SWR，它应该直接去源站拿新数据，返回 MISS
    expect(await res.text()).toBe('new');
    expect(res.headers.get('x-proxy-cache')).toBe('MISS');
  });

  it('isdkProxy.config 的深度合并应该保留未覆盖的同级字段', async () => {
    const { cache, activeCacheWrites } = await createTestCache('deep-merge');
    const url = 'https://api.example.com/deep-merge';

    // 初始配置：要求最小长度 100 且状态码匹配
    const siteConfig: ProxySiteConfig = {
      response: {
        minLength: 100,
        statuses: [200]
      } as any
    };

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('short', { // 长度只有 5
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'Content-Length': '5' // 显式提供长度以触发校验
      }
    }));

    // 1. 默认情况下，因为太短会被拦截
    const res1 = await fetchWithCache(new Request(url), mockFetcher, { cache, config: siteConfig, activeCacheWrites });
    expect(res1.headers.get('x-proxy-cache')).toBe('MISS_EXCLUDED_TOO_SHORT');

    // 2. 运行时只覆盖 minLength，但不覆盖 statuses
    const req = new Request(url);
    (req as any).isdkProxy = {
      config: {
        response: { minLength: 1 } // 覆盖为 1，但应保留 statuses: [200]
      }
    };

    const res2 = await fetchWithCache(req, mockFetcher, { cache, config: siteConfig, activeCacheWrites });
    expect(res2.headers.get('x-proxy-cache')).toBe('MISS'); // 校验通过，说明合并成功且保留了 statuses 校验
  });

  it('isdkProxy.config 修改指纹提取规则应改变 Cache Key', async () => {
    const { cache, activeCacheWrites } = await createTestCache('fingerprint-override');
    const url = 'https://api.example.com/data?token=A&other=B';

    // 1. 默认配置：提取全部 query (包含 token 和 other)
    const mockFetcher = vi.fn().mockImplementation(async () => new Response('data'));
    await fetchWithCache(new Request(url), mockFetcher, { cache, config: {}, activeCacheWrites });
    await Promise.all(activeCacheWrites.values());

    // 2. 运行时配置：只提取 token 字段（排除 other 字段）
    const req = new Request(url);
    (req as any).isdkProxy = {
      config: {
        query: ['token'] // 改变提取范围，此时 Key 将不再包含 other 信息
      }
    };

    const res = await fetchWithCache(req, mockFetcher, { cache, config: {}, activeCacheWrites });
    // 因为 key 变了，不应该命中之前的缓存，应该是 MISS
    expect(res.headers.get('x-proxy-cache')).toBe('MISS');
  });

  it('isdkProxy 应该支持 offline 模式的动态开启', async () => {
    const { cache, activeCacheWrites } = await createTestCache('offline-toggle');
    const url = 'https://api.example.com/offline-runtime';

    // 1. 全局配置是正常的
    const siteConfig: ProxySiteConfig = { offline: false };
    const mockFetcher = vi.fn().mockImplementation(async () => new Response('data'));

    // 2. 通过 Request 强制开启离线模式
    const req = new Request(url);
    (req as any).isdkProxy = {
      config: { offline: true }
    };

    const res = await fetchWithCache(req, mockFetcher, { cache, config: siteConfig, activeCacheWrites });
    // 虽然没有匹配到 rules，但因为开启了 offline 且无缓存，应返回 512
    expect(res.status).toBe(512);
    expect(res.headers.get('x-proxy-cache')).toBe('OFFLINE_HIT');
  });

  it('isdkProxy 应该能覆盖 onBackgroundUpdate 回调', async () => {
    const { cache, activeCacheWrites } = await createTestCache('onBackgroundUpdate-override');
    const url = 'https://api.example.com/swr-callback';

    // 1. 存入过期数据
    await fetchWithCache(new Request(url), async () => new Response('old', {
      headers: { 'Cache-Control': 'public, max-age=0' }
    }), { cache, config: {}, activeCacheWrites });
    await Promise.all(activeCacheWrites.values());

    const globalCallback = vi.fn();
    const runtimeCallback = vi.fn();

    const req = new Request(url);
    (req as any).isdkProxy = {
      onBackgroundUpdate: runtimeCallback
    };

    // 2. 发起 SWR 请求
    const res = await fetchWithCache(req, async () => new Response('new'), {
      cache,
      config: {},
      onBackgroundUpdate: globalCallback,
      activeCacheWrites
    });

    expect(await res.text()).toBe('old');
    await Promise.all(activeCacheWrites.values());

    // 验证运行时的回调被调用，而全局的回调没被调用
    expect(runtimeCallback).toHaveBeenCalled();
    expect(globalCallback).not.toHaveBeenCalled();
  });

  it('isdkProxy 应该能覆盖 generateKey 函数', async () => {
    const { cache, activeCacheWrites } = await createTestCache('generateKey-override');
    const url = 'https://api.example.com/custom-key';

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('data'));
    const customGenKey = vi.fn().mockResolvedValue('CONSTANT_KEY');

    const req = new Request(url);
    (req as any).isdkProxy = {
      generateKey: customGenKey
    };

    await fetchWithCache(req, mockFetcher, { cache, config: {}, activeCacheWrites });

    expect(customGenKey).toHaveBeenCalled();
    // 检查缓存中是否存在该特定键
    expect(await cache.get('CONSTANT_KEY')).toBeDefined();
  });

  it('isdkProxy.config 应该能动态调整 Body 提取指纹', async () => {
    const { cache, activeCacheWrites } = await createTestCache('body-fingerprint');
    const url = 'https://api.example.com/post-data';
    const body = { id: 1, timestamp: Date.now() };

    const createPost = (data: any) => new Request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('ok', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    // 1. 默认配置：提取全部 body 字段，并允许 POST
    const siteConfig: ProxySiteConfig = { forceCache: true, methods: ['POST'] };
    // 定义一个排除 timestamp 的运行时配置
    const runtimeProxy = {
      config: {
        body: {
          match: ['*'],
          extract: ['*', '!timestamp']
        }
      }
    };

    // 1. 第一次请求 (时间戳 A) + 运行时排除规则 -> 存入缓存 (Key 只含 id)
    const req1 = createPost({ id: 1, timestamp: 1000 });
    (req1 as any).isdkProxy = runtimeProxy;
    await fetchWithCache(req1, mockFetcher, { cache, config: siteConfig, activeCacheWrites });
    await Promise.all(activeCacheWrites.values());

    // 2. 第二次请求 (时间戳 B) + 同样的运行时排除规则 -> 应命中缓存 (Key 只含 id)
    const req2 = createPost({ id: 1, timestamp: 2000 });
    (req2 as any).isdkProxy = runtimeProxy;
    const res = await fetchWithCache(req2, mockFetcher, { cache, config: siteConfig, activeCacheWrites });

    expect(res.headers.get('x-proxy-cache')).toBe('HIT');
  });
});
