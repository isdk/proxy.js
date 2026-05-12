import { createHash } from 'node:crypto';
import { isRegExpStr, toRegExp } from 'util-ex';
import { extractData, normalizeBodyConfig } from '../utils';
import { ProxySiteConfig, ProxyBodyConfig, ProxyFieldConfig } from '../types';
import { getEffectiveConfigFromRequest } from './isCacheable';

/**
 * 根据 Request 对象和配置生成唯一的缓存指纹 (异步)
 */
export async function generateCacheKey(req: Request, config: ProxySiteConfig): Promise<string> {
  const url = new URL(req.url);
  const method = req.method.toUpperCase();

  // 第一步：获取最终生效配置 (Rule -> Site -> Global)
  const finalConfig = await getEffectiveConfigFromRequest(req, config);

  // 提取 Cookie 对象
  const cookieStr = req.headers.get('cookie') || '';
  const cookieMap = Object.fromEntries(
    cookieStr.split(';')
      .map(c => c.trim())
      .filter(Boolean)
      .map(c => {
        const parts = c.split('=');
        return [parts[0], parts.slice(1).join('=')];
      })
  );

  let bodyData: any = null;
  const methodsWithBody = ['POST', 'PUT', 'PATCH'];

  if (methodsWithBody.includes(method)) {
    try {
      const contentType = req.headers.get('content-type') || '';
      const bodyConfig = normalizeBodyConfig(finalConfig.body);

      if (contentType.includes('application/json')) {
        const json = await req.clone().json();
        const jsonConfig = bodyConfig.match || (finalConfig.body as ProxyFieldConfig);
        // JSON Body 默认提取全部 (defaultAllowed: true)
        bodyData = extractData(json, jsonConfig, true);
      } else if (bodyConfig.extract && (contentType.includes('text/') || contentType.includes('application/xml') || contentType.includes('x-www-form-urlencoded'))) {
        const limit = bodyConfig.maxLength || 1024;
        const text = (await req.clone().text()).slice(0, limit);
        const extractPattern = bodyConfig.extract;
        const regex = typeof extractPattern === 'string' && isRegExpStr(extractPattern)
          ? toRegExp(extractPattern)
          : (extractPattern instanceof RegExp ? extractPattern : null);

        if (regex) {
          const match = text.match(regex);
          if (match) {
            if (match.length > 1) {
              const groups = match.slice(1);
              if (bodyConfig.sort) {
                groups.sort();
              }
              bodyData = groups.join(':');
            } else {
              bodyData = match[0];
            }
          }
        } else {
          bodyData = createHash('sha256').update(text).digest('hex');
        }
      } else {
        const buffer = await req.clone().arrayBuffer();
        if (buffer.byteLength > 0) {
          bodyData = createHash('sha256').update(new Uint8Array(buffer)).digest('hex');
        }
      }
    } catch (e) {
      // 失败则忽略 Body
    }
  }

  // 始终排除 Cookie 头，因为有专门的 ck 字段处理经过过滤的 Cookie
  const headerFilter = finalConfig.headers;
  let headersConfig: any = headerFilter;
  if (Array.isArray(headerFilter)) {
    headersConfig = [...headerFilter, '!cookie'];
  } else if (typeof headerFilter === 'string') {
    headersConfig = [headerFilter, '!cookie'];
  } else if (headerFilter && typeof headerFilter === 'object') {
    // Record 模式下，直接由 Record 决定提取哪些，通常不包含 cookie
    headersConfig = { ...headerFilter };
    delete (headersConfig as any).cookie;
    delete (headersConfig as any).Cookie;
  } else if (headerFilter === undefined) {
    // 默认不提取任何 Header
    headersConfig = ['!*'];
  }

  const fingerprint: any = {
    m: method,
    h: url.host,
    p: url.pathname,
    q: extractData(Object.fromEntries(url.searchParams), finalConfig.query, true), // Query 默认提取全部
    hd: extractData(Object.fromEntries(req.headers), headersConfig, false),       // Headers 默认不提取
    ck: extractData(cookieMap, finalConfig.cookies, false)                        // Cookies 默认不提取
  };

  if (bodyData !== null) {
    fingerprint.b = bodyData;
  }

  return createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex');
}
