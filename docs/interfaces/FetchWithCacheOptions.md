[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / FetchWithCacheOptions

# Interface: FetchWithCacheOptions

Defined in: [packages/proxy/src/core/fetchWithCache.ts:13](https://github.com/isdk/proxy.js/blob/bbcacb8b0dfe43d317743a3f98aa0f9f1b323aad/src/core/fetchWithCache.ts#L13)

fetchWithCache 选项

## Extended by

- [`FetchWithCacheContext`](FetchWithCacheContext.md)

## Properties

### activeCacheWrites?

> `optional` **activeCacheWrites**: `Map`\<`string`, `Promise`\<`void`\>\>

Defined in: [packages/proxy/src/core/fetchWithCache.ts:27](https://github.com/isdk/proxy.js/blob/bbcacb8b0dfe43d317743a3f98aa0f9f1b323aad/src/core/fetchWithCache.ts#L27)

并发写入任务追踪器

***

### backgroundUpdate?

> `optional` **backgroundUpdate**: `boolean`

Defined in: [packages/proxy/src/core/fetchWithCache.ts:19](https://github.com/isdk/proxy.js/blob/bbcacb8b0dfe43d317743a3f98aa0f9f1b323aad/src/core/fetchWithCache.ts#L19)

是否启用后台异步更新 (SWR)

***

### cache

> **cache**: [`SmartCache`](../classes/SmartCache.md)

Defined in: [packages/proxy/src/core/fetchWithCache.ts:15](https://github.com/isdk/proxy.js/blob/bbcacb8b0dfe43d317743a3f98aa0f9f1b323aad/src/core/fetchWithCache.ts#L15)

混合缓存实例

***

### config

> **config**: [`ProxySiteConfig`](ProxySiteConfig.md)

Defined in: [packages/proxy/src/core/fetchWithCache.ts:17](https://github.com/isdk/proxy.js/blob/bbcacb8b0dfe43d317743a3f98aa0f9f1b323aad/src/core/fetchWithCache.ts#L17)

站点级基础配置

***

### generateKey()?

> `optional` **generateKey**: (`req`, `config`) => `Promise`\<`string`\>

Defined in: [packages/proxy/src/core/fetchWithCache.ts:23](https://github.com/isdk/proxy.js/blob/bbcacb8b0dfe43d317743a3f98aa0f9f1b323aad/src/core/fetchWithCache.ts#L23)

自定义缓存键生成函数

根据 Request 对象和配置生成唯一的缓存指纹 (异步)

#### Parameters

##### req

`Request`

##### config

[`ProxySiteConfig`](ProxySiteConfig.md)

#### Returns

`Promise`\<`string`\>

***

### onBackgroundUpdate()?

> `optional` **onBackgroundUpdate**: (`promise`) => `void`

Defined in: [packages/proxy/src/core/fetchWithCache.ts:21](https://github.com/isdk/proxy.js/blob/bbcacb8b0dfe43d317743a3f98aa0f9f1b323aad/src/core/fetchWithCache.ts#L21)

后台更新 Promise 触发时的回调

#### Parameters

##### promise

`Promise`\<`Response`\>

#### Returns

`void`
