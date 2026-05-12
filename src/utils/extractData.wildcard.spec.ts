import { describe, it, expect } from 'vitest';
import { extractData } from './extractData';

describe('extractData Wildcard & Negation (V8 Logic)', () => {
  const source = {
    'id': '1',
    'name': 'test',
    'token': 'secret',
    'timestamp': '12345'
  };

  it('应该支持 ["*", "!id"] 模式：允许所有但排除 id', () => {
    // 这里 config 是数组，对应 extractData 的 if (Array.isArray(config)) 分支
    const config = ['*', '!id'];
    const result = extractData(source, config, false); // defaultAllowed 设为 false 以确保完全依赖 config

    // 验证逻辑：
    // 1. "id" 应该被排除
    // 2. "name", "token", "timestamp" 应该被保留
    expect(result['id']).toBeUndefined();
    expect(result['name']).toEqual(['test']);
    expect(result['token']).toEqual(['secret']);
    expect(result['timestamp']).toEqual(['12345']);
    expect(Object.keys(result)).toHaveLength(3);
  });

  it('应该支持更复杂的否定组合 ["*", "!token", "!timestamp"]', () => {
    const config = ['*', '!token', '!timestamp'];
    const result = extractData(source, config, false);

    expect(result['id']).toEqual(['1']);
    expect(result['name']).toEqual(['test']);
    expect(result['token']).toBeUndefined();
    expect(result['timestamp']).toBeUndefined();
  });

  it('当没有 "*" 时，["!id"] 模式在 defaultAllowed=false 下应不匹配任何内容', () => {
    // 这是一个关键点：如果没有正向匹配模式，且默认不允许，则全部拒绝
    const config = ['!id'];
    const result = extractData(source, config, false);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('验证大小写敏感性：["*", "!ID"] 应该能过滤掉 "id"', () => {
    const config = ['*', '!ID'];
    const result = extractData(source, config, false);
    expect(result['id']).toBeUndefined();
  });
});
