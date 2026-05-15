import { describe, it, expect } from 'vitest';
import { isCacheable } from './isCacheable';
import type { ProxySiteConfig } from '../types';

describe('isCacheable Advanced Matching', () => {
  describe('Cookie Matching (Gatekeeping)', () => {
    it('模式匹配 (MatchPatterns): ["*"] 应要求至少存在一个 Cookie', async () => {
      const config: ProxySiteConfig = {
        rules: [{ cookies: ['*'] }]
      };

      // 有 Cookie
      const req1 = new Request('https://api.com/', { headers: { 'cookie': 'a=1' } });
      expect(await isCacheable(req1, config)).toBeTruthy();

      // 无 Cookie
      const req2 = new Request('https://api.com/');
      expect(await isCacheable(req2, config)).toBeFalsy();
    });

    it('模式匹配 (MatchPatterns): ["*", "!sid"] 应要求存在非 sid 的 Cookie', async () => {
      const config: ProxySiteConfig = {
        rules: [{ cookies: ['*', '!sid'] }]
      };

      // 只有 sid -> 拦截
      const req1 = new Request('https://api.com/', { headers: { 'cookie': 'sid=123' } });
      expect(await isCacheable(req1, config)).toBeFalsy();

      // 有 sid 和 lang -> 通过
      const req2 = new Request('https://api.com/', { headers: { 'cookie': 'sid=123; lang=zh' } });
      expect(await isCacheable(req2, config)).toBeTruthy();

      // 无 Cookie -> 拦截
      const req3 = new Request('https://api.com/');
      expect(await isCacheable(req3, config)).toBeFalsy();
    });

    it('对象模式 (Record): { sid: false } 应允许无 sid 的请求（包含无 Cookie）', async () => {
      const config: ProxySiteConfig = {
        rules: [{ cookies: { sid: false } }]
      };

      // 无 Cookie -> 通过
      const req1 = new Request('https://api.com/');
      expect(await isCacheable(req1, config)).toBeTruthy();

      // 有 lang 无 sid -> 通过
      const req2 = new Request('https://api.com/', { headers: { 'cookie': 'lang=zh' } });
      expect(await isCacheable(req2, config)).toBeTruthy();

      // 有 sid -> 拦截
      const req3 = new Request('https://api.com/', { headers: { 'cookie': 'sid=123' } });
      expect(await isCacheable(req3, config)).toBeFalsy();
    });

    it('对象模式 (Record): { sid: true } 应强制要求 sid 存在', async () => {
      const config: ProxySiteConfig = {
        rules: [{ cookies: { sid: true } }]
      };

      // 有 sid -> 通过
      const req1 = new Request('https://api.com/', { headers: { 'cookie': 'sid=123' } });
      expect(await isCacheable(req1, config)).toBeTruthy();

      // 无 sid -> 拦截
      const req2 = new Request('https://api.com/', { headers: { 'cookie': 'lang=zh' } });
      expect(await isCacheable(req2, config)).toBeFalsy();
    });
  });

  describe('Boundary Conditions & Defaults', () => {
    it('Query 默认行为: query: ["*"] 在无参数请求下应通过', async () => {
      const config: ProxySiteConfig = {
        rules: [{ query: ['*'] }]
      };
      // 虽然无参数，但 query 默认 defaultAllowed = true
      const req = new Request('https://api.com/');
      expect(await isCacheable(req, config)).toBeTruthy();
    });

    it('空集合边界: cookies: [] 应拦截所有请求', async () => {
      const config: ProxySiteConfig = {
        rules: [{ cookies: [] }]
      };
      const req = new Request('https://api.com/', { headers: { 'cookie': 'a=1' } });
      expect(await isCacheable(req, config)).toBeFalsy();
    });

    it('空对象边界: cookies: {} 应通过所有请求', async () => {
      const config: ProxySiteConfig = {
        rules: [{ cookies: {} }]
      };
      const req1 = new Request('https://api.com/', { headers: { 'cookie': 'a=1' } });
      const req2 = new Request('https://api.com/');
      expect(await isCacheable(req1, config)).toBeTruthy();
      expect(await isCacheable(req2, config)).toBeTruthy();
    });
  });

  describe('Body Matching (Gatekeeping)', () => {
    it('JSON Body: 应使用 match 字段进行字段级或 Key 级门控', async () => {
      const config: ProxySiteConfig = {
        methods: ['POST'], // 必须显式允许 POST
        rules: [{
          body: {
            type: 'json',
            match: { id: true } // 必须有 id 字段
          }
        }]
      };

      // 有 id -> 通过
      const req1 = new Request('https://api.com/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: 1, name: 'test' })
      });
      expect(await isCacheable(req1, config)).toBeTruthy();

      // 无 id -> 拦截
      const req2 = new Request('https://api.com/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'test' })
      });
      expect(await isCacheable(req2, config)).toBeFalsy();
    });

    it('Text Body: 应使用 match 字段进行正则/通配符匹配', async () => {
      const config: ProxySiteConfig = {
        methods: ['POST'],
        rules: [{
          body: {
            type: 'text',
            match: '*success*' // 必须包含 success
          }
        }]
      };

      const req1 = new Request('https://api.com/', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: 'operation success'
      });
      expect(await isCacheable(req1, config)).toBeTruthy();

      const req2 = new Request('https://api.com/', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: 'operation failed'
      });
      expect(await isCacheable(req2, config)).toBeFalsy();
    });

    it('Text Body: 如果 match 配置了对象模式，应视为不匹配', async () => {
      const config: ProxySiteConfig = {
        methods: ['POST'],
        rules: [{
          body: {
            type: 'text',
            match: { id: true } as any // 错误配置
          }
        }]
      };

      const req = new Request('https://api.com/', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: 'id: 1'
      });
      expect(await isCacheable(req, config)).toBeFalsy();
    });

    it('门控阶段不应再使用 extract 字段', async () => {
      const config: ProxySiteConfig = {
        methods: ['POST'],
        rules: [{
          body: {
            type: 'text',
            // match 缺失，虽然有 extract 但不应作为门控准则
            extract: 'success' 
          }
        }]
      };

      const req = new Request('https://api.com/', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: 'failure'
      });
      // 因为 match 缺失，默认放行（门控不拦截）
      expect(await isCacheable(req, config)).toBeTruthy();
    });
  });
});
