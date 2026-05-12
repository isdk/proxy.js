import { describe, it, expect } from 'vitest';
import { getEffectiveConfig, normalizeBodyConfig } from './getEffectiveConfig';
import type { ProxySiteConfig, ProxyCacheRule } from '../types';

describe('getEffectiveConfig', () => {
  it('应该正确合并基础字段 (Rule > Site)', () => {
    const siteConfig: ProxySiteConfig = {
      methods: ['GET'],
      staleIfError: true,
      offline: false
    };
    const rule: ProxyCacheRule = {
      methods: ['POST'],
      offline: true
    };
    const result = getEffectiveConfig(rule, siteConfig);
    expect(result.methods).toEqual(['POST']);
    expect(result.staleIfError).toBe(true);
    expect(result.offline).toBe(true);
  });

  it('应该正确合并 Query 参数 (defaultsDeep)', () => {
    const siteConfig: ProxySiteConfig = {
      query: { a: true, b: false, c: 'foo' }
    };
    const rule: ProxyCacheRule = {
      query: { b: true, d: 'bar' }
    };
    const result = getEffectiveConfig(rule, siteConfig);
    expect(result.query).toEqual({
      a: true,
      b: true, // Rule 覆盖 Site
      c: 'foo',
      d: 'bar'
    });
  });

  describe('Body 配置合并 (特殊处理)', () => {
    it('Rule 为字符串简写时，应保留 Site 的 maxLength', () => {
      const siteConfig: ProxySiteConfig = {
        body: { maxLength: 100, type: 'json' }
      };
      const rule: ProxyCacheRule = {
        body: 'findme'
      };
      const result = getEffectiveConfig(rule, siteConfig);
      expect(result.body).toEqual({
        match: 'findme',
        maxLength: 100,
        type: 'json'
      });
    });

    it('Rule 为正则时，应与 Site 对象合并', () => {
      const siteConfig: ProxySiteConfig = {
        body: { maxLength: 50 }
      };
      const rule: ProxyCacheRule = {
        body: /test/i
      };
      const result = getEffectiveConfig(rule, siteConfig);
      expect(result.body).toEqual({
        match: /test/i,
        maxLength: 50
      });
    });

    it('两个对象形式的 Body 配置应深度合并', () => {
      const siteConfig: ProxySiteConfig = {
        body: { maxLength: 50, match: { id: true } }
      };
      const rule: ProxyCacheRule = {
        body: { match: { name: true } }
      };
      const result = getEffectiveConfig(rule, siteConfig);
      expect(result.body).toEqual({
        maxLength: 50,
        match: {
          id: true,
          name: true
        }
      });
    });
  });

  it('normalizeBodyConfig 边界测试', () => {
    expect(normalizeBodyConfig(null)).toEqual({});
    expect(normalizeBodyConfig('str')).toEqual({ match: 'str' });
    expect(normalizeBodyConfig(['a', 'b'])).toEqual({ match: ['a', 'b'] });
    const regex = /a/;
    expect(normalizeBodyConfig(regex)).toEqual({ match: regex });
    const obj = { type: 'json' };
    expect(normalizeBodyConfig(obj)).toBe(obj);
  });
});
