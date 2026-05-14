[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / createCachedFetch

# Function: createCachedFetch()

> **createCachedFetch**(`defaultOptions`): (`request`, `fetcher`, `overrideOptions?`) => `Promise`\<`Response`\>

Defined in: [packages/proxy/src/core/createCachedFetch.ts:17](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/core/createCachedFetch.ts#L17)

缓存请求工厂函数 (针对终端用户的顶层高阶 API)

为用户提供一个只需配置一次（如 Cache 实例、默认 Config），
即可在整个应用生命周期中随处调用的 `cachedFetch` 方法。

底层调用了 `createFetchWithCache` 来保证单一职能隔离，内部自动维护并发追踪。

## Parameters

### defaultOptions

[`FetchWithCacheOptions`](../interfaces/FetchWithCacheOptions.md)

默认缓存配置选项。
                      可以包含 `activeCacheWrites` 字段，用于跨多个 `createCachedFetch`
                      实例共享并发追踪状态，实现应用级别的缓存击穿防护。

## Returns

一个预配置的 `cachedFetch` 函数，可直接用于发起带缓存的请求。

> (`request`, `fetcher`, `overrideOptions?`): `Promise`\<`Response`\>

### Parameters

#### request

`Request`

#### fetcher

(`req`) => `Promise`\<`Response`\>

#### overrideOptions?

`Partial`\<[`FetchWithCacheOptions`](../interfaces/FetchWithCacheOptions.md)\>

### Returns

`Promise`\<`Response`\>
