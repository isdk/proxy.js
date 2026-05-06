import { KeyFilterConfig } from '../types';

/**
 * 判断给定的键是否允许参与缓存指纹计算。
 * 
 * 优先级逻辑：
 * 1. 如果配置了 `include` (白名单)，则只有存在于 `include` 中的键才会被允许。
 * 2. 否则，如果配置了 `exclude` (黑名单)，则存在于 `exclude` 中的键将被拒绝。
 * 3. 如果都没有配置，默认允许所有键。
 * 
 * @param key 要检查的键名
 * @param config 过滤配置
 * @returns 是否允许
 */
export function isAllowed(key: string, config?: KeyFilterConfig): boolean {
  if (config?.include) return config.include.includes(key);
  if (config?.exclude) return !config.exclude.includes(key);
  return true;
};
