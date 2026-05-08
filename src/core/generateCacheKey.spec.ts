import { describe, it, expect } from 'vitest';
import { generateCacheKey } from './generateCacheKey';
import { SiteCacheConfig } from '../types';

describe('generateCacheKey', () => {
  const defaultConfig: SiteCacheConfig = {};

  it('相同请求应该生成相同的 Key', async () => {
    const req1 = new Request('https://example.com/api?a=1', {
      headers: { 'X-Test': 'val', 'Cookie': 'id=123' }
    });
    const req2 = new Request('https://example.com/api?a=1', {
      headers: { 'X-Test': 'val', 'Cookie': 'id=123' }
    });

    expect(await generateCacheKey(req1, defaultConfig)).toBe(await generateCacheKey(req2, defaultConfig));
  });

  it('Query 参数过滤应该生效', async () => {
    const config: SiteCacheConfig = {
      query: { include: ['id'] } // 只包含 id，忽略其他
    };
    
    const req1 = new Request('https://example.com/api?id=1&token=ignore_me');
    const req2 = new Request('https://example.com/api?id=1&token=another_token');

    expect(await generateCacheKey(req1, config)).toBe(await generateCacheKey(req2, config));
  });

  it('Headers 过滤应该生效', async () => {
    const config: SiteCacheConfig = {
      headers: { exclude: ['user-agent'] } // 排除 UA
    };

    const req1 = new Request('https://example.com/', { headers: { 'User-Agent': 'Chrome' } });
    const req2 = new Request('https://example.com/', { headers: { 'User-Agent': 'Firefox' } });

    expect(await generateCacheKey(req1, config)).toBe(await generateCacheKey(req2, config));
  });

  it('Cookies 过滤应该生效', async () => {
    const config: SiteCacheConfig = {
      cookies: { include: ['session'] }
    };

    const req1 = new Request('https://example.com/', { headers: { 'Cookie': 'session=abc; track=123' } });
    const req2 = new Request('https://example.com/', { headers: { 'Cookie': 'session=abc; track=456' } });

    expect(await generateCacheKey(req1, config)).toBe(await generateCacheKey(req2, config));
  });

  it('Method 不同应该生成不同的 Key', async () => {
    const req1 = new Request('https://example.com/', { method: 'GET' });
    const req2 = new Request('https://example.com/', { method: 'POST' });

    expect(await generateCacheKey(req1, defaultConfig)).not.toBe(await generateCacheKey(req2, defaultConfig));
  });

  it('相同 Body 的 POST 应该生成相同的 Key', async () => {
    const config: SiteCacheConfig = { methods: ['POST'] };
    const body = JSON.stringify({ a: 1 });
    const req1 = new Request('https://example.com/', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body 
    });
    const req2 = new Request('https://example.com/', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body 
    });

    expect(await generateCacheKey(req1, config)).toBe(await generateCacheKey(req2, config));
  });

  it('不同 Body 的 POST 应该生成不同的 Key', async () => {
    const config: SiteCacheConfig = { methods: ['POST'] };
    const req1 = new Request('https://example.com/', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: 1 })
    });
    const req2 = new Request('https://example.com/', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: 2 })
    });

    expect(await generateCacheKey(req1, config)).not.toBe(await generateCacheKey(req2, config));
  });

  it('Body 过滤应该生效', async () => {
    const config: SiteCacheConfig = { 
      methods: ['POST'],
      body: { include: ['id'] }
    };
    const req1 = new Request('https://example.com/', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 1, ts: 123 })
    });
    const req2 = new Request('https://example.com/', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 1, ts: 456 })
    });

    expect(await generateCacheKey(req1, config)).toBe(await generateCacheKey(req2, config));
  });

  // ========== 新增测试：正则/Glob 模式匹配 ==========

  it('Query 正则排除应该生效', async () => {
    const config: SiteCacheConfig = {
      query: { exclude: [/^utm_/, /^_/] }
    };

    const req1 = new Request('https://example.com/?id=1&utm_source=google&utm_campaign=test');
    const req2 = new Request('https://example.com/?id=1&utm_source=twitter&utm_campaign=other');

    expect(await generateCacheKey(req1, config)).toBe(await generateCacheKey(req2, config));
  });

  it('Headers Glob 排除应该生效', async () => {
    const config: SiteCacheConfig = {
      headers: { exclude: ['x-dynamic-*'] }
    };

    const req1 = new Request('https://example.com/', { headers: { 'x-dynamic-id': '123' } });
    const req2 = new Request('https://example.com/', { headers: { 'x-dynamic-id': '456' } });

    expect(await generateCacheKey(req1, config)).toBe(await generateCacheKey(req2, config));
  });

  it('应该默认排除 cookie header', async () => {
    const config: SiteCacheConfig = {};

    const req1 = new Request('https://example.com/', { headers: { 'cookie': 'session=abc' } });
    const req2 = new Request('https://example.com/', { headers: { 'cookie': 'session=xyz' } });

    expect(await generateCacheKey(req1, config)).toBe(await generateCacheKey(req2, config));
  });

  it('非 JSON body 正则提取应该生效', async () => {
    const config: SiteCacheConfig = {
      methods: ['POST'],
      body: {
        extract: /op=([^&]+)&id=([^&]+)/
      }
    };

    const req1 = new Request('https://example.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'op=get&id=1&nonce=abc'
    });
    const req2 = new Request('https://example.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'op=get&id=1&nonce=xyz'
    });

    expect(await generateCacheKey(req1, config)).toBe(await generateCacheKey(req2, config));
  });

  it('多捕获组应该用冒号拼接', async () => {
    const config: SiteCacheConfig = {
      methods: ['POST'],
      body: {
        extract: /action=([^&]+).*?id=([^&]+)/
      }
    };

    const req1 = new Request('https://example.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'action=upload&other=foo&id=99'
    });
    const req2 = new Request('https://example.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'action=upload&id=99&other=bar'
    });

    expect(await generateCacheKey(req1, config)).toBe(await generateCacheKey(req2, config));
  });

  it('捕获组排序应该消除顺序差异', async () => {
    const config: SiteCacheConfig = {
      methods: ['POST'],
      body: {
        extract: /(?:op|id)=([^&]+).*(?:op|id)=([^&]+)/,
        sort: true
      }
    };

    const req1 = new Request('https://example.com/', {
      method: 'POST',
      body: 'op=get&id=1'
    });
    const req2 = new Request('https://example.com/', {
      method: 'POST',
      body: 'id=1&op=get'
    });

    expect(await generateCacheKey(req1, config)).toBe(await generateCacheKey(req2, config));
  });

  it('不同 URL 应该生成不同的 Key', async () => {
    const req1 = new Request('https://example.com/api?a=1');
    const req2 = new Request('https://example.com/api?a=2');

    expect(await generateCacheKey(req1, defaultConfig)).not.toBe(await generateCacheKey(req2, defaultConfig));
  });

  it('不同 Host 应该生成不同的 Key', async () => {
    const req1 = new Request('https://api.example.com/');
    const req2 = new Request('https://api.other.com/');

    expect(await generateCacheKey(req1, defaultConfig)).not.toBe(await generateCacheKey(req2, defaultConfig));
  });

  it('不同 Pathname 应该生成不同的 Key', async () => {
    const req1 = new Request('https://example.com/api/v1');
    const req2 = new Request('https://example.com/api/v2');

    expect(await generateCacheKey(req1, defaultConfig)).not.toBe(await generateCacheKey(req2, defaultConfig));
  });

  it('应该生成 64 位十六进制哈希', async () => {
    const req = new Request('https://example.com/api');
    const key = await generateCacheKey(req, defaultConfig);

    expect(key).toMatch(/^[a-f0-9]{64}$/);
  });
});
