import { SiteCacheConfig, CacheRule } from '../types';
import { isMatch } from '../utils';

/**
 * 精细化规则匹配 (内部)
 */
async function matchRule(
  rule: CacheRule,
  method: string,
  url: URL,
  searchParams: URLSearchParams,
  request: Request,
  bodyState: { text: string | null; checked: boolean; limit: number }
): Promise<boolean> {
  if (rule.method && rule.method.toUpperCase() !== method) return false;
  if (rule.path && !isMatch(rule.path, url.pathname, true)) return false;

  if (rule.query) {
    for (const [key, pattern] of Object.entries(rule.query)) {
      const val = searchParams.get(key) || '';
      if (typeof pattern === 'boolean') {
        if (pattern && !searchParams.has(key)) return false;
        if (!pattern && searchParams.has(key)) return false;
      } else if (!isMatch(pattern, val)) {
        return false;
      }
    }
  }

  if (rule.bodyType || rule.body) {
    const contentType = request.headers.get('content-type') || '';
    const actualType = contentType.includes('application/json') ? 'json' :
                     (contentType.includes('text/') || contentType.includes('application/xml') || contentType.includes('x-www-form-urlencoded')) ? 'text' : 'binary';

    if (rule.bodyType && rule.bodyType !== actualType) return false;

    if (rule.body) {
      if (actualType === 'binary') return false;
      if (!bodyState.checked) {
        try {
          const fullText = await request.clone().text();
          bodyState.text = fullText.slice(0, bodyState.limit);
        } catch { bodyState.text = ''; }
        bodyState.checked = true;
      }
      if (!bodyState.text || !isMatch(rule.body, bodyState.text)) return false;
    }
  }

  return true;
}

/**
 * 判断当前请求是否满足可缓存的基础条件
 */
export async function isCacheable(request: Request, config: SiteCacheConfig): Promise<boolean> {
  const method = request.method.toUpperCase();
  const allowedMethods = config.methods || ['GET', 'HEAD'];
  if (!allowedMethods.includes(method)) return false;

  if (config.cacheRules && config.cacheRules.length > 0) {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const bodyState = { text: null, checked: false, limit: config.body?.maxLength || 1024 };

    for (const rule of config.cacheRules) {
      if (await matchRule(rule, method, url, searchParams, request, bodyState)) {
        return true;
      }
    }
    return false;
  }

  return true;
}
