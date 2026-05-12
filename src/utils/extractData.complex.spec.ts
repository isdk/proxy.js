import { describe, it, expect } from 'vitest';
import { extractData } from './extractData';

describe('extractData Complex Scenarios', () => {
  it('应该正确处理多值 Key 的过滤 (数组模式)', () => {
    const source = {
      'Set-Cookie': ['a=1', 'b=2', 'c=3'],
      'X-Key': 'val'
    };
    // 允许 X-Key 和 Set-Cookie，但否定模式排除 b=2? 
    // 不，数组模式是对 KEY 进行过滤
    const result = extractData(source, ['set-cookie', 'x-key']);
    expect(result['set-cookie']).toEqual(['a=1', 'b=2', 'c=3']);
    expect(result['x-key']).toEqual(['val']);
  });

  it('应该正确处理多值 Key 的字段内过滤 (Record 模式)', () => {
    const source = {
      'tags': ['public', 'private', 'internal', 'draft'],
      'category': 'news'
    };
    const config = {
      // 只提取以 p 开头或为 draft 的标签
      tags: [/^p/, 'draft'],
      category: true
    };
    const result = extractData(source, config);
    expect(result['tags']).toEqual(['draft', 'private', 'public']);
    expect(result['category']).toEqual(['news']);
  });

  it('Record 模式下的 Key 查找应该是大小写不敏感的', () => {
    const source = {
      'Content-Type': 'application/json',
      'X-USER-ID': '123'
    };
    const config = {
      'content-type': true,
      'x-user-id': true
    };
    const result = extractData(source, config);
    expect(result['content-type']).toEqual(['application/json']);
    expect(result['x-user-id']).toEqual(['123']);
  });

  it('当值为 null/undefined 字符串时应该被过滤 (标准化逻辑)', () => {
    const source = {
      a: 'null',
      b: 'undefined',
      c: 'valid',
      d: [null, 'valid2', undefined] as any
    };
    const result = extractData(source, undefined, true);
    expect(result['a']).toBeUndefined();
    expect(result['b']).toBeUndefined();
    expect(result['c']).toEqual(['valid']);
    expect(result['d']).toEqual(['valid2']);
  });

  it('否定模式在字段值过滤中应该生效', () => {
    const source = {
      'headers': ['auth: token', 'cache: no-cache', 'x-extra: foo']
    };
    // 提取 headers 字段中，不包含 'auth' 的值
    // 注意：目前 isMatch(['!auth'], val) 逻辑：
    // 如果没有 positives，且不命中 negatives，默认返回 defaultIfNoPositives (此处为 true?)
    // extractData 调用 isMatch 时未传 defaultIfNoPositives，默认使用 isMatch 的默认值 true.
    const config = {
      headers: ['!auth:*']
    };
    const result = extractData(source, config);
    expect(result['headers']).toEqual(['cache: no-cache', 'x-extra: foo']);
  });

  it('完全匹配模式 (Exact Match) 与前缀匹配', () => {
    const source = {
      'a': 'hello world',
      'b': 'hello'
    };
    // 字符串模式默认是精确匹配
    const result = extractData(source, { a: 'hello' }); 
    expect(result['a']).toBeUndefined(); // 'hello world' !== 'hello'
    
    const result2 = extractData(source, { b: 'hello' });
    expect(result2['b']).toEqual(['hello']);
  });
});
