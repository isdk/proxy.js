[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / fetchWithCache

# Function: fetchWithCache()

> **fetchWithCache**(`request`, `fetcher`, `options`): `Promise`\<`Response`\>

Defined in: [packages/proxy/src/core/fetchWithCache.ts:245](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/fetchWithCache.ts#L245)

核心协调函数：协调请求、缓存命中、并发控制和 SWR

## Parameters

### request

`Request`

### fetcher

(`req`) => `Promise`\<`Response`\>

### options

[`FetchWithCacheOptions`](../interfaces/FetchWithCacheOptions.md)

## Returns

`Promise`\<`Response`\>
