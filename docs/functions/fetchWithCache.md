[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / fetchWithCache

# Function: fetchWithCache()

> **fetchWithCache**(`request`, `fetcher`, `options`): `Promise`\<`Response`\>

Defined in: [packages/proxy/src/core/fetchWithCache.ts:233](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/core/fetchWithCache.ts#L233)

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
