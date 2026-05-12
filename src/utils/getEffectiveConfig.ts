import { defaultsDeep } from 'lodash-es';
import type { ProxyCacheRule, ProxySiteConfig, ProxyBodyConfig } from '../types';

/**
 * 标准化 Body 配置，确保其为对象形式以支持深度合并
 */
export function normalizeBodyConfig(body: any): ProxyBodyConfig {
  if (!body) return {};
  if (typeof body === 'object' && !(body instanceof RegExp) && !Array.isArray(body)) return body as ProxyBodyConfig;
  return { match: body } as ProxyBodyConfig;
}

/**
 * 获取合并后的有效配置 (Rule -> Site -> Global)
 * 
 * 特殊处理：
 * 1. Body 配置如果为简写形式 (string/RegExp/Array)，先标准化为对象再合并，以防丢失 site 级的 maxLength 等配置。
 */
export function getEffectiveConfig(rule: ProxyCacheRule, siteConfig: ProxySiteConfig): ProxySiteConfig {
  const effectiveConfig = defaultsDeep({}, rule, siteConfig);
  
  if (rule.body || siteConfig.body) {
    effectiveConfig.body = defaultsDeep({}, normalizeBodyConfig(rule.body), normalizeBodyConfig(siteConfig.body));
  }
  
  return effectiveConfig;
}
