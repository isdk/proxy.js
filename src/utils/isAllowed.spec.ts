import { describe, it, expect } from 'vitest';
import { isAllowed } from './isAllowed';
import { KeyFilterConfig } from '../types';

describe('isAllowed', () => {
  describe('无配置时', () => {
    it('无配置且无 defaultAllowed 时，返回 undefined (falsy)', () => {
      expect(isAllowed('any-key')).toBeFalsy();
      expect(isAllowed('another-key')).toBeFalsy();
    });

    it('空配置且无 defaultAllowed 时，返回 undefined (falsy)', () => {
      expect(isAllowed('key', {})).toBeFalsy();
    });

    it('defaultAllowed=true 应该允许所有键', () => {
      expect(isAllowed('any-key', undefined, true)).toBe(true);
      expect(isAllowed('another-key', {}, true)).toBe(true);
    });

    it('defaultAllowed=false 应该拒绝所有键', () => {
      expect(isAllowed('any-key', undefined, false)).toBe(false);
      expect(isAllowed('key', {}, false)).toBe(false);
    });

    it('include 白名单应该覆盖 defaultAllowed=false', () => {
      const config: KeyFilterConfig = {
        include: ['allowed-key'],
        exclude: []
      };
      expect(isAllowed('allowed-key', config, false)).toBe(true);
      expect(isAllowed('other-key', config, false)).toBe(false);
    });

    it('exclude 黑名单应该覆盖 defaultAllowed=true', () => {
      const config: KeyFilterConfig = {
        exclude: ['blocked-key']
      };
      expect(isAllowed('blocked-key', config, true)).toBe(false);
      // 没有 include 且不在 exclude 中，使用 defaultAllowed=true
      expect(isAllowed('other-key', config, true)).toBe(true);
    });
  });

  describe('include 白名单模式', () => {
    it('应该只允许白名单中的键', () => {
      const config: KeyFilterConfig = {
        include: ['id', 'name']
      };
      expect(isAllowed('id', config)).toBe(true);
      expect(isAllowed('name', config)).toBe(true);
      expect(isAllowed('email', config)).toBe(false);
    });

    it('应该支持正则表达式', () => {
      const config: KeyFilterConfig = {
        include: [/^utm_/, 'timestamp']
      };
      expect(isAllowed('utm_source', config)).toBe(true);
      expect(isAllowed('utm_campaign', config)).toBe(true);
      expect(isAllowed('timestamp', config)).toBe(true);
      expect(isAllowed('other', config)).toBe(false);
    });

    it('应该支持 Glob 模式', () => {
      const config: KeyFilterConfig = {
        include: ['x-*', 'authorization']
      };
      expect(isAllowed('x-custom-header', config)).toBe(true);
      expect(isAllowed('authorization', config)).toBe(true);
      expect(isAllowed('content-type', config)).toBe(false);
    });

    it('正则和字符串混用', () => {
      const config: KeyFilterConfig = {
        include: [/^x-/, 'authorization', 'content-*']
      };
      expect(isAllowed('x-request-id', config)).toBe(true);
      expect(isAllowed('authorization', config)).toBe(true);
      expect(isAllowed('content-type', config)).toBe(true);
      expect(isAllowed('other', config)).toBe(false);
    });
  });

  describe('exclude 黑名单模式', () => {
    it('应该排除黑名单中的键', () => {
      const config: KeyFilterConfig = {
        exclude: ['timestamp', 'nonce']
      };
      // 没有 include 且不在 exclude 中，返回 undefined (falsy)
      expect(isAllowed('id', config)).toBeFalsy();
      expect(isAllowed('name', config)).toBeFalsy();
      expect(isAllowed('timestamp', config)).toBe(false);
      expect(isAllowed('nonce', config)).toBe(false);
    });

    it('应该支持正则表达式', () => {
      const config: KeyFilterConfig = {
        exclude: [/^_/, /^x-.*-id$/]
      };
      expect(isAllowed('_private', config)).toBe(false);
      expect(isAllowed('x-session-id', config)).toBe(false);
      // 没有 include 且不在 exclude 中，返回 undefined (falsy)
      expect(isAllowed('data', config)).toBeFalsy();
    });

    it('应该支持 Glob 模式', () => {
      const config: KeyFilterConfig = {
        exclude: ['x-dynamic-*', 'session_*']
      };
      expect(isAllowed('x-dynamic-123', config)).toBe(false);
      expect(isAllowed('session_token', config)).toBe(false);
      // 没有 include 且不在 exclude 中，返回 undefined (falsy)
      expect(isAllowed('user_id', config)).toBeFalsy();
    });
  });

  describe('include 和 exclude 同时存在', () => {
    it('exclude 优先级高于 include：命中即排除', () => {
      const config: KeyFilterConfig = {
        include: ['*'], // 全部包含
        exclude: ['password'] // 但排除密码
      };
      expect(isAllowed('id', config)).toBe(true);
      expect(isAllowed('password', config)).toBe(false);
    });

    it('include 部分键，exclude 排除其中的某些键', () => {
      const config: KeyFilterConfig = {
        include: ['id', 'name', 'password'],
        exclude: ['password']
      };
      expect(isAllowed('id', config)).toBe(true);
      expect(isAllowed('name', config)).toBe(true);
      // password 在 include 中，但被 exclude 排除
      expect(isAllowed('password', config)).toBe(false);
    });

    it('include 为空时，exclude 排除命中的键', () => {
      const config: KeyFilterConfig = {
        include: [],
        exclude: ['id']
      };
      expect(isAllowed('id', config)).toBe(false);
      // other 不在 exclude 中，但也不在 include 中，返回 undefined (falsy)
      expect(isAllowed('other', config)).toBeFalsy();
    });

    it('include 为空数组时，result=false，不会使用 defaultAllowed', () => {
      const config: KeyFilterConfig = {
        include: [],
        exclude: ['blocked']
      };
      // include 存在（即使为空），result 被设为 false，defaultAllowed 不生效
      expect(isAllowed('blocked', config, true)).toBe(false);
      expect(isAllowed('other', config, true)).toBe(false);
    });

    it('exclude 正则与 include 正则同时匹配时，exclude 胜出', () => {
      const config: KeyFilterConfig = {
        include: [/^x-/],
        exclude: [/^x-dynamic/]
      };
      expect(isAllowed('x-static-header', config)).toBe(true);
      expect(isAllowed('x-dynamic-id', config)).toBe(false);
    });
  });

  describe('边界情况', () => {
    it('应该处理空数组', () => {
      expect(isAllowed('key', { include: [] })).toBe(false);
      expect(isAllowed('key', { exclude: [] })).toBeFalsy();
    });
  });
});
