[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / SiteCacheConfig

# Interface: SiteCacheConfig

Defined in: [packages/proxy/src/types.ts:81](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L81)

站点级缓存配置

## Properties

### body?

> `optional` **body**: [`BodyFilterConfig`](BodyFilterConfig.md)

Defined in: [packages/proxy/src/types.ts:104](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L104)

请求体过滤配置 (仅限 JSON 类型)。
当方法为 POST/PUT/PATCH 且为 JSON 格式时，用于从 Body 中提取特定字段参与指纹计算。

***

### cacheRules?

> `optional` **cacheRules**: [`CacheRule`](CacheRule.md)[]

Defined in: [packages/proxy/src/types.ts:93](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L93)

精细化缓存规则列表。
如果配置了此项，请求必须匹配其中至少一条规则才会被允许进入缓存流程。
适用于只希望缓存特定 API 接口的场景。

***

### cookies?

> `optional` **cookies**: [`KeyFilterConfig`](KeyFilterConfig.md)

Defined in: [packages/proxy/src/types.ts:99](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L99)

Cookie 过滤配置：决定哪些 Cookie 字段参与缓存指纹计算

***

### forceCache?

> `optional` **forceCache**: `boolean`

Defined in: [packages/proxy/src/types.ts:108](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L108)

强制缓存：是否忽略 `Cache-Control: no-store` 等指令强制入库。

***

### headers?

> `optional` **headers**: [`KeyFilterConfig`](KeyFilterConfig.md)

Defined in: [packages/proxy/src/types.ts:97](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L97)

请求头过滤配置：决定哪些 Header 参与缓存指纹计算

***

### methods?

> `optional` **methods**: `string`[]

Defined in: [packages/proxy/src/types.ts:87](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L87)

允许缓存的 HTTP 方法列表。
默认值: ['GET', 'HEAD']。
若要缓存 POST/PUT，必须在此显式添加，并确保后端响应满足缓存条件（或开启 `forceCache`）。

***

### offline?

> `optional` **offline**: `boolean`

Defined in: [packages/proxy/src/types.ts:110](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L110)

严格离线模式：不发起任何网络请求，只读缓存。缓存未命中时抛出 OfflineCacheMissError

***

### query?

> `optional` **query**: [`KeyFilterConfig`](KeyFilterConfig.md)

Defined in: [packages/proxy/src/types.ts:95](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L95)

Query 参数过滤配置：决定哪些查询参数参与缓存指纹 (Cache Key) 的计算

***

### staleIfError?

> `optional` **staleIfError**: `boolean`

Defined in: [packages/proxy/src/types.ts:106](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L106)

容错机制：当后端请求失败（网络错误或 5xx）且存在旧缓存时，是否强制返回旧缓存
