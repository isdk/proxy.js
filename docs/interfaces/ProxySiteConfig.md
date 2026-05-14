[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / ProxySiteConfig

# Interface: ProxySiteConfig

Defined in: [packages/proxy/src/types.ts:119](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/types.ts#L119)

Site-level Cache Configuration.
站点级缓存配置。

## Extends

- [`ProxyCacheRule`](ProxyCacheRule.md)

## Properties

### body?

> `optional` **body**: [`ProxyMatchPatterns`](../type-aliases/ProxyMatchPatterns.md) \| [`ProxyFieldConfig`](../type-aliases/ProxyFieldConfig.md) \| [`ProxyBodyConfig`](ProxyBodyConfig.md)

Defined in: [packages/proxy/src/types.ts:96](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/types.ts#L96)

Body matching and extraction configuration.
请求体匹配与提取配置。

#### Inherited from

[`ProxyCacheRule`](ProxyCacheRule.md).[`body`](ProxyCacheRule.md#body)

***

### cookies?

> `optional` **cookies**: [`ProxyMatchPatterns`](../type-aliases/ProxyMatchPatterns.md) \| [`ProxyFieldConfig`](../type-aliases/ProxyFieldConfig.md)

Defined in: [packages/proxy/src/types.ts:91](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/types.ts#L91)

Cookie matching and fingerprinting configuration.
Cookie 匹配与指纹提取配置。

#### Inherited from

[`ProxyCacheRule`](ProxyCacheRule.md).[`cookies`](ProxyCacheRule.md#cookies)

***

### forceCache?

> `optional` **forceCache**: `boolean`

Defined in: [packages/proxy/src/types.ts:107](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/types.ts#L107)

Force cache: Ignore `Cache-Control: no-store` etc. and force store in cache.
强制缓存：忽略 Cache-Control 指令强制入库。

#### Inherited from

[`ProxyCacheRule`](ProxyCacheRule.md).[`forceCache`](ProxyCacheRule.md#forcecache)

***

### headers?

> `optional` **headers**: [`ProxyMatchPatterns`](../type-aliases/ProxyMatchPatterns.md) \| [`ProxyFieldConfig`](../type-aliases/ProxyFieldConfig.md)

Defined in: [packages/proxy/src/types.ts:86](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/types.ts#L86)

Headers matching and fingerprinting configuration.
请求头匹配与指纹提取配置。

#### Inherited from

[`ProxyCacheRule`](ProxyCacheRule.md).[`headers`](ProxyCacheRule.md#headers)

***

### methods?

> `optional` **methods**: [`ProxyMatchPatterns`](../type-aliases/ProxyMatchPatterns.md)

Defined in: [packages/proxy/src/types.ts:76](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/types.ts#L76)

Allowed HTTP methods (e.g., "GET", ["GET", "POST"]).
允许的方法。

#### Inherited from

[`ProxyCacheRule`](ProxyCacheRule.md).[`methods`](ProxyCacheRule.md#methods)

***

### offline?

> `optional` **offline**: `boolean`

Defined in: [packages/proxy/src/types.ts:112](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/types.ts#L112)

Strict offline mode: No network requests, read only from cache. Fails if cache miss.
严格离线模式：只读缓存，不发起网络请求。

#### Inherited from

[`ProxyCacheRule`](ProxyCacheRule.md).[`offline`](ProxyCacheRule.md#offline)

***

### path?

> `optional` **path**: [`ProxyMatchPatterns`](../type-aliases/ProxyMatchPatterns.md)

Defined in: [packages/proxy/src/types.ts:71](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/types.ts#L71)

Path gatekeeping.
路径门控。
- string: Supports Glob patterns (including `!` negation).
- RegExp: Checks if `url.pathname` matches.

#### Inherited from

[`ProxyCacheRule`](ProxyCacheRule.md).[`path`](ProxyCacheRule.md#path)

***

### query?

> `optional` **query**: [`ProxyMatchPatterns`](../type-aliases/ProxyMatchPatterns.md) \| [`ProxyFieldConfig`](../type-aliases/ProxyFieldConfig.md)

Defined in: [packages/proxy/src/types.ts:81](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/types.ts#L81)

Query parameter matching and fingerprinting configuration.
Query 参数匹配与指纹提取配置。

#### Inherited from

[`ProxyCacheRule`](ProxyCacheRule.md).[`query`](ProxyCacheRule.md#query)

***

### rules?

> `optional` **rules**: [`ProxyCacheRule`](ProxyCacheRule.md)[]

Defined in: [packages/proxy/src/types.ts:126](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/types.ts#L126)

List of granular path-based rules.
If provided, request must match at least one rule to be cacheable.
Matched rule will be deeply merged with site-level config.
细化路径匹配规则列表。匹配到的规则将与站点级配置进行深度合并。

***

### staleIfError?

> `optional` **staleIfError**: `boolean`

Defined in: [packages/proxy/src/types.ts:102](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/types.ts#L102)

Fault tolerance: If backend fails (network error or 5xx), return stale cache if available.
容错机制：当后端请求失败且存在旧缓存时，强制返回旧缓存。

#### Inherited from

[`ProxyCacheRule`](ProxyCacheRule.md).[`staleIfError`](ProxyCacheRule.md#staleiferror)
