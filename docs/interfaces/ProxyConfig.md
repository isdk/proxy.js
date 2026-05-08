[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / ProxyConfig

# Interface: ProxyConfig

Defined in: [types.ts:145](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/types.ts#L145)

代理拦截器全局配置

## Properties

### default

> **default**: [`SiteCacheConfig`](SiteCacheConfig.md)

Defined in: [types.ts:147](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/types.ts#L147)

默认缓存配置，当请求的域名未在 sites 中匹配时使用

***

### sites

> **sites**: `Record`\<`string`, [`SiteCacheConfig`](SiteCacheConfig.md)\>

Defined in: [types.ts:149](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/types.ts#L149)

针对特定域名的精细化缓存配置

***

### storagePath?

> `optional` **storagePath**: `string`

Defined in: [types.ts:151](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/types.ts#L151)

磁盘缓存（cacache）的物理存储路径，可选，默认为系统临时目录
