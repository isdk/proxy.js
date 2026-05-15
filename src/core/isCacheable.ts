import { ProxySiteConfig, ProxyCacheRule, ProxyMatchPatterns } from '../types';
import { isMatch, getEffectiveConfig, normalizeBodyConfig, matchField } from '../utils';

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
  if (rule.path && !isMatch(rule.path, url.pathname, { usePrefix: true })) return false;

  // 3. Query 门控
  if (rule.query && !matchField(url.searchParams, rule.query, { defaultAllowed: true })) return false;

  // 4. Headers 门控
  if (rule.headers && !matchField(request.headers, rule.headers, { defaultAllowed: false })) return false;

  // 5. Cookies 门控
  if (rule.cookies) {
    const cookieStr = request.headers.get('cookie') || '';
    const cookieMap = Object.fromEntries(
      cookieStr.split(';')
        .map(c => c.trim())
        .filter(Boolean)
        .map(c => {
          const parts = c.split('=');
          return [parts[0], parts.slice(1).join('=')];
        })
    );
    if (!matchField(cookieMap, rule.cookies, { defaultAllowed: false })) return false;
  }

  // 6. Body 门控
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
        if (!matchField((bodyState as any).json, bodyConfig.match, { defaultAllowed: true })) return false;
      }

      // 内容匹配 (针对 Text)
      if (bodyConfig.match && actualType === 'text') {
        const m = bodyConfig.match;
        // 文本模式下，只有 MatchPatterns (串/阵/正) 有效，Record 模式无效
        if (typeof m === 'string' || Array.isArray(m) || m instanceof RegExp) {
          if (!bodyState.checked) {
            try {
              bodyState.text = (await request.clone().text()).slice(0, ruleLimit);
            } catch { bodyState.text = ''; }
            bodyState.checked = true;
          }
          if (!bodyState.text || !isMatch(m as ProxyMatchPatterns, bodyState.text)) return false;
        } else {
          // 如果给文本配置了对象模式规则，视为不匹配
          return false;
        }
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
 * Analysis of request cacheability (returned when cacheable).
 * 请求可缓存性分析结果（通过门控时返回）。
 */
export interface CacheAnalysis {
  /** 
   * The specific rule that matched the request. 
   * 匹配到的细化规则。
   */
  matchedRule: ProxyCacheRule | null;
  /** 
   * Current body reading state (reusable for fingerprinting). 
   * 请求体读取状态（可供后续生成 Key 等环节复用，避免重复读取 Stream）。
   */
  bodyState: { text: string | null; checked: boolean; limit: number };
}

/**
 * Validates if the request meets the base cacheability criteria and returns analysis metadata.
 * 判断当前请求是否满足可缓存的基础条件（门控校验）并返回分析上下文。
 *
 * @param request Request object. 请求对象。
 * @param config Site-level configuration. 站点级配置。
 * @returns 
 * - `CacheAnalysis`: If cacheable. Returns metadata for downstream steps (fingerprinting/fetching).
 *   如果可缓存，返回包含规则和 Body 状态的对象，供后续步骤复用。
 * - `undefined`: If NOT cacheable. Blocked by site-level or rule-level gatekeeping.
 *   如果不可缓存（被门控拦截），返回 undefined。
 * 
 * @important DO NOT simplify to boolean. The returned `bodyState` is CRITICAL for preventing 
 * multiple stream reads in subsequent `generateCacheKey` and `fetch` calls.
 * 请勿简化为 boolean。返回的 `bodyState` 对于防止后续流程中重复读取请求流至关重要。
 */
export async function isCacheable(
  request: Request,
  config: ProxySiteConfig
): Promise<CacheAnalysis | undefined> {
  const method = request.method.toUpperCase();
  const url = new URL(request.url);

  // 1. 初始化 Body 读取状态 (Gatekeeping 和 Fingerprinting 共享)
  const siteBody = normalizeBodyConfig(config.body);
  const limit = siteBody.maxLength || 1024;
  const bodyState = { text: null, checked: false, limit };

  // 2. 站点级基础检查 (Gatekeeping)
  // 如果站点未配置 methods，默认仅允许 GET, HEAD
  const baseConfig = {
    ...config,
    methods: config.methods || ['GET', 'HEAD']
  };

  const passSiteGate = await matchRule(baseConfig, method, url, request, bodyState);

  if (!passSiteGate) {
    return;
  }

  // 3. 细化规则匹配
  let matchedRule: ProxyCacheRule | null = null;
  if (config.rules && config.rules.length > 0) {
    matchedRule = await getMatchedRule(request, config, bodyState);
    if (!matchedRule) {
      // 如果定义了 rules 但没有一条匹配，则不可缓存
      return;
    }
  }

  return {
    matchedRule,
    bodyState
  };
}
