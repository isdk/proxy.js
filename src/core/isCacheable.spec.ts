import { describe, it, expect } from 'vitest';
import { isCacheable } from './isCacheable';
import type { ProxySiteConfig } from '../types';

describe('isCacheable', () => {
  it('默认情况下应允许 GET 和 HEAD', async () => {
    const config: ProxySiteConfig = {};
    expect(await isCacheable(new Request('https://api.com/', { method: 'GET' }), config)).toBe(true);
    expect(await isCacheable(new Request('https://api.com/', { method: 'HEAD' }), config)).toBe(true);
    expect(await isCacheable(new Request('https://api.com/', { method: 'POST' }), config)).toBe(false);
  });

  it('应该支持自定义允许的 methods', async () => {
    const config: ProxySiteConfig = { methods: ['GET', 'POST'] };
    expect(await isCacheable(new Request('https://api.com/', { method: 'POST' }), config)).toBe(true);
    expect(await isCacheable(new Request('https://api.com/', { method: 'PUT' }), config)).toBe(false);
  });

  it('当配置了 cacheRules 时，只有匹配规则的才允许缓存', async () => {
    const config: ProxySiteConfig = {
      rules: [{ path: '/api/*' }]
    };
    expect(await isCacheable(new Request('https://api.com/api/data'), config)).toBe(true);
    expect(await isCacheable(new Request('https://api.com/other'), config)).toBe(false);
  });

  it('cacheRules 中的多项规则应为 OR 逻辑', async () => {
    const config: ProxySiteConfig = {
      rules: [
        { path: '/a' },
        { query: { b: '1' } }
      ]
    };
    expect(await isCacheable(new Request('https://api.com/a'), config)).toBe(true);
    expect(await isCacheable(new Request('https://api.com/any?b=1'), config)).toBe(true);
    expect(await isCacheable(new Request('https://api.com/c'), config)).toBe(false);
  });

  it('单条 cacheRule 内部应为 AND 逻辑', async () => {
    const config: ProxySiteConfig = {
      rules: [
        { path: '/api', query: { v: '1' } }
      ]
    };
    expect(await isCacheable(new Request('https://api.com/api?v=1'), config)).toBe(true);
    expect(await isCacheable(new Request('https://api.com/api'), config)).toBe(false);
    expect(await isCacheable(new Request('https://api.com/other?v=1'), config)).toBe(false);
  });

  it('应正确识别并过滤 bodyType', async () => {
    const config: ProxySiteConfig = {
      methods: ['POST'],
      rules: [{ body: { type: 'json' } }]
    };

    const reqJson = new Request('https://api.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    expect(await isCacheable(reqJson, config)).toBe(true);

    const reqText = new Request('https://api.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }
    });
    expect(await isCacheable(reqText, config)).toBe(false);
  });

  it('body 匹配应遵循 maxLength 限制', async () => {
    const config: ProxySiteConfig = {
      methods: ['POST'],
      body: { maxLength: 5 },
      rules: [{ body: 'hello*' }]
    };

    const req1 = new Request('https://api.com/', { method: 'POST', body: 'hello world' });
    expect(await isCacheable(req1, config)).toBe(true); // "hello" 在前 5 个字节

    const req2 = new Request('https://api.com/', { method: 'POST', body: '0hello' });
    expect(await isCacheable(req2, config)).toBe(false); // "hello" 从第 1 位开始，超出了截取的 5 位范围
  });

  it('即使设置了 cacheRules，不匹配 method 依然应返回 false', async () => {
    const config: ProxySiteConfig = {
      methods: ['GET'],
      rules: [{ path: '/**' }] // 允许所有路径
    };
    // 尽管路径匹配，但 method 是 POST，不在全局允许列表中
    expect(await isCacheable(new Request('https://api.com/', { method: 'POST' }), config)).toBe(false);
  });
});
