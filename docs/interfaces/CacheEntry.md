[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / CacheEntry

# Interface: CacheEntry

Defined in: [packages/proxy/src/types.ts:139](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L139)

完整的缓存条目

## Extends

- [`CacheMetadata`](CacheMetadata.md)

## Properties

### body

> **body**: `any`

Defined in: [packages/proxy/src/types.ts:141](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L141)

响应体数据：小文件为 Buffer，大文件为可读流

***

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [packages/proxy/src/types.ts:123](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L123)

响应头对象

#### Inherited from

[`CacheMetadata`](CacheMetadata.md).[`headers`](CacheMetadata.md#headers)

***

### method

> **method**: `string`

Defined in: [packages/proxy/src/types.ts:129](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L129)

原始请求方法

#### Inherited from

[`CacheMetadata`](CacheMetadata.md).[`method`](CacheMetadata.md#method)

***

### policy

> **policy**: `any`

Defined in: [packages/proxy/src/types.ts:125](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L125)

http-cache-semantics 策略对象，包含 TTL 和缓存指令

#### Inherited from

[`CacheMetadata`](CacheMetadata.md).[`policy`](CacheMetadata.md#policy)

***

### size

> **size**: `number`

Defined in: [packages/proxy/src/types.ts:133](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L133)

Body 的字节长度，用于精确区分“空响应”与“未入内存的大响应”

#### Inherited from

[`CacheMetadata`](CacheMetadata.md).[`size`](CacheMetadata.md#size)

***

### status

> **status**: `number`

Defined in: [packages/proxy/src/types.ts:121](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L121)

HTTP 状态码

#### Inherited from

[`CacheMetadata`](CacheMetadata.md).[`status`](CacheMetadata.md#status)

***

### timestamp

> **timestamp**: `number`

Defined in: [packages/proxy/src/types.ts:131](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L131)

缓存写入时的时间戳

#### Inherited from

[`CacheMetadata`](CacheMetadata.md).[`timestamp`](CacheMetadata.md#timestamp)

***

### url

> **url**: `string`

Defined in: [packages/proxy/src/types.ts:127](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L127)

原始请求 URL

#### Inherited from

[`CacheMetadata`](CacheMetadata.md).[`url`](CacheMetadata.md#url)
