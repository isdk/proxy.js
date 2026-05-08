import { describe, it, expect, vi } from 'vitest';
import { SmartCache, fetchWithCache } from './index';
import { SiteCacheConfig } from '../types';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

describe('fetchWithCache Advanced Rules (Regex & Glob)', () => {
  async function createTestCache(name: string) {
    const storagePath = path.join(os.tmpdir(), `isdk-proxy-advanced-test-${name}-${Date.now()}`);
    await fs.rm(storagePath, { recursive: true, force: true });
    const cache = new SmartCache({ storagePath });
    const activeCacheWrites = new Map<string, Promise<void>>();
    return { cache, storagePath, activeCacheWrites };
  }

  it('cacheRules 应该支持路径正则匹配', async () => {
    const { cache, activeCacheWrites } = await createTestCache('path-regex');
    const config: SiteCacheConfig = {
      cacheRules: [
        { path: /^\/api\/v[12]\// }
      ]
    };

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('ok', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    // 匹配 v1
    const res1 = await fetchWithCache(new Request('https://api.com/api/v1/user'), mockFetcher, { cache, config, activeCacheWrites });
    expect(res1.headers.get('x-proxy-cache')).toBe('MISS');

    // 匹配 v2
    const res2 = await fetchWithCache(new Request('https://api.com/api/v2/user'), mockFetcher, { cache, config, activeCacheWrites });
    expect(res2.headers.get('x-proxy-cache')).toBe('MISS');

    // 不匹配 v3
    const res3 = await fetchWithCache(new Request('https://api.com/api/v3/user'), mockFetcher, { cache, config, activeCacheWrites });
    expect(res3.headers.get('x-proxy-cache')).toBeNull();
  });

  it('cacheRules 应该支持路径 Glob 匹配 (含否定 !)', async () => {
    const { cache, activeCacheWrites } = await createTestCache('path-glob');
    const config: SiteCacheConfig = {
      cacheRules: [
        { path: '/api/**/!(private)*' }
      ]
    };

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('ok', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    // 匹配 public
    const res1 = await fetchWithCache(new Request('https://api.com/api/v1/public-data'), mockFetcher, { cache, config, activeCacheWrites });
    expect(res1.headers.get('x-proxy-cache')).toBe('MISS');

    // 不匹配 private
    const res2 = await fetchWithCache(new Request('https://api.com/api/v1/private-data'), mockFetcher, { cache, config, activeCacheWrites });
    expect(res2.headers.get('x-proxy-cache')).toBeNull();
  });

  it('cacheRules 应该支持 Query 值正则匹配', async () => {
    const { cache, activeCacheWrites } = await createTestCache('query-regex');
    const config: SiteCacheConfig = {
      cacheRules: [
        { query: { type: /^(user|admin)$/ } }
      ]
    };

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('ok', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    // 匹配 user
    const res1 = await fetchWithCache(new Request('https://api.com/?type=user'), mockFetcher, { cache, config, activeCacheWrites });
    expect(res1.headers.get('x-proxy-cache')).toBe('MISS');

    // 不匹配 guest
    const res2 = await fetchWithCache(new Request('https://api.com/?type=guest'), mockFetcher, { cache, config, activeCacheWrites });
    expect(res2.headers.get('x-proxy-cache')).toBeNull();
  });

  it('cacheRules 应该支持 Body 内容正则匹配', async () => {
    const { cache, activeCacheWrites } = await createTestCache('body-match');
    const config: SiteCacheConfig = {
      methods: ['POST'],
      cacheRules: [
        { method: 'POST', body: /"action":"cache"/ }
      ]
    };

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('ok', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    // 匹配 body
    const req1 = new Request('https://api.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cache', data: 1 })
    });
    const res1 = await fetchWithCache(req1, mockFetcher, { cache, config, activeCacheWrites });
    expect(res1.headers.get('x-proxy-cache')).toBe('MISS');

    // 不匹配 body
    const req2 = new Request('https://api.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bypass', data: 1 })
    });
    const res2 = await fetchWithCache(req2, mockFetcher, { cache, config, activeCacheWrites });
    expect(res2.headers.get('x-proxy-cache')).toBeNull();
  });

  it('generateCacheKey 应该支持非 JSON Body 的正则提取', async () => {
    const { cache, activeCacheWrites } = await createTestCache('body-extract');
    const config: SiteCacheConfig = {
      methods: ['POST'],
      body: {
        extract: /op=([^&]+)&id=([^&]+)/
      }
    };

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('ok', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    // 两个请求，op 和 id 相同，但 nonce 不同
    const req1 = new Request('https://api.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'op=get&id=1&nonce=abc'
    });
    const req2 = new Request('https://api.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'op=get&id=1&nonce=xyz'
    });

    const res1 = await fetchWithCache(req1, mockFetcher, { cache, config, activeCacheWrites });
    expect(res1.headers.get('x-proxy-cache')).toBe('MISS');
    await res1.text();
    await Promise.all(activeCacheWrites.values());

    // 第二个请求应该命中缓存，因为提取出的 key (get:1) 相同
    const res2 = await fetchWithCache(req2, mockFetcher, { cache, config, activeCacheWrites });
    expect(res2.headers.get('x-proxy-cache')).toBe('HIT');
  });

  it('KeyFilterConfig 应该支持正则包含/排除', async () => {
    const { cache, activeCacheWrites } = await createTestCache('key-filter-regex');
    const config: SiteCacheConfig = {
      query: {
        exclude: [/^utm_/, 'timestamp']
      }
    };

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('ok', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    // 两个请求，只有 utm_ 和 timestamp 不同
    const res1 = await fetchWithCache(new Request('https://api.com/?id=1&utm_source=google&timestamp=123'), mockFetcher, { cache, config, activeCacheWrites });
    expect(res1.headers.get('x-proxy-cache')).toBe('MISS');
    await res1.text();
    await Promise.all(activeCacheWrites.values());

    const res2 = await fetchWithCache(new Request('https://api.com/?id=1&utm_source=twitter&timestamp=456'), mockFetcher, { cache, config, activeCacheWrites });
    expect(res2.headers.get('x-proxy-cache')).toBe('HIT');
  });

  it('cacheRules 应该支持 bodyType 约束', async () => {
    const { cache, activeCacheWrites } = await createTestCache('body-type-constraint');
    const config: SiteCacheConfig = {
      methods: ['POST'],
      cacheRules: [
        { method: 'POST', bodyType: 'json', body: /"ok":true/ }
      ]
    };

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('ok', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    // 1. 类型匹配且内容匹配
    const req1 = new Request('https://api.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true })
    });
    const res1 = await fetchWithCache(req1, mockFetcher, { cache, config, activeCacheWrites });
    expect(res1.headers.get('x-proxy-cache')).toBe('MISS');

    // 2. 类型不匹配 (虽然内容匹配)
    const req2 = new Request('https://api.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: '{"ok":true}'
    });
    const res2 = await fetchWithCache(req2, mockFetcher, { cache, config, activeCacheWrites });
    expect(res2.headers.get('x-proxy-cache')).toBeNull();
  });

  it('KeyFilterConfig 应该支持 Glob 模式', async () => {
    const { cache, activeCacheWrites } = await createTestCache('key-filter-glob');
    const config: SiteCacheConfig = {
      headers: {
        exclude: ['x-dynamic-*']
      }
    };

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('ok', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    const res1 = await fetchWithCache(new Request('https://api.com/', {
      headers: { 'x-dynamic-id': '123' }
    }), mockFetcher, { cache, config, activeCacheWrites });
    expect(res1.headers.get('x-proxy-cache')).toBe('MISS');
    await res1.text();
    await Promise.all(activeCacheWrites.values());

    const res2 = await fetchWithCache(new Request('https://api.com/', {
      headers: { 'x-dynamic-id': '456' }
    }), mockFetcher, { cache, config, activeCacheWrites });
    expect(res2.headers.get('x-proxy-cache')).toBe('HIT');
  });

  it('body 提取应该支持多个捕获组并用冒号拼接', async () => {
    const { cache, activeCacheWrites } = await createTestCache('body-multi-groups');
    const config: SiteCacheConfig = {
      methods: ['POST'],
      body: {
        extract: /action=([^&]+).*?id=([^&]+)/
      }
    };

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('ok', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    const req1 = new Request('https://api.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'action=upload&other=foo&id=99'
    });
    const res1 = await fetchWithCache(req1, mockFetcher, { cache, config, activeCacheWrites });
    expect(res1.headers.get('x-proxy-cache')).toBe('MISS');
    await res1.text();
    await Promise.all(activeCacheWrites.values());

    // 只要 action 和 id 相同，中间的 other 不同也不影响命中
    const req2 = new Request('https://api.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'action=upload&id=99&other=bar'
    });
    const res2 = await fetchWithCache(req2, mockFetcher, { cache, config, activeCacheWrites });
    expect(res2.headers.get('x-proxy-cache')).toBe('HIT');
  });

  it('body maxLength 应该限制匹配范围', async () => {
    const { cache, activeCacheWrites } = await createTestCache('max-body-length');
    const config: SiteCacheConfig = {
      methods: ['POST'],
      body: {
        maxLength: 10
      },
      cacheRules: [
        { method: 'POST', body: '*findme*' }
      ]
    };

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('ok', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    // 1. 关键词在头 10 个字符内
    const res1 = await fetchWithCache(new Request('https://api.com/', {
      method: 'POST', body: '012findme89'
    }), mockFetcher, { cache, config, activeCacheWrites });
    expect(res1.headers.get('x-proxy-cache')).toBe('MISS');

    // 2. 关键词在 10 个字符之后
    const res2 = await fetchWithCache(new Request('https://api.com/', {
      method: 'POST', body: '0123456789_findme'
    }), mockFetcher, { cache, config, activeCacheWrites });
    expect(res2.headers.get('x-proxy-cache')).toBeNull();
  });

  it('应该支持深层 Glob 排除逻辑', async () => {
    const { cache, activeCacheWrites } = await createTestCache('deep-glob-exclude');
    const config: SiteCacheConfig = {
      cacheRules: [
        // 使用数组模式，利用 picomatch 的多模式匹配能力
        { path: ['/api/**/*.json', '!**/private/**'] }
      ]
    };

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('ok', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    // 匹配
    const res1 = await fetchWithCache(new Request('https://api.com/api/v1/users/list.json'), mockFetcher, { cache, config, activeCacheWrites });
    expect(res1.headers.get('x-proxy-cache')).toBe('MISS');

    // 不匹配 (包含 private 路径段)
    const res2 = await fetchWithCache(new Request('https://api.com/api/v1/private/users/list.json'), mockFetcher, { cache, config, activeCacheWrites });
    expect(res2.headers.get('x-proxy-cache')).toBeNull();
  });

  it('Body 正则提取应该支持排序以消除顺序敏感', async () => {
    const { cache, activeCacheWrites } = await createTestCache('body-extract-sort');
    const config: SiteCacheConfig = {
      methods: ['POST'],
      body: {
        extract: /(?:op|id)=([^&]+).*(?:op|id)=([^&]+)/,
        sort: true
      }
    };

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('ok', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    // 请求 1: op 前, id 后
    const res1 = await fetchWithCache(new Request('https://api.com/', {
      method: 'POST', body: 'op=get&id=1'
    }), mockFetcher, { cache, config, activeCacheWrites });
    await res1.text();
    await Promise.all(activeCacheWrites.values());

    // 请求 2: id 前, op 后，但值相同。开启 sort 后应该命中。
    const res2 = await fetchWithCache(new Request('https://api.com/', {
      method: 'POST', body: 'id=1&op=get'
    }), mockFetcher, { cache, config, activeCacheWrites });

    expect(res2.headers.get('x-proxy-cache')).toBe('HIT');
  });

  it('应该能正确处理带有参数的 Content-Type', async () => {
    const { cache, activeCacheWrites } = await createTestCache('content-type-params');
    const config: SiteCacheConfig = {
      methods: ['POST'],
      cacheRules: [{ method: 'POST', bodyType: 'json' }]
    };

    const mockFetcher = vi.fn().mockImplementation(async () => new Response('ok', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    const req = new Request('https://api.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ a: 1 })
    });
    const res = await fetchWithCache(req, mockFetcher, { cache, config, activeCacheWrites });
    expect(res.headers.get('x-proxy-cache')).toBe('MISS');
  });
});
