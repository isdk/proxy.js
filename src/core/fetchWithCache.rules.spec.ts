import { describe, it, expect, vi, afterAll } from 'vitest';
import { SmartCache, fetchWithCache } from './index';
import { ProxySiteConfig } from '../types';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

describe('fetchWithCache Rules & POST', () => {
  // 辅助函数：在系统临时目录下创建一个唯一的测试缓存
  async function createTestCache(name: string) {
    const storagePath = path.join(os.tmpdir(), `isdk-proxy-rules-test-${name}-${Date.now()}`);
    await fs.rm(storagePath, { recursive: true, force: true });
    const cache = new SmartCache({ storagePath });
    const activeCacheWrites = new Map<string, Promise<void>>();
    return { cache, storagePath, activeCacheWrites };
  }

  it('默认情况下不应该缓存 POST 请求', async () => {
    const { cache, activeCacheWrites } = await createTestCache('no-post-default');
    const config: ProxySiteConfig = {};
    const request = new Request('https://api.example.com/post', { method: 'POST' });
    const mockFetcher = vi.fn().mockImplementation(async () => new Response('posted', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    const res1 = await fetchWithCache(request, mockFetcher, { cache, config, activeCacheWrites });
    expect(res1.headers.get('x-proxy-cache')).toBeNull(); // 不走缓存逻辑，所以没有标头
    
    const res2 = await fetchWithCache(request, mockFetcher, { cache, config, activeCacheWrites });
    expect(res2.headers.get('x-proxy-cache')).toBeNull();
    expect(mockFetcher).toHaveBeenCalledTimes(2);
  });

  it('显式配置 methods 时应该允许缓存 POST', async () => {
    const { cache, activeCacheWrites } = await createTestCache('post-allowed');
    const config: ProxySiteConfig = { methods: ['GET', 'POST'] };
    const request = new Request('https://api.example.com/post', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 1 })
    });
    const mockFetcher = vi.fn().mockImplementation(async () => new Response('posted', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    const res1 = await fetchWithCache(request.clone(), mockFetcher, { cache, config, activeCacheWrites });
    await res1.text();
    await Promise.all(activeCacheWrites.values());

    const res2 = await fetchWithCache(request.clone(), mockFetcher, { cache, config, activeCacheWrites });
    expect(await res2.text()).toBe('posted');
    expect(res2.headers.get('x-proxy-cache')).toBe('HIT');
    expect(mockFetcher).toHaveBeenCalledTimes(1);
  });

  it('cacheRules 应该能精细控制哪些 POST 被缓存', async () => {
    const { cache, activeCacheWrites } = await createTestCache('post-rules');
    const config: ProxySiteConfig = { 
      methods: ['GET', 'POST'],
      rules: [
        { methods: ['POST'], path: '/cache-me' }
      ]
    };
    
    const mockFetcher = vi.fn().mockImplementation(async () => new Response('data', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    // 1. 匹配规则的 POST
    const req1 = new Request('https://api.example.com/cache-me', { method: 'POST' });
    const res1 = await fetchWithCache(req1, mockFetcher, { cache, config, activeCacheWrites });
    expect(res1.headers.get('x-proxy-cache')).toBe('MISS');
    await res1.text();
    await Promise.all(activeCacheWrites.values());

    const res1_hit = await fetchWithCache(req1, mockFetcher, { cache, config, activeCacheWrites });
    expect(res1_hit.headers.get('x-proxy-cache')).toBe('HIT');

    // 2. 不匹配规则的 POST
    const req2 = new Request('https://api.example.com/do-not-cache', { method: 'POST' });
    const res2 = await fetchWithCache(req2, mockFetcher, { cache, config, activeCacheWrites });
    expect(res2.headers.get('x-proxy-cache')).toBeNull();
  });

  it('cacheRules 应该支持多条规则 (OR 逻辑)', async () => {
    const { cache, activeCacheWrites } = await createTestCache('multi-rules');
    const config: ProxySiteConfig = { 
      methods: ['GET'],
      rules: [
        { path: '/a' },
        { path: '/b' }
      ]
    };
    
    const mockFetcher = vi.fn().mockImplementation(async () => new Response('ok', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    // 匹配第一条
    const resA = await fetchWithCache(new Request('https://api.com/a'), mockFetcher, { cache, config, activeCacheWrites });
    expect(resA.headers.get('x-proxy-cache')).toBe('MISS');

    // 匹配第二条
    const resB = await fetchWithCache(new Request('https://api.com/b'), mockFetcher, { cache, config, activeCacheWrites });
    expect(resB.headers.get('x-proxy-cache')).toBe('MISS');

    // 都不匹配
    const resC = await fetchWithCache(new Request('https://api.com/c'), mockFetcher, { cache, config, activeCacheWrites });
    expect(resC.headers.get('x-proxy-cache')).toBeNull();
  });

  it('cacheRules 应该支持 Query 参数匹配', async () => {
    const { cache, activeCacheWrites } = await createTestCache('query-rules');
    const config: ProxySiteConfig = { 
      methods: ['GET', 'POST'],
      rules: [
        { methods: ['POST'], query: { cache: 'true' } }
      ]
    };
    
    const mockFetcher = vi.fn().mockImplementation(async () => new Response('data', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    // 1. 匹配 Query 的 POST
    const req1 = new Request('https://api.example.com/api?cache=true', { method: 'POST' });
    const res1 = await fetchWithCache(req1, mockFetcher, { cache, config, activeCacheWrites });
    expect(res1.headers.get('x-proxy-cache')).toBe('MISS');
    await res1.text();
    await Promise.all(activeCacheWrites.values());

    const res1_hit = await fetchWithCache(req1, mockFetcher, { cache, config, activeCacheWrites });
    expect(res1_hit.headers.get('x-proxy-cache')).toBe('HIT');

    // 2. 不匹配 Query 的 POST
    const req2 = new Request('https://api.example.com/api?cache=false', { method: 'POST' });
    const res2 = await fetchWithCache(req2, mockFetcher, { cache, config, activeCacheWrites });
    expect(res2.headers.get('x-proxy-cache')).toBeNull();
  });

  it('cacheRules 应该支持 Query 布尔匹配 (存在/不存在)', async () => {
    const { cache, activeCacheWrites } = await createTestCache('query-bool-rules');
    const config: ProxySiteConfig = { 
      methods: ['GET'],
      rules: [
        { query: { 'require-me': true, 'forbid-me': false } }
      ]
    };
    
    const mockFetcher = vi.fn().mockImplementation(async () => new Response('data', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    // 1. 满足条件：有 require-me，没有 forbid-me
    const req1 = new Request('https://api.example.com/api?require-me=1');
    expect((await fetchWithCache(req1, mockFetcher, { cache, config, activeCacheWrites })).headers.get('x-proxy-cache')).toBe('MISS');

    // 2. 不满足条件：没有 require-me
    const req2 = new Request('https://api.example.com/api');
    expect((await fetchWithCache(req2, mockFetcher, { cache, config, activeCacheWrites })).headers.get('x-proxy-cache')).toBeNull();

    // 3. 不满足条件：有 forbid-me
    const req3 = new Request('https://api.example.com/api?require-me=1&forbid-me=1');
    expect((await fetchWithCache(req3, mockFetcher, { cache, config, activeCacheWrites })).headers.get('x-proxy-cache')).toBeNull();
  });

  it('应该支持 Body 过滤集成测试：过滤动态字段后实现缓存命中', async () => {
    const { cache, activeCacheWrites } = await createTestCache('body-filter-integration');
    const config: ProxySiteConfig = { 
      methods: ['POST'],
      body: { match: { id: true } } // 只根据 id 缓存
    };
    
    const mockFetcher = vi.fn().mockImplementation(async () => new Response('data', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    // 请求 1: id=1, ts=100
    const req1 = new Request('https://api.example.com/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 1, ts: 100 })
    });
    const res1 = await fetchWithCache(req1, mockFetcher, { cache, config, activeCacheWrites });
    await res1.text();
    await Promise.all(activeCacheWrites.values());

    // 请求 2: id=1, ts=200 (ts 不同但 id 相同，应该命中)
    const req2 = new Request('https://api.example.com/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 1, ts: 200 })
    });
    const res2 = await fetchWithCache(req2, mockFetcher, { cache, config, activeCacheWrites });
    expect(res2.headers.get('x-proxy-cache')).toBe('HIT');
    expect(await res2.text()).toBe('data');
    expect(mockFetcher).toHaveBeenCalledTimes(1);
  });

  it('非 JSON Body 应该回退到原始 Body 哈希', async () => {
    const { cache, activeCacheWrites } = await createTestCache('non-json-body');
    const config: ProxySiteConfig = { methods: ['POST'] };
    
    const mockFetcher = vi.fn().mockImplementation(async () => new Response('data', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    const body = 'plain text body';
    const req1 = new Request('https://api.example.com/post', { method: 'POST', body });
    const res1 = await fetchWithCache(req1.clone(), mockFetcher, { cache, config, activeCacheWrites });
    await res1.text();
    await Promise.all(activeCacheWrites.values());

    const res2 = await fetchWithCache(req1.clone(), mockFetcher, { cache, config, activeCacheWrites });
    expect(res2.headers.get('x-proxy-cache')).toBe('HIT');
    
    // 不同 Body 不应命中
    const reqDiff = new Request('https://api.example.com/post', { method: 'POST', body: 'different' });
    const resDiff = await fetchWithCache(reqDiff, mockFetcher, { cache, config, activeCacheWrites });
    expect(resDiff.headers.get('x-proxy-cache')).toBe('MISS');
  });

  it('应该支持 PUT 方法的缓存 (配合 forceCache)', async () => {
    const { cache, activeCacheWrites } = await createTestCache('put-method');
    // 注意：PUT 不是标准的可缓存方法，必须配合 forceCache 使用
    const config: ProxySiteConfig = { methods: ['PUT'], forceCache: true };
    
    const mockFetcher = vi.fn().mockImplementation(async () => new Response('updated', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    const req = new Request('https://api.example.com/resource', { method: 'PUT', body: 'data' });
    const res1 = await fetchWithCache(req.clone(), mockFetcher, { cache, config, activeCacheWrites });
    await res1.text();
    await Promise.all(activeCacheWrites.values());

    const res2 = await fetchWithCache(req.clone(), mockFetcher, { cache, config, activeCacheWrites });
    // 对于 PUT，由于是非幂等/非标准方法，http-cache-semantics 判定需重验证
    expect(res2.headers.get('x-proxy-cache')).toBe('STALE');
    expect(await res2.text()).toBe('updated');
  });

  it('应该支持 POST + forceCache (即使后端没有缓存标头)', async () => {
    const { cache, activeCacheWrites } = await createTestCache('post-force');
    const config: ProxySiteConfig = { methods: ['POST'], forceCache: true };
    
    // 模拟一个没有任何 Cache-Control 的后端响应
    const mockFetcher = vi.fn().mockImplementation(async () => new Response('no-cache-data', {
      headers: {} 
    }));

    const req = new Request('https://api.example.com/post', { method: 'POST', body: 'data' });
    
    // 第一次请求 (MISS)
    const res1 = await fetchWithCache(req.clone(), mockFetcher, { cache, config, activeCacheWrites });
    await res1.text();
    await Promise.all(activeCacheWrites.values());

    // 第二次请求 (STALE - 因为没有有效 policy，在 forceCache 下表现为 STALE 并触发 SWR)
    const res2 = await fetchWithCache(req.clone(), mockFetcher, { cache, config, activeCacheWrites });
    expect(res2.headers.get('x-proxy-cache')).toBe('STALE');
    expect(await res2.text()).toBe('no-cache-data');
    expect(mockFetcher).toHaveBeenCalledTimes(2); // 一次是 res1，一次是 res2 触发的 SWR
  });

  it('cacheRules 内部应该是 AND 逻辑 (同时匹配 path 和 query)', async () => {
    const { cache, activeCacheWrites } = await createTestCache('rule-and-logic');
    const config: ProxySiteConfig = { 
      methods: ['GET'],
      rules: [
        { path: '/api', query: { v: '1' } }
      ]
    };
    
    const mockFetcher = vi.fn().mockImplementation(async () => new Response('ok', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    // 1. 完全匹配
    const req1 = new Request('https://api.com/api?v=1');
    expect((await fetchWithCache(req1, mockFetcher, { cache, config, activeCacheWrites })).headers.get('x-proxy-cache')).toBe('MISS');

    // 2. 路径匹配但 Query 不匹配
    const req2 = new Request('https://api.com/api?v=2');
    expect((await fetchWithCache(req2, mockFetcher, { cache, config, activeCacheWrites })).headers.get('x-proxy-cache')).toBeNull();

    // 3. Query 匹配但路径不匹配
    const req3 = new Request('https://api.com/other?v=1');
    expect((await fetchWithCache(req3, mockFetcher, { cache, config, activeCacheWrites })).headers.get('x-proxy-cache')).toBeNull();
  });

  it('处理畸形 JSON Body 时应平滑回退', async () => {
    const { cache, activeCacheWrites } = await createTestCache('malformed-json');
    const config: ProxySiteConfig = { methods: ['POST'] };
    
    const mockFetcher = vi.fn().mockImplementation(async () => new Response('ok', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    // 发送畸形 JSON
    const req = new Request('https://api.com/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ invalid json'
    });

    const res1 = await fetchWithCache(req.clone(), mockFetcher, { cache, config, activeCacheWrites });
    expect(res1.headers.get('x-proxy-cache')).toBe('MISS');
    await res1.text();
    await Promise.all(activeCacheWrites.values());

    // 即使 JSON 解析失败，由于它回退到了原始 Body 哈希，相同内容的畸形 Body 依然应该命中
    const res2 = await fetchWithCache(req.clone(), mockFetcher, { cache, config, activeCacheWrites });
    expect(res2.headers.get('x-proxy-cache')).toBe('HIT');
  });

  it('不同 Body 的并发 POST 不应发生误合并 (Coalescing Isolation)', async () => {
    const { cache, activeCacheWrites } = await createTestCache('post-coalesce-iso');
    const config: ProxySiteConfig = { methods: ['POST'] };
    
    // 模拟慢速请求
    const mockFetcher = vi.fn().mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 50));
      return new Response('ok', { headers: { 'Cache-Control': 'public, max-age=3600' } });
    });

    const req1 = new Request('https://api.com/post', { method: 'POST', body: JSON.stringify({ id: 1 }) });
    const req2 = new Request('https://api.com/post', { method: 'POST', body: JSON.stringify({ id: 2 }) });

    // 同时发起两个不同 Body 的请求
    const p1 = fetchWithCache(req1, mockFetcher, { cache, config, activeCacheWrites });
    const p2 = fetchWithCache(req2, mockFetcher, { cache, config, activeCacheWrites });

    const [r1, r2] = await Promise.all([p1, p2]);
    
    expect(r1.headers.get('x-proxy-cache')).toBe('MISS');
    expect(r2.headers.get('x-proxy-cache')).toBe('MISS');
    // 关键：虽然 URL 相同且并发，但 Body 不同，必须发起两次 fetcher 调用
    expect(mockFetcher).toHaveBeenCalledTimes(2);
  });

  it('规则中的 method 应该严格匹配', async () => {
    const { cache, activeCacheWrites } = await createTestCache('method-strict');
    const config: ProxySiteConfig = { 
      methods: ['GET', 'POST'],
      rules: [
        { methods: ['POST'], path: '/api' } // 仅对 /api 的 POST 进行缓存
      ]
    };
    
    const mockFetcher = vi.fn().mockImplementation(async () => new Response('ok', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    // 1. /api 的 POST -> 应匹配并缓存
    const res1 = await fetchWithCache(new Request('https://api.com/api', { method: 'POST' }), mockFetcher, { cache, config, activeCacheWrites });
    expect(res1.headers.get('x-proxy-cache')).toBe('MISS');

    // 2. /api 的 GET -> 虽然路径匹配，但方法不匹配，不应缓存
    const res2 = await fetchWithCache(new Request('https://api.com/api', { method: 'GET' }), mockFetcher, { cache, config, activeCacheWrites });
    expect(res2.headers.get('x-proxy-cache')).toBeNull();
  });

  it('应该支持空 Body 的 POST', async () => {
    const { cache, activeCacheWrites } = await createTestCache('empty-post');
    const config: ProxySiteConfig = { methods: ['POST'] };
    
    const mockFetcher = vi.fn().mockImplementation(async () => new Response('ok', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    const req = new Request('https://api.com/post', { method: 'POST' }); // 无 Body
    
    const res1 = await fetchWithCache(req.clone(), mockFetcher, { cache, config, activeCacheWrites });
    expect(res1.headers.get('x-proxy-cache')).toBe('MISS');
    await res1.text();
    await Promise.all(activeCacheWrites.values());

    const res2 = await fetchWithCache(req.clone(), mockFetcher, { cache, config, activeCacheWrites });
    expect(res2.headers.get('x-proxy-cache')).toBe('HIT');
  });

  it('Content-Type 包含额外参数时也应正确识别为 JSON', async () => {
    const { cache, activeCacheWrites } = await createTestCache('json-charset');
    const config: ProxySiteConfig = { 
      methods: ['POST'],
      body: { match: { id: true } }
    };
    
    const mockFetcher = vi.fn().mockImplementation(async () => new Response('ok', {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    }));

    const req = new Request('https://api.com/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ id: 1, dynamic: Math.random() })
    });

    const res1 = await fetchWithCache(req.clone(), mockFetcher, { cache, config, activeCacheWrites });
    await res1.text();
    await Promise.all(activeCacheWrites.values());

    // 再次请求，如果 Content-Type 识别正确，则会应用 body 过滤并命中缓存
    const res2 = await fetchWithCache(req.clone(), mockFetcher, { cache, config, activeCacheWrites });
    expect(res2.headers.get('x-proxy-cache')).toBe('HIT');
  });
});
