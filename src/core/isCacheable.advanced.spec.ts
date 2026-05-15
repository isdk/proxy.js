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
});
