/**
 * 核心辅助：为 Response 实例添加 url 属性并确保 clone 正常工作
 */
export function decorateResponseWithUrl(response: Response, url: string): Response {
  if (url && response.url !== url) {
    Object.defineProperty(response, 'url', {
      value: url,
      writable: false,
      enumerable: true,
      configurable: true
    });

    const originalClone = response.clone;
    response.clone = function() {
      const cloned = originalClone.call(this);
      return decorateResponseWithUrl(cloned, url);
    };
  }

  return response;
}

/**
 * 创建带 url 的 Web Response 实例，并确保其 clone() 方法能正常保留该 url
 */
export function createResponse(body: BodyInit | null, init: ResponseInit & { url?: string }): Response {
  const { url, ...responseInit } = init;
  const response = new Response(body, responseInit);
  if (url) {
    return decorateResponseWithUrl(response, url);
  }
  return response;
}
