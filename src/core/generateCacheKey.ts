import { createHash } from 'crypto';
import { extractData } from '../utils';
import { SiteCacheConfig } from '../types';

/**
 * 根据 Request 和配置生成唯一的缓存键
 */
export const generateCacheKey = (req: Request, config: SiteCacheConfig): string => {
  const url = new URL(req.url);

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

  const fingerprint = {
    m: req.method.toUpperCase(),
    h: url.host,
    p: url.pathname,
    q: extractData(Object.fromEntries(url.searchParams), config.query),
    hd: extractData(Object.fromEntries(req.headers), {
      ...config.headers,
      exclude: [...(config.headers?.exclude || []), 'cookie']
    }),
    ck: extractData(cookieMap, config.cookies)
  };

  return createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex');
};
