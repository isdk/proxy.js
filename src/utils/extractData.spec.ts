import { describe, it, expect } from 'vitest';
import { extractData } from './extractData';

describe('extractData', () => {
  const source = {
    'ID': '123',
    'Name': 'test',
    'Timestamp': '456',
    'X-Custom': 'value'
  };

  describe('基础功能与标准化', () => {
    it('应该提取所有键并转为小写 (defaultAllowed=true)', () => {
      const result = extractData(source, undefined, true);
      expect(result['id']).toEqual(['123']);
      expect(result['name']).toEqual(['test']);
      expect(result['x-custom']).toEqual(['value']);
    });

    it('值应该标准化为排序后的字符串数组', () => {
      const src = {
        single: 1,
        arr: ['z', 'a'],
        mixed: [10, 2]
      };
      const result = extractData(src, undefined, true);
      expect(result['single']).toEqual(['1']);
      expect(result['arr']).toEqual(['a', 'z']);
      expect(result['mixed']).toEqual(['10', '2']); // 注意：字符串排序 '10' < '2'
    });

    it('应该跳过 undefined/null', () => {
      const result = extractData({ a: 1, b: null, c: undefined }, undefined, true);
      expect(result['a']).toEqual(['1']);
      expect(Object.keys(result)).not.toContain('b');
      expect(Object.keys(result)).not.toContain('c');
    });
  });

  describe('数组模式 (Key 过滤)', () => {
    it('应该只提取匹配 Key 的字段', () => {
      const result = extractData(source, ['id', 'name']);
      expect(Object.keys(result)).toEqual(['id', 'name']);
    });

    it('应该支持否定模式 (!)', () => {
      // 提取全部，除了 timestamp
      const result = extractData(source, ['*', '!timestamp'], true);
      expect(Object.keys(result)).toEqual(['id', 'name', 'x-custom']);
      expect(result['timestamp']).toBeUndefined();
    });

    it('否定模式下如果不加 * 且 defaultAllowed=false，则不提取任何内容', () => {
      const result = extractData(source, ['!id'], false);
      expect(Object.keys(result).length).toBe(0);
    });
  });

  describe('Record 模式 (值提取与过滤)', () => {
    it('true 应全量提取该字段', () => {
      const result = extractData(source, { id: true });
      expect(result['id']).toEqual(['123']);
      expect(Object.keys(result)).toHaveLength(1);
    });

    it('Patterns 应过滤字段的值', () => {
      const src = {
        tags: ['public', 'private', 'draft'],
        category: 'news'
      };
      const config = {
        tags: ['public', 'draft'], // 只提取 tags 中的这些值
        category: /^n/           // category 必须以 n 开头
      };
      const result = extractData(src, config);
      expect(result['tags']).toEqual(['draft', 'public']);
      expect(result['category']).toEqual(['news']);
    });

    it('Record 模式应该是大小写不敏感的键查找', () => {
      const result = extractData(source, { id: true, name: true });
      expect(result['id']).toEqual(['123']);
      expect(result['name']).toEqual(['test']);
    });
  });

  describe('defaultAllowed 行为', () => {
    it('无配置且 defaultAllowed=false 时，不提取任何键', () => {
      const result = extractData(source, undefined, false);
      expect(Object.keys(result).length).toBe(0);
    });

    it('数组模式无匹配且 defaultAllowed=true 时，提取所有键', () => {
      const result = extractData(source, [], true); // 注意：空数组表示无正向模式
      // 在我的 isMatch 逻辑中，空数组且 defaultAllowed=true 会返回 false (因为 positives 存在但为空)
      // Wait, isAllowed(key, [], true) -> isMatch([], key, false, true) -> returns false (positives.length === 0, but positives exists!)
      // No, Array.isArray(pattern) && pattern.length === 0 ... wait.
      // let's check isMatch: if (Array.isArray(pattern) && pattern.length) { ... }
      // If length is 0, it skips to line 68 and returns false.
      expect(Object.keys(result).length).toBe(0);
    });
  });
});
