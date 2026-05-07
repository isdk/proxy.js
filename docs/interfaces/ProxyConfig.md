[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / ProxyConfig

# Interface: ProxyConfig

Defined in: [types.ts:63](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L63)

代理拦截器全局配置

## Properties

### default

> **default**: [`SiteCacheConfig`](SiteCacheConfig.md)

Defined in: [types.ts:65](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L65)

默认缓存配置，当请求的域名未在 sites 中匹配时使用

***

### sites

> **sites**: `Record`\<`string`, [`SiteCacheConfig`](SiteCacheConfig.md)\>

Defined in: [types.ts:67](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L67)

针对特定域名的精细化缓存配置

***

### storagePath?

> `optional` **storagePath**: `string`

Defined in: [types.ts:69](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L69)

磁盘缓存（cacache）的物理存储路径，可选，默认为系统临时目录
