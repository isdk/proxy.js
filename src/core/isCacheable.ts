import { ProxySiteConfig, ProxyCacheRule, ProxyFieldConfig, ProxyMatchPatterns } from '../types';
import { isMatch, getEffectiveConfig, normalizeBodyConfig } from '../utils';

/**
 * 通用字段匹配 (用于 Query, Headers, Cookies)
 */
function matchField(source: URLSearchParams | Headers | Record<string, any>, config: ProxyFieldConfig | ProxyMatchPatterns): boolean {
  if (config && typeof config === 'object' && !Array.isArray(config) && !(config instanceof RegExp)) {
    // Record 模式: 执行 AND 匹配
    for (const [key, pattern] of Object.entries(config)) {
      let val: string | null = null;
      let has = false;

      if (source instanceof URLSearchParams || source instanceof Headers) {
        val = source.get(key);
        has = source.has(key);
      } else {
        val = source[key] ?? null;
        has = source[key] !== undefined && source[key] !== null;
      }

      if (typeof pattern === 'boolean') {
        if (pattern && !has) return false;
        if (!pattern && has) return false;
      } else {
        if (val === null || !isMatch(pattern, val)) return false;
      }
    }
    return true;
  } else {
    // MatchPatterns 模式: 执行 Key 门控 (只要存在匹配模式的 Key 即通过)
    const keys = (source instanceof URLSearchParams || source instanceof Headers)
      ? Array.from((source as any).keys())
      : Object.keys(source);

    return keys.some(key => isMatch(config as ProxyMatchPatterns, key as string));
  }
}

/**
 * 获取请求匹配到的规则
 */
export async function getMatchedRule(
  request: Request,
  config: ProxySiteConfig,
  bodyState?: { text: string | null; checked: boolean; limit: number }
): Promise<ProxyCacheRule | null> {
  const method = request.method.toUpperCase();
  const url = new URL(request.url);

  // 从站点配置中获取全局 body 限制
  const siteBody = normalizeBodyConfig(config.body);
  const limit = siteBody.maxLength || 1024;
  const state = bodyState || { text: null, checked: false, limit };

  if (config.rules && config.rules.length > 0) {
    for (const rule of config.rules) {
      if (await matchRule(rule, method, url, request, state)) {
        return rule;
      }
    }
  }
  return null;
}

/**
 * 获取叠加后的最终生效配置 (Rule -> Site -> Global)
 */
export async function getEffectiveConfigFromRequest(request: Request, config: ProxySiteConfig): Promise<ProxyCacheRule> {
  const matchedRule = await getMatchedRule(request, config);
  return getEffectiveConfig(matchedRule || {}, config);
}

/**
 * 精细化规则匹配 (第一遍扫描：门控)
 */
async function matchRule(
  rule: ProxyCacheRule,
  method: string,
  url: URL,
  request: Request,
  bodyState: { text: string | null; checked: boolean; limit: number }
): Promise<boolean> {
  // 1. 方法门控
  if (rule.methods && !isMatch(rule.methods, method)) return false;

  // 2. 路径门控
  if (rule.path && !isMatch(rule.path, url.pathname, true)) return false;

  // 3. Query 门控
  if (rule.query && !matchField(url.searchParams, rule.query)) return false;

  // 4. Headers 门控
  if (rule.headers && !matchField(request.headers, rule.headers)) return false;

  // 5. Body 门控
  if (rule.body) {
    const contentType = request.headers.get('content-type') || '';
    const actualType = contentType.includes('application/json') ? 'json' :
                     (contentType.includes('text/') || contentType.includes('application/xml') || contentType.includes('x-www-form-urlencoded')) ? 'text' : 'binary';

    if (typeof rule.body === 'object' && !Array.isArray(rule.body) && !(rule.body instanceof RegExp)) {
      const bodyConfig = normalizeBodyConfig(rule.body);
      const ruleLimit = bodyConfig.maxLength || bodyState.limit;

      // 类型检查
      if (bodyConfig.type && bodyConfig.type !== actualType) return false;

      // 内容匹配 (针对 JSON)
      if (bodyConfig.match && actualType === 'json') {
        if (!bodyState.checked) {
          try {
            bodyState.text = (await request.clone().text()).slice(0, ruleLimit);
            (bodyState as any).json = JSON.parse(bodyState.text);
          } catch { (bodyState as any).json = {}; }
          bodyState.checked = true;
        }
        if (!matchField((bodyState as any).json, bodyConfig.match)) return false;
      }

      // 正则/文本匹配 (针对 Text)
      if (bodyConfig.extract && actualType === 'text') {
        if (!bodyState.checked) {
          try {
            bodyState.text = (await request.clone().text()).slice(0, ruleLimit);
          } catch { bodyState.text = ''; }
          bodyState.checked = true;
        }
        if (!bodyState.text || !isMatch(bodyConfig.extract, bodyState.text)) return false;
      }
    } else {
      // 简写模式: 直接匹配 Body 文本
      if (actualType === 'binary') return false;
      if (!bodyState.checked) {
        try {
          bodyState.text = (await request.clone().text()).slice(0, bodyState.limit);
        } catch { bodyState.text = ''; }
        bodyState.checked = true;
      }
      if (!bodyState.text || !isMatch(rule.body as ProxyMatchPatterns, bodyState.text)) return false;
    }
  }

  return true;
}

/**
 * 判断当前请求是否满足可缓存的基础条件
 */
export async function isCacheable(request: Request, config: ProxySiteConfig): Promise<boolean> {
  const method = request.method.toUpperCase();

  // 1. 站点级方法检查
  const allowedMethods = config.methods || ['GET', 'HEAD'];
  if (!isMatch(allowedMethods, method)) return false;

  // 2. 规则匹配
  if (config.rules && config.rules.length > 0) {
    const rule = await getMatchedRule(request, config);
    return rule !== null;
  }

  return true;
}
