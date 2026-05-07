[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / FetchWithCacheOptions

# Interface: FetchWithCacheOptions

Defined in: [core/fetchWithCache.ts:11](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/fetchWithCache.ts#L11)

fetchWithCache 选项

## Extended by

- [`FetchWithCacheContext`](FetchWithCacheContext.md)

## Properties

### activeCacheWrites?

> `optional` **activeCacheWrites**: `Map`\<`string`, `Promise`\<`void`\>\>

Defined in: [core/fetchWithCache.ts:27](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/fetchWithCache.ts#L27)

并发写入任务追踪器
传入一个外部维护的 Map，用于在跨请求、跨实例时防止针对同一文件的并发重复下载。
Map 的 Key 是缓存 Key，Value 是一个代表写入完成的 Promise。

***

### backgroundUpdate?

> `optional` **backgroundUpdate**: `boolean`

Defined in: [core/fetchWithCache.ts:17](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/fetchWithCache.ts#L17)

是否启用后台异步更新 (SWR)

***

### cache

> **cache**: [`SmartCache`](../classes/SmartCache.md)

Defined in: [core/fetchWithCache.ts:13](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/fetchWithCache.ts#L13)

混合缓存实例

***

### config

> **config**: [`SiteCacheConfig`](SiteCacheConfig.md)

Defined in: [core/fetchWithCache.ts:15](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/fetchWithCache.ts#L15)

站点级缓存配置

***

### generateKey()?

> `optional` **generateKey**: (`req`, `config`) => `string`

Defined in: [core/fetchWithCache.ts:21](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/fetchWithCache.ts#L21)

自定义缓存键生成函数

根据 Request 和配置生成唯一的缓存键

#### Parameters

##### req

`Request`

##### config

[`SiteCacheConfig`](SiteCacheConfig.md)

#### Returns

`string`

***

### onBackgroundUpdate()?

> `optional` **onBackgroundUpdate**: (`promise`) => `void`

Defined in: [core/fetchWithCache.ts:19](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/fetchWithCache.ts#L19)

后台更新 Promise 触发时的回调

#### Parameters

##### promise

`Promise`\<`Response`\>

#### Returns

`void`
