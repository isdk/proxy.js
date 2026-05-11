/**
 * 错误类型定义
 */
import { CommonError, ErrorCode } from '@isdk/common-error';

/**
 * Offline 缓存未命中错误代码
 *
 * 当处于 offline 模式且请求的 URL 没有对应缓存时抛出。
 * 这帮助调用者区分：
 * - 网络请求失败（其他错误类型）
 * - offline 模式下缓存不存在（本错误）
 */
export const OfflineCacheMissErrorCode = ErrorCode.OfflineCacheMiss;

/**
 * Offline 缓存未命中错误
 *
 * @example
* throw new OfflineCacheMissError('http://example.com/data')
*
* @extends CommonError
*/
export class OfflineCacheMissError extends CommonError {
  static code = OfflineCacheMissErrorCode;
  constructor(url: string|number, name?: string|Record<string, any>) {
    super(`Offline mode: No cached response for ${url}`, name, OfflineCacheMissErrorCode)
    this.data = { url }
  }
}
(CommonError as any)[OfflineCacheMissErrorCode] = OfflineCacheMissError;
