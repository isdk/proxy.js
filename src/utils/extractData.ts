import { isAllowed } from './isAllowed';
import { KeyFilterConfig } from '../types';

/**
 * 从源对象中根据过滤配置提取数据并标准化。
 * 
 * 此函数主要用于生成缓存指纹。它会：
 * 1. 根据 `config` (include/exclude) 过滤键。
 * 2. 对键进行排序以保证指纹的一致性。
 * 3. 将所有键转换为小写。
 * 4. 将值统一包装为数组并进行排序，消除数组项顺序差异。
 * 
 * @param source 原始数据对象 (如 QueryParams, Headers, Cookies)
 * @param config 过滤配置 (白名单或黑名单)
 * @returns 标准化后的数据 Map，键为小写，值为字符串数组
 */
export const extractData = (
  source: Record<string, any>,
  config?: KeyFilterConfig
): Record<string, string[]> => {
  const result: Record<string, string[]> = {};
  Object.keys(source)
    .filter((key) => isAllowed(key, config))
    .sort()
    .forEach((key) => {
      const val = source[key];
      if (val != null) {
        // 统一转换为数组并排序，确保指纹一致性
        result[key.toLowerCase()] = Array.isArray(val) ? [...val].sort() : [val];
      }
    });
  return result;
};
