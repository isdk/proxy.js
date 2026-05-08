import { describe, it, expect } from 'vitest';
import { extractData } from './extractData';
import { KeyFilterConfig } from '../types';

describe('extractData', () => {
  const source = {
    'id': '123',
    'name': 'test',
    'timestamp': '456',
    'x-custom': 'value'
  };

  describe('基础提取', () => {
    it('应该提取所有键（需要传 defaultAllowed=true）', () => {
      const result = extractData(source, undefined, true);
      expect(Object.keys(result)).toContain('id');
      expect(Object.keys(result)).toContain('name');
      expect(Object.keys(result)).toContain('timestamp');
    });

    it('应该将键转换为小写', () => {
      const result = extractData(source, undefined, true);
      expect(result['x-custom']).toEqual(['value']);
      expect(result['id']).toEqual(['123']);
    });

    it('应该将值转换为数组', () => {
      const result = extractData({ key: 'single' }, undefined, true);
      expect(result['key']).toEqual(['single']);

      const result2 = extractData({ key: ['a', 'b'] }, undefined, true);
      expect(result2['key']).toEqual(['a', 'b']);
    });

    it('应该对数组值进行排序', () => {
      const result = extractData({ key: ['z', 'a', 'm'] }, undefined, true);
      expect(result['key']).toEqual(['a', 'm', 'z']);
    });

    it('应该跳过 null/undefined 值', () => {
      const result = extractData({ a: 'valid', b: null, c: undefined }, undefined, true);
      expect(result['a']).toEqual(['valid']);
      expect(result['b']).toBeUndefined();
      expect(result['c']).toBeUndefined();
    });
  });

  describe('include 白名单', () => {
    it('应该只提取白名单中的键', () => {
      const config: KeyFilterConfig = { include: ['id', 'name'] };
      const result = extractData(source, config);
      expect(Object.keys(result)).toEqual(['id', 'name']);
    });

    it('include 空数组应该不提取任何键', () => {
      const config: KeyFilterConfig = { include: [] };
      const result = extractData(source, config);
      expect(Object.keys(result).length).toBe(0);
    });
  });

  describe('exclude 黑名单', () => {
    it('应该排除黑名单中的键（需要 include 或 defaultAllowed）', () => {
      const config: KeyFilterConfig = { exclude: ['timestamp'] };
      // 没有 include 且没有 defaultAllowed，未命中的键返回 undefined，不被提取
      const result = extractData(source, config);
      expect(Object.keys(result).length).toBe(0);
    });

    it('应该支持正则排除（需要 include 或 defaultAllowed）', () => {
      const config: KeyFilterConfig = { exclude: [/^x-/, 'timestamp'] };
      // 没有 include 且没有 defaultAllowed，所有键都不被提取
      const result = extractData(source, config);
      expect(Object.keys(result).length).toBe(0);
    });

    it('应该支持 Glob 排除（需要 include 或 defaultAllowed）', () => {
      const config: KeyFilterConfig = { exclude: ['*timestamp*'] };
      // 没有 include 且没有 defaultAllowed，所有键都不被提取
      const result = extractData(source, config);
      expect(Object.keys(result).length).toBe(0);
    });

    it('有 include=* 时，exclude 排除命中的键', () => {
      const config: KeyFilterConfig = { include: ['*'], exclude: ['timestamp'] };
      const result = extractData(source, config);
      expect(Object.keys(result)).toEqual(['id', 'name', 'x-custom']);
      expect(result['timestamp']).toBeUndefined();
    });

    it('有 defaultAllowed=true 时，exclude 排除命中的键', () => {
      const config: KeyFilterConfig = { exclude: ['timestamp'] };
      const result = extractData(source, config, true);
      expect(Object.keys(result)).toEqual(['id', 'name', 'x-custom']);
      expect(result['timestamp']).toBeUndefined();
    });
  });

  describe('include 和 exclude 同时存在', () => {
    it('exclude 优先级高于 include：命中即排除', () => {
      const config: KeyFilterConfig = {
        include: ['*'], // 全部包含
        exclude: ['timestamp', 'x-custom'] // 但排除这些
      };
      const result = extractData(source, config);
      expect(Object.keys(result)).toEqual(['id', 'name']);
      expect(result['timestamp']).toBeUndefined();
      expect(result['x-custom']).toBeUndefined();
    });

    it('include 部分键，exclude 排除其中的某些键', () => {
      const config: KeyFilterConfig = {
        include: ['id', 'name', 'timestamp'],
        exclude: ['timestamp'] // 排除 timestamp
      };
      const result = extractData(source, config);
      expect(Object.keys(result)).toEqual(['id', 'name']);
      expect(result['timestamp']).toBeUndefined();
    });

    it('include 为空时，exclude 排除命中的键，其他键返回 undefined (falsy)', () => {
      const config: KeyFilterConfig = {
        include: [],
        exclude: ['id']
      };
      const result = extractData(source, config);
      expect(result['id']).toBeUndefined();
      // 其他键不在 exclude 中，但也不在 include 中，isAllowed 返回 undefined (falsy)，不被提取
      expect(result['name']).toBeUndefined();
      expect(Object.keys(result).length).toBe(0);
    });

    it('include 为空数组时，defaultAllowed 不生效，所有键被排除', () => {
      const config: KeyFilterConfig = {
        include: [],
        exclude: ['timestamp']
      };
      // include 存在（即使为空），defaultAllowed 不生效
      const result = extractData(source, config, true);
      expect(Object.keys(result).length).toBe(0);
    });
  });

  describe('defaultAllowed 参数', () => {
    it('无配置且无 defaultAllowed 时，isAllowed 返回 undefined，不提取任何键', () => {
      const result = extractData({ a: '1', b: '2' });
      expect(Object.keys(result).length).toBe(0);
    });

    it('无配置但 defaultAllowed=false 时，不提取任何键', () => {
      const result = extractData({ a: '1', b: '2' }, undefined, false);
      expect(Object.keys(result).length).toBe(0);
    });

    it('无配置但 defaultAllowed=true 时，提取所有键', () => {
      const result = extractData({ a: '1', b: '2' }, undefined, true);
      expect(Object.keys(result)).toEqual(['a', 'b']);
    });

    it('空 include 数组且 defaultAllowed=false 时，不提取任何键', () => {
      const config: KeyFilterConfig = { include: [] };
      const result = extractData(source, config, false);
      expect(Object.keys(result).length).toBe(0);
    });

    it('空 include 数组时 defaultAllowed 不生效，不提取任何键', () => {
      const config: KeyFilterConfig = { include: [] };
      const result = extractData(source, config, true);
      // include 存在（即使为空），result=false，defaultAllowed 不生效
      expect(Object.keys(result).length).toBe(0);
    });

    it('empty exclude 数组且 defaultAllowed=false 时，不提取任何键', () => {
      const config: KeyFilterConfig = { exclude: [] };
      const result = extractData(source, config, false);
      // 空 exclude 不排除任何键，include 也未配置，使用 defaultAllowed=false
      expect(Object.keys(result).length).toBe(0);
    });

    it('exclude 黑名单应该覆盖 defaultAllowed=false', () => {
      const config: KeyFilterConfig = { exclude: ['id'] };
      const result = extractData(source, config, false);
      expect(result['id']).toBeUndefined();
      // 其他键因为 defaultAllowed=false 也不会被提取
      expect(Object.keys(result).length).toBe(0);
    });

    it('include 白名单应该覆盖 defaultAllowed=false', () => {
      const config: KeyFilterConfig = { include: ['id', 'name'] };
      const result = extractData(source, config, false);
      expect(result['id']).toEqual(['123']);
      expect(result['name']).toEqual(['test']);
    });
  });
});
