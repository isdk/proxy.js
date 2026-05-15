import pm from 'picomatch';
import { isRegExpStr, toRegExp } from 'util-ex';
import { ProxyFieldConfig, ProxyMatchPatterns } from '../types';

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
  pattern: number | string | RegExp | (number | string | RegExp)[],
  value: string,
  {
    usePrefix = false,
    defaultIfNoPositives = true,
    ignoreCase = true,
    ignoreNegative,
  }: {
    usePrefix?: boolean;
    defaultIfNoPositives?: boolean;
    ignoreCase?: boolean;
    ignoreNegative?: boolean,
  } = {}
): boolean {
  if (Array.isArray(pattern) && pattern.length) {
    const positives: (number | string | RegExp)[] = [];
    const negatives: string[] = [];

    pattern.forEach(p => {
      if (typeof p === 'string' && p.startsWith('!')) {
        negatives.push(p.slice(1));
      } else {
        positives.push(p);
      }
    });

    // Negation check (Priority: Exclusion)
    if (!ignoreNegative &&
      negatives.length > 0 &&
      negatives.some(n => isMatch(n, value, { usePrefix, defaultIfNoPositives: true, ignoreCase }))
    ) {
      return false;
    }

    // If no positive patterns, use defaultIfNoPositives
    if (positives.length === 0) return defaultIfNoPositives;

    // Match any positive patterns
    return positives.some(p => isMatch(p, value, { usePrefix, defaultIfNoPositives, ignoreCase }));
  }

  if (pattern instanceof RegExp) {
    return pattern.test(value);
  }

  const patternStr = (pattern === null || pattern === undefined) ? '' : String(pattern);
  const targetValue = ignoreCase ? value.toLowerCase() : value;
  const targetPattern = ignoreCase ? patternStr.toLowerCase() : patternStr;

  if (isRegExpStr(patternStr)) {
    return toRegExp(patternStr).test(value);
  }

  if (isGlob(targetPattern)) {
    return pm(targetPattern, { dot: true, bash: true })(targetValue);
  }

  return usePrefix ? targetValue.startsWith(targetPattern) : targetValue === targetPattern;
}

export function matchField(
  source: URLSearchParams | Headers | Record<string, any>,
  config: ProxyFieldConfig | ProxyMatchPatterns,
  {
    defaultAllowed = true,
    ignoreNegative,
  }: {
    defaultAllowed?: boolean,
    ignoreNegative?: boolean,
  } = {}
): boolean {
  if (config && typeof config === 'object' && !Array.isArray(config) && !(config instanceof RegExp)) {
    // Record 模式: 执行 AND 匹配
    for (const [key, pattern] of Object.entries(config)) {
      let val: string | null = null;
      let has = false;

      if (source instanceof URLSearchParams || source instanceof Headers) {
        val = (source as any).get(key);
        has = (source as any).has(key);
      } else {
        val = source[key] ?? null;
        has = source[key] !== undefined && source[key] !== null;
      }

      if (typeof pattern === 'boolean') {
        if (pattern && !has) return false;
        if (!pattern && has) return false;
      } else {
        if (val === null || !isMatch(pattern, val, { ignoreNegative })) return false;
      }
    }
    return true;
  } else {
    // MatchPatterns 模式: 执行 Key 门控
    const keys = (source instanceof URLSearchParams || source instanceof Headers)
      ? Array.from((source as any).keys())
      : Object.keys(source);

    if (keys.length === 0) return defaultAllowed;

    const isArray = Array.isArray(config);

    if (isArray) {
      // 数组模式: 宽松匹配 (只要有一个满足正向匹配即可，忽略否定项)
      return (keys as string[]).some(key => isMatch(config as ProxyMatchPatterns, key, { ignoreNegative: true }));
    } else {
      // 非数组模式 (Scalar/RegExp): 严格匹配 (所有 Key 都必须满足该断言)
      return (keys as string[]).every(key => isMatch(config as ProxyMatchPatterns, key));
    }
  }
}
