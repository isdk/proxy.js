import { describe, it, expect } from 'vitest';
import { isAllowed } from './isAllowed';

describe('isAllowed', () => {
  describe('无配置时', () => {
    it('无配置且无 defaultAllowed 时，返回 false', () => {
      expect(isAllowed('any-key')).toBe(false);
    });

    it('defaultAllowed=true 应该允许所有键', () => {
      expect(isAllowed('any-key', undefined, true)).toBe(true);
    });

    it('defaultAllowed=false 应该拒绝所有键', () => {
      expect(isAllowed('any-key', undefined, false)).toBe(false);
    });
  });

  describe('数组模式 (MatchPatterns)', () => {
    it('白名单模式：应该只允许匹配的键', () => {
      const patterns = ['id', 'name'];
      expect(isAllowed('id', patterns)).toBe(true);
      expect(isAllowed('name', patterns)).toBe(true);
      expect(isAllowed('email', patterns)).toBe(false);
    });

    it('应该支持正则表达式', () => {
      const patterns = [/^utm_/, 'timestamp'];
      expect(isAllowed('utm_source', patterns)).toBe(true);
      expect(isAllowed('utm_campaign', patterns)).toBe(true);
      expect(isAllowed('timestamp', patterns)).toBe(true);
      expect(isAllowed('other', patterns)).toBe(false);
    });

    it('应该支持 Glob 模式', () => {
      const patterns = ['x-*', 'authorization'];
      expect(isAllowed('x-custom-header', patterns)).toBe(true);
      expect(isAllowed('authorization', patterns)).toBe(true);
      expect(isAllowed('content-type', patterns)).toBe(false);
    });

    it('否定模式 (黑名单)：使用 ! 排除', () => {
      // '*' 表示匹配所有，'!timestamp' 表示排除 timestamp
      const patterns = ['*', '!timestamp', '!nonce'];
      expect(isAllowed('id', patterns)).toBe(true);
      expect(isAllowed('name', patterns)).toBe(true);
      expect(isAllowed('timestamp', patterns)).toBe(false);
      expect(isAllowed('nonce', patterns)).toBe(false);
    });

    it('否定优先级高于肯定：命中即排除', () => {
      const patterns = ['id', 'name', 'password', '!password'];
      expect(isAllowed('id', patterns)).toBe(true);
      expect(isAllowed('password', patterns)).toBe(false);
    });

    it('只有否定模式时，默认不匹配其余项 (符合 isMatch 逻辑)', () => {
      const patterns = ['!blocked'];
      // isMatch 中，如果没有正向匹配，即使没有命中负向匹配，也会返回 false
      // 如果想要 "除了 blocked 以外全部允许"，必须加上 '*'
      expect(isAllowed('blocked', patterns)).toBe(false);
      expect(isAllowed('other', patterns)).toBe(false);
      
      const patternsWithAll = ['*', '!blocked'];
      expect(isAllowed('other', patternsWithAll)).toBe(true);
    });
  });

  describe('单值模式', () => {
    it('支持字符串', () => {
      expect(isAllowed('id', 'id')).toBe(true);
      expect(isAllowed('name', 'id')).toBe(false);
    });

    it('支持正则表达式', () => {
      expect(isAllowed('utm_source', /^utm_/)).toBe(true);
      expect(isAllowed('other', /^utm_/)).toBe(false);
    });
  });

  describe('边界情况', () => {
    it('空数组应该拒绝所有', () => {
      expect(isAllowed('key', [])).toBe(false);
    });

    it('无效模式类型应返回 false', () => {
      // @ts-ignore
      expect(isAllowed('key', {})).toBe(false);
    });
  });
});
