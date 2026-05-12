[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / PrefetchOptions

# Interface: PrefetchOptions

Defined in: [packages/proxy/src/core/prefetch.ts:17](https://github.com/isdk/proxy.js/blob/6f3366d94dc84bfa077995cd404aa1b780ba62a1/src/core/prefetch.ts#L17)

## Properties

### cache

> **cache**: [`SmartCache`](../classes/SmartCache.md)

Defined in: [packages/proxy/src/core/prefetch.ts:23](https://github.com/isdk/proxy.js/blob/6f3366d94dc84bfa077995cd404aa1b780ba62a1/src/core/prefetch.ts#L23)

SmartCache 实例

***

### concurrency?

> `optional` **concurrency**: `number`

Defined in: [packages/proxy/src/core/prefetch.ts:27](https://github.com/isdk/proxy.js/blob/6f3366d94dc84bfa077995cd404aa1b780ba62a1/src/core/prefetch.ts#L27)

并发数，默认 3

***

### config

> **config**: [`ProxyConfig`](ProxyConfig.md)

Defined in: [packages/proxy/src/core/prefetch.ts:21](https://github.com/isdk/proxy.js/blob/6f3366d94dc84bfa077995cd404aa1b780ba62a1/src/core/prefetch.ts#L21)

完整的代理配置

***

### fetcher()?

> `optional` **fetcher**: (`req`) => `Promise`\<`Response`\>

Defined in: [packages/proxy/src/core/prefetch.ts:25](https://github.com/isdk/proxy.js/blob/6f3366d94dc84bfa077995cd404aa1b780ba62a1/src/core/prefetch.ts#L25)

自定义 fetcher，默认使用 globalThis.fetch

#### Parameters

##### req

`Request`

#### Returns

`Promise`\<`Response`\>

***

### onProgress()?

> `optional` **onProgress**: (`completed`, `total`, `url`) => `void`

Defined in: [packages/proxy/src/core/prefetch.ts:29](https://github.com/isdk/proxy.js/blob/6f3366d94dc84bfa077995cd404aa1b780ba62a1/src/core/prefetch.ts#L29)

进度回调 (completed, total, url)

#### Parameters

##### completed

`number`

##### total

`number`

##### url

`string`

#### Returns

`void`

***

### signal?

> `optional` **signal**: `AbortSignal`

Defined in: [packages/proxy/src/core/prefetch.ts:31](https://github.com/isdk/proxy.js/blob/6f3366d94dc84bfa077995cd404aa1b780ba62a1/src/core/prefetch.ts#L31)

取消信号

***

### urls

> **urls**: [`PrefetchRequest`](PrefetchRequest.md)[]

Defined in: [packages/proxy/src/core/prefetch.ts:19](https://github.com/isdk/proxy.js/blob/6f3366d94dc84bfa077995cd404aa1b780ba62a1/src/core/prefetch.ts#L19)

要预缓存的 URL 列表及其请求选项
