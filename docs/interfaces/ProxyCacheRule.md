[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / ProxyCacheRule

# Interface: ProxyCacheRule

Defined in: [packages/proxy/src/types.ts:66](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L66)

Core Cache Rule Definition (V8).
核心缓存规则定义。

Defines how requests are "Matched (Gatekeeping)" and "Extracted (Fingerprinting)".
定义请求如何被“匹配 (Gatekeeping)”以及如何被“提取 (Fingerprinting)”。

## Extended by

- [`ProxySiteConfig`](ProxySiteConfig.md)
- [`ProxyConfig`](ProxyConfig.md)

## Properties

### body?

> `optional` **body**: [`ProxyMatchPatterns`](../type-aliases/ProxyMatchPatterns.md) \| [`ProxyFieldConfig`](../type-aliases/ProxyFieldConfig.md) \| [`ProxyBodyConfig`](ProxyBodyConfig.md)

Defined in: [packages/proxy/src/types.ts:98](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L98)

Body matching and extraction configuration.
请求体匹配与提取配置。

***

### cookies?

> `optional` **cookies**: [`ProxyMatchPatterns`](../type-aliases/ProxyMatchPatterns.md) \| [`ProxyFieldConfig`](../type-aliases/ProxyFieldConfig.md)

Defined in: [packages/proxy/src/types.ts:93](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L93)

Cookie matching and fingerprinting configuration.
Cookie 匹配与指纹提取配置。

***

### forceCache?

> `optional` **forceCache**: `boolean`

Defined in: [packages/proxy/src/types.ts:137](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L137)

Force cache: Ignore `Cache-Control: no-store` etc. and force store in cache.
强制缓存：忽略 Cache-Control 指令强制入库。

***

### headers?

> `optional` **headers**: [`ProxyMatchPatterns`](../type-aliases/ProxyMatchPatterns.md) \| [`ProxyFieldConfig`](../type-aliases/ProxyFieldConfig.md)

Defined in: [packages/proxy/src/types.ts:88](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L88)

Headers matching and fingerprinting configuration.
请求头匹配与指纹提取配置。

***

### methods?

> `optional` **methods**: [`ProxyMatchPatterns`](../type-aliases/ProxyMatchPatterns.md)

Defined in: [packages/proxy/src/types.ts:78](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L78)

Allowed HTTP methods (e.g., "GET", ["GET", "POST"]).
允许的方法。

***

### offline?

> `optional` **offline**: `boolean`

Defined in: [packages/proxy/src/types.ts:142](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L142)

Strict offline mode: No network requests, read only from cache. Fails if cache miss.
严格离线模式：只读缓存，不发起网络请求。

***

### path?

> `optional` **path**: [`ProxyMatchPatterns`](../type-aliases/ProxyMatchPatterns.md)

Defined in: [packages/proxy/src/types.ts:73](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L73)

Path gatekeeping.
路径门控。
- string: Supports Glob patterns (including `!` negation).
- RegExp: Checks if `url.pathname` matches.

***

### query?

> `optional` **query**: [`ProxyMatchPatterns`](../type-aliases/ProxyMatchPatterns.md) \| [`ProxyFieldConfig`](../type-aliases/ProxyFieldConfig.md)

Defined in: [packages/proxy/src/types.ts:83](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L83)

Query parameter matching and fingerprinting configuration.
Query 参数匹配与指纹提取配置。

***

### response?

> `optional` **response**: `object`

Defined in: [packages/proxy/src/types.ts:104](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L104)

Response-side cacheability criteria.
响应侧可缓存性判定准则。

#### body?

> `optional` **body**: [`ProxyMatchPatterns`](../type-aliases/ProxyMatchPatterns.md)

Response body matching patterns (for text/json).
Supports Glob negation (e.g., "!*captcha*") to exclude dirty data.
响应体匹配模式（仅限文本/JSON）。支持 Glob 否定（如 "!*captcha*"）来排除脏数据。

#### headers?

> `optional` **headers**: [`ProxyFieldConfig`](../type-aliases/ProxyFieldConfig.md)

Required or forbidden response headers.
响应头匹配要求。

#### minLength?

> `optional` **minLength**: `number`

Minimum body length (in bytes) to be considered valid.
最小有效响应体长度（字节），防止缓存截断或错误页面。

#### statuses?

> `optional` **statuses**: [`ProxyMatchPatterns`](../type-aliases/ProxyMatchPatterns.md)

Allowed HTTP statuses.
允许缓存的状态码模式。

***

### staleIfError?

> `optional` **staleIfError**: `boolean`

Defined in: [packages/proxy/src/types.ts:132](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L132)

Fault tolerance: If backend fails (network error or 5xx), return stale cache if available.
容错机制：当后端请求失败且存在旧缓存时，强制返回旧缓存。
