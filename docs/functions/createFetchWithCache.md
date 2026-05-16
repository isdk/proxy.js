[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / createFetchWithCache

# Function: createFetchWithCache()

> **createFetchWithCache**(`activeCacheWrites?`): (`request`, `fetcher`, `options`) => `Promise`\<`Response`\>

Defined in: [packages/proxy/src/core/createFetchWithCache.ts:16](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/createFetchWithCache.ts#L16)

单一职责高阶函数：专门用于封装和隔离 activeCacheWrites 并发追踪器。

每次调用此函数，都会创建一个完全独立的闭包 Map（或复用传入的 Map），
并返回一个绑定了该 Map 的 `fetchWithCache` 变体函数。
从而让使用者无需关心 `activeCacheWrites` 的维护，杜绝了误传或不传导致的并发击穿风险。

## Parameters

### activeCacheWrites?

`Map`\<`string`, `Promise`\<`void`\>\>

可选参数，用于跨实例共享的并发写入追踪器。
                           如果未提供，将自动创建一个新的 Map。
                           传入同一个 Map 可以让多个 `createFetchWithCache` 实例共享
                           并发追踪状态，从而在整个应用范围内防止缓存击穿。

## Returns

一个绑定了并发追踪器的 `fetchWithCache` 变体函数。

> (`request`, `fetcher`, `options`): `Promise`\<`Response`\>

### Parameters

#### request

`Request`

#### fetcher

(`req`) => `Promise`\<`Response`\>

#### options

[`FetchWithCacheOptions`](../interfaces/FetchWithCacheOptions.md)

### Returns

`Promise`\<`Response`\>
