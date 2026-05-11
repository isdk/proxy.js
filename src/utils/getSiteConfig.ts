import { ProxyConfig, SiteCacheConfig } from '../types';
import { isMatch } from './matcher';

/**
 * 根据 URL 获取对应的站点缓存配置
 * 
 * 匹配逻辑：
 * 1. 遍历 sites 中的所有 key。
 * 2. 如果 key 是正则或 Glob 格式字符串，则对完整 URL 进行匹配。
 * 3. 如果 key 是普通字符串，则作为 URL 前缀进行匹配。
 * 4. 返回第一个匹配到的配置；若均未匹配，则返回 defaultConfig。
 * 
 * @param urlString 请求的完整 URL
 * @param proxyConfig 全局代理配置
 * @returns 匹配到的站点配置
 */
export function getSiteConfig(urlString: string, proxyConfig: ProxyConfig): SiteCacheConfig {
  const { sites, default: defaultConfig } = proxyConfig;
  
  if (!sites) return defaultConfig;

  let hostname = '';
  try {
    hostname = new URL(urlString).hostname;
  } catch {
    // 忽略无效 URL
  }

  for (const [pattern, config] of Object.entries(sites)) {
    // 1. 优先尝试精确匹配主机名
    if (hostname && pattern === hostname) {
      return config;
    }

    // 2. 尝试匹配完整 URL (支持 Glob, RegExp, 前缀)
    if (isMatch(pattern, urlString, true)) {
      return config;
    }

    // 3. 尝试后缀匹配主机名 (例如 "example.com" 匹配 "api.example.com")
    if (hostname && hostname.endsWith(pattern) && (pattern.startsWith('.') || hostname.charAt(hostname.length - pattern.length - 1) === '.')) {
      return config;
    }
  }

  return defaultConfig;
}
