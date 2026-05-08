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

  for (const [pattern, config] of Object.entries(sites)) {
    // sites 的 key 如果是普通字符串，默认使用前缀匹配 (usePrefix = true)
    if (isMatch(pattern, urlString, true)) {
      return config;
    }
  }

  return defaultConfig;
}
