import pm from 'picomatch';
import { isRegExpStr, toRegExp } from 'util-ex';

/**
 * 判断一个模式是否为 Glob 模式
 */
export function isGlob(str: string): boolean {
  return /[!*?{}[\]()]/.test(str);
}

/**
 * 通用匹配函数
 *
 * 逻辑优先级：
 * 1. 如果 pattern 是数组，遵循：(匹配任一正向模式) 且 (不匹配任一负向模式)。
 * 2. 如果 pattern 是 RegExp 对象，直接使用 regex.test(value)。
 * 3. 如果 pattern 是 "/regex/flags" 格式的字符串，转为 RegExp 后使用 test。
 * 4. 如果 pattern 是 Glob 字符串，使用 picomatch 进行匹配。
 * 5. 否则，根据 usePrefix 参数进行前缀匹配或精确匹配。
 *
 * @param pattern 匹配模式 (RegExp 或 字符串 或 数组)
 * @param value 要匹配的值
 * @param usePrefix 是否在普通字符串匹配时启用前缀匹配 (默认为 false，即精确匹配)
 */
export function isMatch(pattern: string | RegExp | (string | RegExp)[], value: string, usePrefix = false): boolean {
  if (Array.isArray(pattern) && pattern.length) {
    const positives: (string | RegExp)[] = [];
    const negatives: string[] = [];

    pattern.forEach(p => {
      if (typeof p === 'string' && p.startsWith('!')) {
        negatives.push(p.slice(1));
      } else {
        positives.push(p);
      }
    });

    // 只要有一个负向模式匹配，就直接返回 false (排除优先)
    if (negatives.length > 0 && negatives.some(n => isMatch(n, value, usePrefix))) {
      return false;
    }

    // 如果没有正向模式，默认视为匹配（如果只有排除项且没被排除）
    if (positives.length === 0) return true;

    // 只要有一个正向模式匹配，就返回 true
    return positives.some(p => isMatch(p, value, usePrefix));
  }

  if (pattern instanceof RegExp) {
    return pattern.test(value);
  }

  if (typeof pattern === 'string') {
    if (isRegExpStr(pattern)) {
      return toRegExp(pattern).test(value);
    }

    if (isGlob(pattern)) {
      // 为 picomatch 增加常用的路径匹配配置
      // 使用 nonegate: true 因为我们已经在外部手动处理了否定逻辑
      return pm(pattern, { dot: true })(value);
    }

    return usePrefix ? value.startsWith(pattern) : value === pattern;
  }

  return false;
}
