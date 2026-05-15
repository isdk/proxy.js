import { describe, it, expect, vi } from 'vitest';
import { generateCacheKey } from './generateCacheKey';
import type { ProxySiteConfig } from '../types';

describe('generateCacheKey Body Extraction', () => {
  const mockConfig: ProxySiteConfig = {
    methods: ['POST']
  };

  it('应该支持 JSON Body 的字段过滤提取', async () => {
    const req = new Request('https://api.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 1, secret: 'ignore', data: { x: 1 } })
    });
    
    // 只提取 id 和 data.x (注意：当前 extractData 不支持深层路径，但支持全量提取)
    const config: ProxySiteConfig = {
      ...mockConfig,
      body: { match: { id: true, data: true } }
    };

    const key1 = await generateCacheKey(req, config);
    
    const req2 = new Request('https://api.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 1, secret: 'different', data: { x: 1 } })
    });
    const key2 = await generateCacheKey(req2, config);
    
    expect(key1).toBe(key2); // 因为 secret 被过滤了
  });

  it('应该支持 Text Body 的正则提取', async () => {
    const config: ProxySiteConfig = {
      ...mockConfig,
      body: { 
        type: 'text',
        extract: /user:(\w+)/ 
      }
    };

    const req1 = new Request('https://api.com/', { method: 'POST', body: 'log user:alice' });
    const req2 = new Request('https://api.com/', { method: 'POST', body: 'something user:alice' });
    
    const key1 = await generateCacheKey(req1, config);
    const key2 = await generateCacheKey(req2, config);
    
    expect(key1).toBe(key2);
  });

  it('指纹提取优先级: extract 应优于 match', async () => {
    const siteConfig: ProxySiteConfig = {
      body: {
        type: 'json',
        match: ['token'],  // 门控要求有 token
        extract: ['id']    // 指纹只提取 id
      }
    };

    const req = new Request('https://api.com/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 1, token: 'secret', other: 'omit' })
    });

    const key1 = await generateCacheKey(req, siteConfig);

    // 改变 token (match 字段)，指纹不应变
    const req2 = new Request('https://api.com/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 1, token: 'different', other: 'omit' })
    });
    const key2 = await generateCacheKey(req2, siteConfig);
    expect(key1).toBe(key2);

    // 改变 id (extract 字段)，指纹必须变
    const req3 = new Request('https://api.com/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 2, token: 'secret', other: 'omit' })
    });
    const key3 = await generateCacheKey(req3, siteConfig);
    expect(key1).not.toBe(key3);
  });

  it('JSON Body: extract 应支持对象模式过滤', async () => {
    const siteConfig: ProxySiteConfig = {
      body: {
        type: 'json',
        extract: {
          id: true,
          category: 'A*' // 只提取以 A 开头的 category
        }
      }
    };

    const req = new Request('https://api.com/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 1, category: 'Apple', other: 'omit' })
    });
    const key1 = await generateCacheKey(req, siteConfig);

    const req2 = new Request('https://api.com/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 1, category: 'Banana', other: 'omit' })
    });
    const key2 = await generateCacheKey(req2, siteConfig);

    // Banana 不符合 A*，所以被排除，生成的指纹只剩 {id: 1}，应与原始不同
    expect(key1).not.toBe(key2);
  });

  it('对于 Binary Body 应该返回全量 Hash', async () => {
    const req1 = new Request('https://api.com/', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/octet-stream' },
      body: new Uint8Array([1, 2, 3]) 
    });
    const req2 = new Request('https://api.com/', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/octet-stream' },
      body: new Uint8Array([1, 2, 3]) 
    });
    
    const key1 = await generateCacheKey(req1, mockConfig);
    const key2 = await generateCacheKey(req2, mockConfig);
    
    expect(key1).toBe(key2);
    
    const req3 = new Request('https://api.com/', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/octet-stream' },
      body: new Uint8Array([1, 2, 4]) 
    });
    const key3 = await generateCacheKey(req3, mockConfig);
    expect(key1).not.toBe(key3);
  });

  it('当 Body 格式不匹配时应回退到 Binary Hash', async () => {
    const config: ProxySiteConfig = {
      ...mockConfig,
      body: { type: 'json', match: { id: true } }
    };
    // 强制声明为 json 但实际是文本
    const req = new Request('https://api.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json'
    });
    
    const key = await generateCacheKey(req, config);
    expect(key).toBeDefined(); // 不应该报错
  });
});
