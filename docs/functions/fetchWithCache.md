[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / fetchWithCache

# Function: fetchWithCache()

> **fetchWithCache**(`request`, `fetcher`, `options`): `Promise`\<`Response`\>

Defined in: [packages/proxy/src/core/fetchWithCache.ts:223](https://github.com/isdk/proxy.js/blob/6f3366d94dc84bfa077995cd404aa1b780ba62a1/src/core/fetchWithCache.ts#L223)

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
