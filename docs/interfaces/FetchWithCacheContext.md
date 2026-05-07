[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / FetchWithCacheContext

# Interface: FetchWithCacheContext

Defined in: [core/fetchWithCache.ts:31](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/fetchWithCache.ts#L31)

内部流水线上下文，合并了入参和计算出的关键状态

## Extends

- [`FetchWithCacheOptions`](FetchWithCacheOptions.md)

## Properties

### activeCacheWrites

> **activeCacheWrites**: `Map`\<`string`, `Promise`\<`void`\>\>

Defined in: [core/fetchWithCache.ts:35](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/fetchWithCache.ts#L35)

并发写入任务追踪器
传入一个外部维护的 Map，用于在跨请求、跨实例时防止针对同一文件的并发重复下载。
Map 的 Key 是缓存 Key，Value 是一个代表写入完成的 Promise。

#### Overrides

[`FetchWithCacheOptions`](FetchWithCacheOptions.md).[`activeCacheWrites`](FetchWithCacheOptions.md#activecachewrites)

***

### backgroundUpdate?

> `optional` **backgroundUpdate**: `boolean`

Defined in: [core/fetchWithCache.ts:17](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/fetchWithCache.ts#L17)

是否启用后台异步更新 (SWR)

#### Inherited from

[`FetchWithCacheOptions`](FetchWithCacheOptions.md).[`backgroundUpdate`](FetchWithCacheOptions.md#backgroundupdate)

***

### cache

> **cache**: [`SmartCache`](../classes/SmartCache.md)

Defined in: [core/fetchWithCache.ts:13](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/fetchWithCache.ts#L13)

混合缓存实例

#### Inherited from

[`FetchWithCacheOptions`](FetchWithCacheOptions.md).[`cache`](FetchWithCacheOptions.md#cache)

***

### cacheKey

> **cacheKey**: `string`

Defined in: [core/fetchWithCache.ts:34](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/fetchWithCache.ts#L34)

***

### config

> **config**: [`SiteCacheConfig`](SiteCacheConfig.md)

Defined in: [core/fetchWithCache.ts:15](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/fetchWithCache.ts#L15)

站点级缓存配置

#### Inherited from

[`FetchWithCacheOptions`](FetchWithCacheOptions.md).[`config`](FetchWithCacheOptions.md#config)

***

### fetcher()

> **fetcher**: (`req`) => `Promise`\<`Response`\>

Defined in: [core/fetchWithCache.ts:33](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/fetchWithCache.ts#L33)

#### Parameters

##### req

`Request`

#### Returns

`Promise`\<`Response`\>

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

#### Inherited from

[`FetchWithCacheOptions`](FetchWithCacheOptions.md).[`generateKey`](FetchWithCacheOptions.md#generatekey)

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

#### Inherited from

[`FetchWithCacheOptions`](FetchWithCacheOptions.md).[`onBackgroundUpdate`](FetchWithCacheOptions.md#onbackgroundupdate)

***

### request

> **request**: `Request`

Defined in: [core/fetchWithCache.ts:32](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/fetchWithCache.ts#L32)
