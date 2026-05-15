import { ProxyCacheRule } from '../types';
import { isMatch, matchField } from '../utils';
import { WAF_PRESETS } from './wafPresets';

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

  // 1. 基础规则集合 (使用 Set 去重，合并用户规则与 WAF 预设)
  const rulesSet = new Set<ProxyCacheRule>();
  if (useWafPresets) {
    WAF_PRESETS.forEach(r => rulesSet.add(r));
  }
  rulesSet.add(rule);

  const rulesToCheck = Array.from(rulesSet);

  // 默认允许的状态码 (参考 RFC 7231)
  const defaultAllowedStatuses = [200, 203, 204, 206, 300, 301, 404, 405, 410, 414];

  for (const r of rulesToCheck) {
    const rConfig = r.response;

    // A. 状态码校验
    // 如果没有配置 statuses 且是最后一条规则(用户规则)，则执行默认状态码检查
    const statusesToMatch = rConfig?.statuses || (r === rule ? defaultAllowedStatuses.map(s => s.toString()) : undefined);

    if (statusesToMatch && !isMatch(statusesToMatch, status.toString())) {
      // 如果状态码不匹配，检查是否属于“已知挑战/故障”状态，若是则触发容灾保护
      const isRescueStatus =
        status === 202 || // AWS WAF Challenge
        status === 403 || // Forbidden / CF Block
        status === 405 || // AWS WAF CAPTCHA
        status === 428 || // Precondition Required (Akamai)
        status === 429 || // Too Many Requests
        (status >= 500 && status < 600); // Server Errors

      const isWafPreset = WAF_PRESETS.includes(r);
      return {
        cacheable: false,
        reason: isWafPreset ? 'waf_challenge' : `status_mismatch:${status}`,
        keepOldCache: isRescueStatus
      };
    }

    if (!rConfig) continue;

    // B. 响应头校验
    if (rConfig.headers && !matchField(headers, rConfig.headers, true)) {
      // 如果是预设规则（如 WAF 预设）导致响应头校验失败，应触发容灾保护
      const isWafPreset = WAF_PRESETS.includes(r);
      return { 
        cacheable: false, 
        reason: isWafPreset ? 'waf_challenge' : 'headers_mismatch', 
        keepOldCache: isWafPreset 
      };
    }

    // C. 最小长度校验
    if (rConfig.minLength !== undefined) {
      const contentLengthHeader = headers.get('content-length');
      const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
      // 注意：如果 Content-Length 存在且小于 minLength，则拦截
      if (contentLengthHeader && contentLength < rConfig.minLength) {
        return { cacheable: false, reason: 'too_short', keepOldCache: true };
      }
    }
  }

  // D. Body 内容校验 (仅针对有 body 的文本/JSON 响应)
  const contentType = headers.get('content-type') || '';
  const isTextual = contentType.includes('text/') || contentType.includes('application/json') || contentType.includes('application/xml');
  const bodyRules = rulesToCheck.filter(r => r.response?.body);
  const needsBodyCheck = bodyRules.length;

  if (needsBodyCheck && isTextual && response.body) {
    let text = options.bodyText;
    if (text === undefined) {
      try {
        // 注意：这里 clone 响应以避免消费原始响应流
        text = await response.clone().text();
      } catch (e) {
        return { cacheable: false, reason: 'body_read_error' };
      }
    }

    for (const r of bodyRules) {
      const rConfig = r.response!;
      if (!isMatch(rConfig.body!, text)) {
        // 由于 isMatch 支持 ! 否定匹配，如果返回 false 说明：
        // 1. 没匹配上必须包含的正向模式
        // 2. 匹配上了必须排除的否定模式 (如 WAF 关键词)
        const isWafPreset = WAF_PRESETS.includes(r);
        return { 
          cacheable: false, 
          reason: isWafPreset ? 'waf_challenge' : 'body_match_failed', 
          keepOldCache: true 
        };
      }
    }
  }

  return { cacheable: true };
}
