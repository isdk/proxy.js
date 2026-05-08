import { describe, it, expect } from 'vitest';
import { isMatch, isGlob } from './matcher';

describe('isGlob', () => {
  it('应该正确识别 Glob 模式', () => {
    expect(isGlob('*.json')).toBe(true);
    expect(isGlob('/api/**/*.ts')).toBe(true);
    expect(isGlob('file-{a,b}.txt')).toBe(true);
  });

  it('应该正确识别非 Glob 字符串', () => {
    expect(isGlob('exact-match')).toBe(false);
    expect(isGlob('/api/v1/users')).toBe(false);
  });
});

describe('isMatch', () => {
  describe('RegExp 对象', () => {
    it('应该正确匹配正则表达式', () => {
      expect(isMatch(/^\/api\/v[12]\//, '/api/v1/users')).toBe(true);
      expect(isMatch(/^\/api\/v[12]\//, '/api/v3/users')).toBe(false);
    });

    it('应该支持带标志位的正则', () => {
      expect(isMatch(/^hello/i, 'HELLO')).toBe(true);
      expect(isMatch(/^hello/i, 'hello')).toBe(true);
    });
  });

  describe('正则字符串', () => {
    it('应该支持字符串形式的正则表达式', () => {
      expect(isMatch('/^\\/api\\/v[12]\\//', '/api/v1/users')).toBe(true);
      expect(isMatch('/^\\/api\\/v[12]\\//', '/api/v3/users')).toBe(false);
    });

    it('应该支持带标志位的正则字符串', () => {
      expect(isMatch('/^hello/i', 'HELLO')).toBe(true);
      expect(isMatch('/^hello/gi', 'Hello hello')).toBe(true);
    });
  });

  describe('Glob 模式', () => {
    it('应该支持基本通配符', () => {
      expect(isGlob('*.json')).toBe(true);
      expect(isMatch('*.json', 'test.json')).toBe(true);
      expect(isMatch('*.json', 'test.txt')).toBe(false);
    });

    it('应该支持路径 Glob', () => {
      expect(isMatch('/api/**/*.json', '/api/v1/users.json')).toBe(true);
      expect(isMatch('/api/**/*.json', '/api/v1/private/data.json')).toBe(true);
      expect(isMatch('/api/**/*.json', '/api/v1/users.txt')).toBe(false);
    });

    it('应该支持否定模式 !', () => {
      expect(isMatch('!/private/**', '/public/data')).toBe(true);
      expect(isMatch('!/private/**', '/private/data')).toBe(false);
    });
  });

  describe('数组模式 (多模式 OR)', () => {
    it('应该支持多个正向模式', () => {
      expect(isMatch(['/api/v1/*', '/api/v2/*'], '/api/v1/users')).toBe(true);
      expect(isMatch(['/api/v1/*', '/api/v2/*'], '/api/v2/users')).toBe(true);
      expect(isMatch(['/api/v1/*', '/api/v2/*'], '/api/v3/users')).toBe(false);
    });

    it('应该支持否定模式在数组中', () => {
      // 匹配 /api/** 但排除 /api/private/**
      expect(isMatch(['!/api/private/**', '/api/**'], '/api/public/data')).toBe(true);
      expect(isMatch(['!/api/private/**', '/api/**'], '/api/private/data')).toBe(false);
    });

    it('否定模式优先级高于正向模式', () => {
      // 即使前面有 /api/**，private 也应该被排除
      expect(isMatch(['/api/**', '!/api/private/**'], '/api/private/secret')).toBe(false);
      expect(isMatch(['/api/**', '!/api/private/**'], '/api/public/data')).toBe(true);
    });

    it('只有否定模式时，无匹配则视为通过', () => {
      // 只有排除项，没有正向项，且没有被排除
      expect(isMatch(['!/api/private/**'], '/api/public/data')).toBe(true);
      expect(isMatch(['!/api/private/**'], '/api/private/data')).toBe(false);
    });

    it('空数组应视为不匹配', () => {
      expect(isMatch([], '/api/users')).toBe(false);
    });
  });

  describe('usePrefix 参数', () => {
    it('默认精确匹配', () => {
      expect(isMatch('hello', 'hello world')).toBe(false);
      expect(isMatch('hello', 'hello')).toBe(true);
    });

    it('usePrefix=true 时启用前缀匹配', () => {
      expect(isMatch('hello', 'hello world', true)).toBe(true);
      expect(isMatch('hello', 'world', true)).toBe(false);
    });
  });

  describe('边界情况', () => {
    it('应该处理空字符串', () => {
      expect(isMatch('', '')).toBe(true);
      expect(isMatch('', 'something', true)).toBe(true);
    });

    it('应该返回非布尔值的 false', () => {
      expect(isMatch(null as any, 'test')).toBe(false);
      expect(isMatch(undefined as any, 'test')).toBe(false);
    });
  });
});
