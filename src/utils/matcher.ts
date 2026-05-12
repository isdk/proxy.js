import pm from 'picomatch';
import { isRegExpStr, toRegExp } from 'util-ex';

/**
 * Checks if a string is a Glob pattern.
 * 判断一个字符串是否为 Glob 模式。
 */
export function isGlob(str: string): boolean {
  return /[!*?{}[\]()]/.test(str);
}

/**
 * Universal matching function with advanced logic.
 * 通用匹配函数。
 *
 * Logic Priority (优先级):
 * 1. Array (数组): Follows "(Match ANY positives) AND (Match NO negatives)".
 * 2. RegExp (正则): Direct regex test.
 * 3. Regex String (正则字符串): Supports "/regex/flags" format.
 * 4. Glob (通配符): Uses picomatch for file-path style matching.
 * 5. String (普通字符串): Prefix or exact match based on `usePrefix`.
 *
 * @param pattern Matching pattern (RegExp, string, or Array)
 * @param value Value to test
 * @param usePrefix Whether to use prefix matching for simple strings (default: false)
 * @param defaultIfNoPositives Return value when only negatives are provided and none match (default: true)
 * @param ignoreCase Whether to perform case-insensitive matching (default: true)
 */
export function isMatch(
  pattern: string | RegExp | (string | RegExp)[],
  value: string,
  usePrefix = false,
  defaultIfNoPositives = true,
  ignoreCase = true
): boolean {
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

    // Negation check (Priority: Exclusion)
    if (negatives.length > 0 && negatives.some(n => isMatch(n, value, usePrefix, true, ignoreCase))) {
      return false;
    }

    // If no positive patterns, use defaultIfNoPositives
    if (positives.length === 0) return defaultIfNoPositives;

    // Match any positive patterns
    return positives.some(p => isMatch(p, value, usePrefix, defaultIfNoPositives, ignoreCase));
  }

  if (pattern instanceof RegExp) {
    return pattern.test(value);
  }

  if (typeof pattern === 'string') {
    const targetValue = ignoreCase ? value.toLowerCase() : value;
    const targetPattern = ignoreCase ? pattern.toLowerCase() : pattern;

    if (isRegExpStr(pattern)) {
      return toRegExp(pattern).test(value);
    }

    if (isGlob(pattern)) {
      return pm(targetPattern, { dot: true })(targetValue);
    }

    return usePrefix ? targetValue.startsWith(targetPattern) : targetValue === targetPattern;
  }

  return false;
}
