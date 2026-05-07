[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / SiteCacheConfig

# Interface: SiteCacheConfig

Defined in: [types.ts:16](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L16)

站点级缓存配置

## Properties

### cookies?

> `optional` **cookies**: [`KeyFilterConfig`](KeyFilterConfig.md)

Defined in: [types.ts:22](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L22)

Cookie 过滤配置

***

### forceCache?

> `optional` **forceCache**: `boolean`

Defined in: [types.ts:26](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L26)

是否强制缓存一切响应（无视 no-store 等不缓存指令），用于极端的离线可用容错场景

***

### headers?

> `optional` **headers**: [`KeyFilterConfig`](KeyFilterConfig.md)

Defined in: [types.ts:20](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L20)

请求头过滤配置

***

### query?

> `optional` **query**: [`KeyFilterConfig`](KeyFilterConfig.md)

Defined in: [types.ts:18](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L18)

Query 参数过滤配置

***

### staleIfError?

> `optional` **staleIfError**: `boolean`

Defined in: [types.ts:24](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L24)

当后端请求失败且存在旧缓存时，是否强制返回旧缓存（容错机制）
