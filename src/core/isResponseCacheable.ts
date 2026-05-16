import { ProxyCacheRule } from '../types';
import { isMatch, matchField } from '../utils';
import { isWAFChallenge } from './wafPresets';

export interface ResponseCacheCheckResult {
  cacheable: boolean;
  reason?: string;
  /** Whether we should keep the old cache if this response is deemed "dirty" */
  keepOldCache?: boolean;
}

/**
 * 判断响应是否满足缓存条件 (响应侧校验)
 *
 * @description
 * 此函数执行以下检查：
 * 1. 状态码匹配 (statuses)
 * 2. 响应头匹配 (headers)
 * 3. 最小长度校验 (minLength)
 * 4. 响应体内容校验 (body) - 支持正向包含与负向 (!) 排除
 */
export async function isResponseCacheable(
  response: Response,
  rule: ProxyCacheRule,
  options: {
    useWafPresets?: boolean;
    // 如果外部已经读取了 body 内容，可以直接传入避免重复读取
    bodyText?: string;
  } = {}
): Promise<ResponseCacheCheckResult> {
  const { useWafPresets = true } = options;
  const status = response.status;
  const headers = response.headers;

  // 1. WAF 挑战检查 (优先级最高)
  if (useWafPresets && await isWAFChallenge(response)) {
    return {
      cacheable: false,
      reason: 'waf_challenge',
      keepOldCache: true
    };
  }

  // 2. 基础规则校验 (用户定义的 rule)
  // 默认允许的状态码 (参考 RFC 7231)
  const defaultAllowedStatuses = [200, 203, 204, 206, 300, 301, 404, 405, 410, 414];
  const rConfig = rule.response;

  // A. 状态码校验
  const statusesToMatch = rConfig?.statuses || defaultAllowedStatuses.map(s => s.toString());

  if (statusesToMatch && !isMatch(statusesToMatch, status.toString())) {
    // 如果状态码不匹配，检查是否属于“已知容灾保护”状态，若是则触发容灾保护
    const isRescueStatus =
      status === 202 || // AWS WAF Challenge (or other pending states)
      status === 403 || // Forbidden
      status === 405 || // AWS WAF CAPTCHA
      status === 428 || // Precondition Required
      status === 429 || // Too Many Requests
      (status >= 500 && status < 600); // Server Errors

    return {
      cacheable: false,
      reason: `status_mismatch:${status}`,
      keepOldCache: isRescueStatus
    };
  }

  if (rConfig) {
    // B. 响应头校验
    if (rConfig.headers && !matchField(headers, rConfig.headers, { defaultAllowed: true })) {
      return {
        cacheable: false,
        reason: 'headers_mismatch'
      };
    }

    // C. 最小长度校验 (基于 Header)
    if (rConfig.minLength !== undefined) {
      const contentLengthHeader = headers.get('content-length');
      const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
      if (contentLengthHeader && contentLength < rConfig.minLength) {
        return { cacheable: false, reason: 'too_short', keepOldCache: true };
      }
    }

    // D. Body 校验
    if (rConfig.body) {
      const contentType = headers.get('content-type') || '';
      const isTextual = contentType.includes('text/') || contentType.includes('application/json') || contentType.includes('application/xml');
      
      if (isTextual && response.body) {
        let text = options.bodyText;
        if (text === undefined) {
          try {
            text = await response.clone().text();
          } catch (e) {
            return { cacheable: false, reason: 'body_read_error' };
          }
        }

        if (text !== undefined) {
          const actualLength = Buffer.byteLength(text);

          // C2. 长度二次校验 (仅在已有 text 的情况下进行更精准的校验)
          if (rConfig.minLength !== undefined && actualLength < rConfig.minLength) {
            return { cacheable: false, reason: 'too_short', keepOldCache: true };
          }

          // D2. 内容关键字校验
          if (rConfig.body && !isMatch(rConfig.body, text)) {
            return {
              cacheable: false,
              reason: 'body_match_failed',
              keepOldCache: true
            };
          }
        }
      }
    }
  }


  return { cacheable: true };
}
