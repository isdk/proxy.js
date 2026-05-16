[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / FetchWithCacheOptions

# Interface: FetchWithCacheOptions

Defined in: [packages/proxy/src/core/fetchWithCache.ts:18](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/fetchWithCache.ts#L18)

fetchWithCache 选项

## Extended by

- [`FetchWithCacheContext`](FetchWithCacheContext.md)

## Properties

### activeCacheWrites?

> `optional` **activeCacheWrites**: `Map`\<`string`, `Promise`\<`void`\>\>

Defined in: [packages/proxy/src/core/fetchWithCache.ts:34](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/fetchWithCache.ts#L34)

并发写入任务追踪器

***

### backgroundUpdate?

> `optional` **backgroundUpdate**: `boolean`

Defined in: [packages/proxy/src/core/fetchWithCache.ts:24](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/fetchWithCache.ts#L24)

是否启用后台异步更新 (SWR)

***

### cache

> **cache**: [`SmartCache`](../classes/SmartCache.md)

Defined in: [packages/proxy/src/core/fetchWithCache.ts:20](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/fetchWithCache.ts#L20)

混合缓存实例

***

### config

> **config**: [`ProxySiteConfig`](ProxySiteConfig.md)

Defined in: [packages/proxy/src/core/fetchWithCache.ts:22](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/fetchWithCache.ts#L22)

站点级基础配置

***

### generateKey()?

> `optional` **generateKey**: (`req`, `siteConfig`, `bodyState?`, `effectiveConfig?`) => `Promise`\<`string`\>

Defined in: [packages/proxy/src/core/fetchWithCache.ts:30](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/fetchWithCache.ts#L30)

自定义缓存键生成函数

根据 Request 对象和配置生成唯一的缓存指纹 (异步)

#### Parameters

##### req

`Request`

请求对象

##### siteConfig

[`ProxySiteConfig`](ProxySiteConfig.md)

站点级配置

##### bodyState?

可选的 Body 读取状态（用于性能优化，避免重复读取）

###### checked

`boolean`

###### json?

`any`

###### limit

`number`

###### text

`string` \| `null`

##### effectiveConfig?

[`ProxyCacheRule`](ProxyCacheRule.md)

可选的最终生效配置（用于性能优化，避免重复合并）

#### Returns

`Promise`\<`string`\>

***

### onBackgroundUpdate()?

> `optional` **onBackgroundUpdate**: (`promise`) => `void`

Defined in: [packages/proxy/src/core/fetchWithCache.ts:28](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/fetchWithCache.ts#L28)

后台更新 Promise 触发时的回调

#### Parameters

##### promise

`Promise`\<`Response`\>

#### Returns

`void`

***

### refresh?

> `optional` **refresh**: `boolean`

Defined in: [packages/proxy/src/core/fetchWithCache.ts:26](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/fetchWithCache.ts#L26)

是否强制刷新缓存（跳过读取，但请求成功后会更新缓存）
