import { createHash } from 'crypto';
import { extractData } from '../utils';
import { SiteCacheConfig } from '../types';

/**
 * 根据 Request 对象和站点配置生成唯一的缓存指纹 (异步)
 *
 * 该函数是缓存系统的核心组件，用于将复杂的 HTTP 请求对象转换为唯一的 SHA-256 字符串。
 * 它实现了高度可定制的提取逻辑，允许通过配置排除掉请求中不稳定的因素（如时间戳、Nonce 等）。
 *
 * ### 生成指纹包含的要素：
 * 1. **Method**: 请求方法（统一转为大写）。
 * 2. **Host & Path**: 请求的域名和路径。
 * 3. **Query Params**: URL 查询参数，受 `config.query` 过滤影响。
 * 4. **Headers**: 请求头信息，受 `config.headers` 过滤影响。默认排除 `cookie` 头。
 * 5. **Cookies**: 特别提取的 Cookie 字段，受 `config.cookies` 过滤影响。
 * 6. **Request Body**:
 *    - 对于 `POST`, `PUT`, `PATCH` 请求，会自动尝试读取 Body。
 *    - **JSON 类型**: 如果 `Content-Type` 包含 `application/json`，则解析为对象并应用 `config.body` 过滤。
 *    - **非 JSON/流类型**: 回退到对原始 Body 字节流进行 SHA-256 哈希计算。
 *    - **安全性**: 使用 `req.clone()` 读取 Body，确保不影响后续真实的 Fetch 请求流消费。
 *
 * @param req - 原始 Web 标准 Request 对象。
 * @param config - 站点级缓存配置，决定了哪些字段参与指纹计算。
 * @returns 返回一个 64 位十六进制的 SHA-256 哈希字符串作为缓存键。
 *
 * @example
 * ```typescript
 * const cacheKey = await generateCacheKey(request, {
 *   query: { exclude: ['timestamp'] },
 *   body: { include: ['id', 'action'] }
 * });
 * ```
 */
export async function generateCacheKey(req: Request, config: SiteCacheConfig): Promise<string> {
  const url = new URL(req.url);

  // 提取 Cookie 对象
  const cookieStr = req.headers.get('cookie') || '';
  const cookieMap = Object.fromEntries(
    cookieStr.split(';')
      .map(c => c.trim())
      .filter(Boolean)
      .map(c => {
        const parts = c.split('=');
        return [parts[0], parts.slice(1).join('=')];
      })
  );

  let bodyData: any = null;
  const method = req.method.toUpperCase();
  const methodsWithBody = ['POST', 'PUT', 'PATCH'];

  if (methodsWithBody.includes(method)) {
    try {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        // 克隆请求以读取 Body，避免消耗原始请求流
        const json = await req.clone().json();
        bodyData = extractData(json, config.body);
      } else {
        // 非 JSON 类型或无法解析时，回退到对原始 Body 取哈希
        const buffer = await req.clone().arrayBuffer();
        if (buffer.byteLength > 0) {
          bodyData = createHash('sha256').update(new Uint8Array(buffer)).digest('hex');
        }
      }
    } catch (e) {
      // 如果读取 Body 失败（例如流已关闭或格式错误），则忽略 Body 参与计算
    }
  }

  const fingerprint: any = {
    m: method,
    h: url.host,
    p: url.pathname,
    q: extractData(Object.fromEntries(url.searchParams), config.query),
    hd: extractData(Object.fromEntries(req.headers), {
      ...config.headers,
      exclude: [...(config.headers?.exclude || []), 'cookie']
    }),
    ck: extractData(cookieMap, config.cookies)
  };

  if (bodyData !== null) {
    fingerprint.b = bodyData;
  }

  return createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex');
};
