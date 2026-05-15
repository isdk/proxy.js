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
  if (rule.path && !isMatch(rule.path, url.pathname, true)) return false;

  // 3. Query 门控
  if (rule.query && !matchField(url.searchParams, rule.query, true)) return false;

  // 4. Headers 门控
  if (rule.headers && !matchField(request.headers, rule.headers, false)) return false;

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
    if (!matchField(cookieMap, rule.cookies, false)) return false;
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
        if (!matchField((bodyState as any).json, bodyConfig.match, true)) return false;
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
 * 请求分析结果 (当 isCacheable 返回非 false 时)
 */
export interface CacheAnalysis {
  /** 匹配到的细化规则 */
  matchedRule: ProxyCacheRule | null;
  /** 请求体读取状态（可供后续生成 Key 等环节复用） */
  bodyState: { text: string | null; checked: boolean; limit: number };
}

/**
 * 判断当前请求是否满足可缓存的基础条件并返回分析结果
 *
 * @param request 请求对象
 * @param config 站点级配置
 * @returns 如果不可缓存则返回 false，否则返回 CacheAnalysis 对象
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
