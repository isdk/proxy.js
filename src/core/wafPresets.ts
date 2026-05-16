import { ProxyCacheRule } from '../types';
import { isMatch, matchField } from '../utils';

/**
 * Cloudflare specific WAF Challenge detection signatures.
 */
export const CLOUDFLARE_WAF_PRESET: ProxyCacheRule = {
  response: {
    statuses: ['403', '429', '503'],
    body: [
      '*<title>Just a moment...</title>*',
      '*__cf_chl_opt*',
      '*cf-browser-verification*',
      '*cf-ray*'
    ],
    headers: {
      'cf-mitigated': true
    }
  }
};

/**
 * AWS WAF specific Challenge/CAPTCHA detection signatures.
 */
export const AWS_WAF_PRESET: ProxyCacheRule = {
  response: {
    statuses: ['202', '405'],
    headers: {
      'x-amzn-waf-action': true
    }
  }
};

/**
 * General/Common WAF and Bot detection signatures.
 */
export const GENERAL_WAF_PRESET: ProxyCacheRule = {
  response: {
    statuses: ['403', '429'],
    body: [
      '*captcha-delivery.com*',
      '*g-recaptcha*',
      '*h-captcha*',
      '*verify you are human*',
      '*security check to access*',
      '*bot detection*',
      '*interstitial*'
    ]
  }
};

/**
 * Internal registry of WAF presets.
 */
const _WAF_PRESETS: Set<ProxyCacheRule> = new Set([
  CLOUDFLARE_WAF_PRESET,
  AWS_WAF_PRESET,
  GENERAL_WAF_PRESET
]);

/**
 * Get all current WAF presets.
 */
export function getWAFPresets(): ProxyCacheRule[] {
  return Array.from(_WAF_PRESETS);
}

/**
 * Register a new WAF preset.
 * @param preset The WAF signature to detect.
 */
export function registerWAFPreset(preset: ProxyCacheRule): void {
  _WAF_PRESETS.add(preset);
}

/**
 * Unregister a WAF preset.
 * @param preset The WAF signature to remove.
 */
export function unregisterWAFPreset(preset: ProxyCacheRule): void {
  _WAF_PRESETS.delete(preset);
}

/**
 * Clear all registered WAF presets.
 */
export function clearWAFPresets(): void {
  _WAF_PRESETS.clear();
}

/**
 * 高度可复用的简单好使的 WAF 挑战判定函数
 *
 * @param response Web 标准 Response 对象
 * @param presets 自定义规则，默认使用内置所有已注册的 WAF 预设
 * @returns 是否为人机挑战页面
 */
export async function isWAFChallenge(
  response: Response,
  presets: ProxyCacheRule[] = getWAFPresets()
): Promise<boolean> {
  const status = response.status.toString();
  const headers = response.headers;
  let bodyText: string | undefined;

  for (const preset of presets) {
    const config = preset.response;
    if (!config) continue;

    // 只要命中任何一个特征 (Status, Headers, 或 Body) 即视为命中该 Preset

    // 1. 状态码匹配
    if (config.statuses && isMatch(config.statuses, status)) {
      return true;
    }

    // 2. 响应头匹配
    if (config.headers && matchField(headers, config.headers)) {
      return true;
    }

    // 3. 响应体内容匹配
    if (config.body) {
      if (bodyText === undefined) {
        try {
          bodyText = await response.clone().text();
        } catch (e) {
          // 读取失败忽略
        }
      }
      if (bodyText !== undefined && isMatch(config.body, bodyText)) {
        return true;
      }
    }
  }

  return false;
}

