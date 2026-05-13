import { describe, it, expect } from 'vitest';
import { createResponse, decorateResponseWithUrl } from './createResponse';

describe('createResponse', () => {
  it('应该能创建带有 URL 的 Response 实例', () => {
    const url = 'https://example.com/api/test';
    const res = createResponse('hello', {
      status: 200,
      url
    });

    expect(res.url).toBe(url);
    expect(res.status).toBe(200);
  });

  it('应该能正常 clone 且保留 URL', async () => {
    const url = 'https://example.com/api/clone-test';
    const res = createResponse('original body', {
      status: 201,
      url
    });

    const cloned = res.clone();
    expect(cloned.url).toBe(url);
    expect(cloned.status).toBe(201);
    
    // 验证 body 也能正常读取
    expect(await cloned.text()).toBe('original body');
    expect(await res.text()).toBe('original body');
  });

  it('多次 clone 应该依然保留 URL', async () => {
    const url = 'https://example.com/api/multi-clone';
    const res = createResponse('body', { url });

    const c1 = res.clone();
    const c2 = c1.clone();
    const c3 = c2.clone();

    expect(c1.url).toBe(url);
    expect(c2.url).toBe(url);
    expect(c3.url).toBe(url);
  });

  it('如果没有提供 url，应该按标准行为处理', () => {
    const res = createResponse('hello', { status: 200 });
    // 标准 Response 如果没有 url，通常是空字符串
    expect(res.url).toBe('');
  });

  it('decorateResponseWithUrl 应该能为现有 Response 添加 URL', () => {
    const url = 'https://example.com/decorated';
    const rawRes = new Response('hi');
    const decorated = decorateResponseWithUrl(rawRes, url);
    
    expect(decorated.url).toBe(url);
    const cloned = decorated.clone();
    expect(cloned.url).toBe(url);
  });
});
