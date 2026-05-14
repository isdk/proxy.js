[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / FetchWithCacheOptions

# Interface: FetchWithCacheOptions

Defined in: [packages/proxy/src/core/fetchWithCache.ts:16](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/core/fetchWithCache.ts#L16)

fetchWithCache 选项

## Extended by

- [`FetchWithCacheContext`](FetchWithCacheContext.md)

## Properties

### activeCacheWrites?

> `optional` **activeCacheWrites**: `Map`\<`string`, `Promise`\<`void`\>\>

Defined in: [packages/proxy/src/core/fetchWithCache.ts:30](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/core/fetchWithCache.ts#L30)

并发写入任务追踪器

***

### backgroundUpdate?

> `optional` **backgroundUpdate**: `boolean`

Defined in: [packages/proxy/src/core/fetchWithCache.ts:22](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/core/fetchWithCache.ts#L22)

是否启用后台异步更新 (SWR)

***

### cache

> **cache**: [`SmartCache`](../classes/SmartCache.md)

Defined in: [packages/proxy/src/core/fetchWithCache.ts:18](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/core/fetchWithCache.ts#L18)

混合缓存实例

***

### config

> **config**: [`ProxySiteConfig`](ProxySiteConfig.md)

Defined in: [packages/proxy/src/core/fetchWithCache.ts:20](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/core/fetchWithCache.ts#L20)

站点级基础配置

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
