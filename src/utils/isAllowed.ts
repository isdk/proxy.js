import { ProxyMatchPatterns } from '../types';
import { isMatch } from './matcher';

/**
 * 判断给定的键是否允许参与缓存指纹计算。
 * 
 * 基于 V8 重构后的逻辑：
 * 1. 采用正交匹配范式，不再区分显式的 include/exclude 结构。
 * 2. 利用 `isMatch` 内部支持的数组和 `!` 否定模式来实现黑白名单。
 * 
 * @param key 要检查的键名
 * @param patterns 匹配模式 (支持数组和 ! 否定)
 * @param defaultAllowed 当没有配置时的默认值 (默认 false)
 * @returns 是否允许
 * 
 * @example
 * ```typescript
 * // 白名单
 * isAllowed('id', ['id', 'name']); // true
 * 
 * // 黑名单 (使用 ! 排除)
 * isAllowed('timestamp', ['*', '!timestamp']); // false
 * ```
 */
export function isAllowed(key: string, patterns?: ProxyMatchPatterns, defaultAllowed: boolean = false): boolean {
  if (patterns != null) {
    return isMatch(patterns, key, false, defaultAllowed);
  }
  return defaultAllowed;
}
