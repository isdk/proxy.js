import { ProxyCacheRule } from '../types';
import { isResponseCacheable } from './isResponseCacheable';

/**
 * Cloudflare specific WAF Challenge detection.
 */
export const CLOUDFLARE_WAF_PRESET: ProxyCacheRule = {
  response: {
    body: [
      '!*<title>Just a moment...</title>*',
      '!*__cf_chl_opt*',
      '!*cf-browser-verification*',
      '!*cf-ray*'
    ],
    headers: {
      'cf-mitigated': false
    }
  }
};

/**
 * AWS WAF specific Challenge/CAPTCHA detection.
 */
export const AWS_WAF_PRESET: ProxyCacheRule = {
  response: {
    statuses: ['!202', '!405'],
    headers: {
      'x-amzn-waf-action': false
    }
  }
};

/**
 * General/Common WAF and Bot detection keywords.
 */
export const GENERAL_WAF_PRESET: ProxyCacheRule = {
  response: {
    statuses: ['!403', '!429'],
    body: [
      '!*captcha-delivery.com*',
      '!*g-recaptcha*',
      '!*h-captcha*',
      '!*verify you are human*',
      '!*security check to access*',
      '!*bot detection*',
      '!*interstitial*'
    ]
  }
};

/**
 * All built-in WAF presets combined.
 * @description Use this for one-stop protection.
 */
export const WAF_PRESETS: ProxyCacheRule[] = [
  CLOUDFLARE_WAF_PRESET,
  AWS_WAF_PRESET,
  GENERAL_WAF_PRESET
];

/**
 * 高度可复用的简单好使的 WAF 挑战判定函数
 * 
 * @param response Web 标准 Response 对象
 * @param rules 自定义规则，默认使用内置所有 WAF 预设
 * @returns 是否为人机挑战页面
 */
export async function isWAFChallenge(
  response: Response, 
  rules: ProxyCacheRule[] = WAF_PRESETS
): Promise<boolean> {
  // 利用现有的校验逻辑，判断该响应是否因为命中 WAF 规则而被判定为“不可缓存”
  for (const rule of rules) {
    const result = await isResponseCacheable(response.clone(), rule, { useWafPresets: false });
    if (!result.cacheable && result.keepOldCache) {
      return true;
    }
  }
  return false;
}
