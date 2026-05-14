[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / FetchWithCacheContext

# Interface: FetchWithCacheContext

Defined in: [packages/proxy/src/core/fetchWithCache.ts:34](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/core/fetchWithCache.ts#L34)

内部流水线上下文

## Extends

- [`FetchWithCacheOptions`](FetchWithCacheOptions.md)

## Properties

### activeCacheWrites

> **activeCacheWrites**: `Map`\<`string`, `Promise`\<`void`\>\>

Defined in: [packages/proxy/src/core/fetchWithCache.ts:38](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/core/fetchWithCache.ts#L38)

并发写入任务追踪器

#### Overrides

[`FetchWithCacheOptions`](FetchWithCacheOptions.md).[`activeCacheWrites`](FetchWithCacheOptions.md#activecachewrites)

***

### backgroundUpdate?

> `optional` **backgroundUpdate**: `boolean`

Defined in: [packages/proxy/src/core/fetchWithCache.ts:22](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/core/fetchWithCache.ts#L22)

是否启用后台异步更新 (SWR)

#### Inherited from

[`FetchWithCacheOptions`](FetchWithCacheOptions.md).[`backgroundUpdate`](FetchWithCacheOptions.md#backgroundupdate)

***

### cache

> **cache**: [`SmartCache`](../classes/SmartCache.md)

Defined in: [packages/proxy/src/core/fetchWithCache.ts:18](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/core/fetchWithCache.ts#L18)

混合缓存实例

#### Inherited from

[`FetchWithCacheOptions`](FetchWithCacheOptions.md).[`cache`](FetchWithCacheOptions.md#cache)

***

### cacheKey

> **cacheKey**: `string`

Defined in: [packages/proxy/src/core/fetchWithCache.ts:37](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/core/fetchWithCache.ts#L37)

***

### config

> **config**: [`ProxySiteConfig`](ProxySiteConfig.md)

Defined in: [packages/proxy/src/core/fetchWithCache.ts:20](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/core/fetchWithCache.ts#L20)

站点级基础配置

#### Inherited from

[`FetchWithCacheOptions`](FetchWithCacheOptions.md).[`config`](FetchWithCacheOptions.md#config)

***

### effectiveConfig

> **effectiveConfig**: [`ProxyCacheRule`](ProxyCacheRule.md)

Defined in: [packages/proxy/src/core/fetchWithCache.ts:40](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/core/fetchWithCache.ts#L40)

最终生效的合并配置

***

### fetcher()

> **fetcher**: (`req`) => `Promise`\<`Response`\>

Defined in: [packages/proxy/src/core/fetchWithCache.ts:36](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/core/fetchWithCache.ts#L36)

#### Parameters

##### req

`Request`

#### Returns

`Promise`\<`Response`\>

***

### generateKey()?

> `optional` **generateKey**: (`req`, `config`) => `Promise`\<`string`\>

Defined in: [packages/proxy/src/core/fetchWithCache.ts:26](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/core/fetchWithCache.ts#L26)

自定义缓存键生成函数

根据 Request 对象和配置生成唯一的缓存指纹 (异步)

#### Parameters

##### req

`Request`

##### config

[`ProxySiteConfig`](ProxySiteConfig.md)

#### Returns

`Promise`\<`string`\>

#### Inherited from

[`FetchWithCacheOptions`](FetchWithCacheOptions.md).[`generateKey`](FetchWithCacheOptions.md#generatekey)

***

### onBackgroundUpdate()?

> `optional` **onBackgroundUpdate**: (`promise`) => `void`

Defined in: [packages/proxy/src/core/fetchWithCache.ts:24](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/core/fetchWithCache.ts#L24)

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

Defined in: [packages/proxy/src/core/fetchWithCache.ts:35](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/core/fetchWithCache.ts#L35)
