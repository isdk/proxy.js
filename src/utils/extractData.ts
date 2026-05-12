import { isMatch, isAllowed } from './index';
import type { ProxyFieldConfig, ProxyMatchPatterns } from '../types';

/**
 * Universal Data Extraction and Filtering Utility (for Objects)
 * 通用数据提取与过滤函数 (针对对象)
 * 
 * Core Logic:
 * 1. If no config: Extract all or none based on defaultAllowed.
 * 2. If config is Array/Pattern: Filter by Key using MatchPatterns logic.
 * 3. If config is Record: Precise field-level extraction:
 *    - true: Extract this field (full).
 *    - false: Exclude this field.
 *    - Patterns: Match/extract based on the field's VALUE using Glob/Regex.
 * 
 * Extracted values are normalized into sorted string arrays for fingerprint stability.
 * 提取后的值统一标准化为排序后的字符串数组，以确保指纹稳定性。
 * 
 * @param source Original data object (Query, Headers, Cookies, etc.)
 * @param config Filtering configuration (MatchPatterns or Record)
 * @param defaultAllowed Default policy when no pattern matches (default: true)
 */
export function extractData(
  source: Record<string, any>,
  config?: ProxyFieldConfig | ProxyMatchPatterns,
  defaultAllowed: boolean = true
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  // 辅助函数：标准化值为排序后的字符串数组
  const normalize = (val: any): string[] => {
    if (val == null) return [];
    const arr = Array.isArray(val) ? val.map(String) : [String(val)];
    const filtered = arr.filter(v => v != null && v !== 'null' && v !== 'undefined');
    return filtered.sort();
  };

  if (!config) {
    if (defaultAllowed) {
      for (const [key, val] of Object.entries(source)) {
        const normalizedValue = normalize(val);
        if (normalizedValue.length > 0) {
          result[key.toLowerCase()] = normalizedValue;
        }
      }
    }
    return result;
  }

  if (Array.isArray(config) || typeof config === 'string' || config instanceof RegExp) {
    // 数组/单值模式：对 Key 进行过滤
    for (const key of Object.keys(source)) {
      const normalizedValue = normalize(source[key]);
      if (normalizedValue.length > 0 && isAllowed(key.toLowerCase(), config as ProxyMatchPatterns, defaultAllowed)) {
        result[key.toLowerCase()] = normalizedValue;
      }
    }
  } else {
    // Record 模式：字段级精准控制
    for (const [key, patterns] of Object.entries(config)) {
      const actualKey = Object.keys(source).find(k => k.toLowerCase() === key.toLowerCase()) || key;
      const val = source[actualKey];

      if (val === undefined) continue;

      if (patterns === true) {
        result[key.toLowerCase()] = normalize(val);
      } else if (patterns === false) {
        // 排除
      } else {
        // 值匹配模式
        const normalizedVal = normalize(val);
        const matched = normalizedVal.filter(v => isMatch(patterns as ProxyMatchPatterns, v));
        if (matched.length > 0) {
          result[key.toLowerCase()] = matched.sort();
        }
      }
    }
  }

  return result;
}
