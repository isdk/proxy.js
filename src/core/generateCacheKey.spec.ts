import { describe, it, expect } from 'vitest';
import { generateCacheKey } from './generateCacheKey';
import { SiteCacheConfig } from '../types';

describe('generateCacheKey', () => {
  const defaultConfig: SiteCacheConfig = {};

  it('相同请求应该生成相同的 Key', () => {
    const req1 = new Request('https://example.com/api?a=1', {
      headers: { 'X-Test': 'val', 'Cookie': 'id=123' }
    });
    const req2 = new Request('https://example.com/api?a=1', {
      headers: { 'X-Test': 'val', 'Cookie': 'id=123' }
    });

    expect(generateCacheKey(req1, defaultConfig)).toBe(generateCacheKey(req2, defaultConfig));
  });

  it('Query 参数过滤应该生效', () => {
    const config: SiteCacheConfig = {
      query: { include: ['id'] } // 只包含 id，忽略其他
    };
    
    const req1 = new Request('https://example.com/api?id=1&token=ignore_me');
    const req2 = new Request('https://example.com/api?id=1&token=another_token');

    expect(generateCacheKey(req1, config)).toBe(generateCacheKey(req2, config));
  });

  it('Headers 过滤应该生效', () => {
    const config: SiteCacheConfig = {
      headers: { exclude: ['user-agent'] } // 排除 UA
    };

    const req1 = new Request('https://example.com/', { headers: { 'User-Agent': 'Chrome' } });
    const req2 = new Request('https://example.com/', { headers: { 'User-Agent': 'Firefox' } });

    expect(generateCacheKey(req1, config)).toBe(generateCacheKey(req2, config));
  });

  it('Cookies 过滤应该生效', () => {
    const config: SiteCacheConfig = {
      cookies: { include: ['session'] }
    };

    const req1 = new Request('https://example.com/', { headers: { 'Cookie': 'session=abc; track=123' } });
    const req2 = new Request('https://example.com/', { headers: { 'Cookie': 'session=abc; track=456' } });

    expect(generateCacheKey(req1, config)).toBe(generateCacheKey(req2, config));
  });

  it('Method 不同应该生成不同的 Key', () => {
    const req1 = new Request('https://example.com/', { method: 'GET' });
    const req2 = new Request('https://example.com/', { method: 'POST' });

    expect(generateCacheKey(req1, defaultConfig)).not.toBe(generateCacheKey(req2, defaultConfig));
  });
});
