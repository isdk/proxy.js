[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / CacheEntry

# Interface: CacheEntry

Defined in: [types.ts:55](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L55)

完整的缓存条目

## Extends

- [`CacheMetadata`](CacheMetadata.md)

## Properties

### body

> **body**: `any`

Defined in: [types.ts:57](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L57)

响应体数据：小文件为 Buffer，大文件为可读流

***

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types.ts:39](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L39)

响应头对象

#### Inherited from

[`CacheMetadata`](CacheMetadata.md).[`headers`](CacheMetadata.md#headers)

***

### method

> **method**: `string`

Defined in: [types.ts:45](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L45)

原始请求方法

#### Inherited from

[`CacheMetadata`](CacheMetadata.md).[`method`](CacheMetadata.md#method)

***

### policy

> **policy**: `any`

Defined in: [types.ts:41](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L41)

http-cache-semantics 策略对象，包含 TTL 和缓存指令

#### Inherited from

[`CacheMetadata`](CacheMetadata.md).[`policy`](CacheMetadata.md#policy)

***

### size

> **size**: `number`

Defined in: [types.ts:49](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L49)

Body 的字节长度，用于精确区分“空响应”与“未入内存的大响应”

#### Inherited from

[`CacheMetadata`](CacheMetadata.md).[`size`](CacheMetadata.md#size)

***

### status

> **status**: `number`

Defined in: [types.ts:37](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L37)

HTTP 状态码

#### Inherited from

[`CacheMetadata`](CacheMetadata.md).[`status`](CacheMetadata.md#status)

***

### timestamp

> **timestamp**: `number`

Defined in: [types.ts:47](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L47)

缓存写入时的时间戳

#### Inherited from

[`CacheMetadata`](CacheMetadata.md).[`timestamp`](CacheMetadata.md#timestamp)

***

### url

> **url**: `string`

Defined in: [types.ts:43](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L43)

原始请求 URL

#### Inherited from

[`CacheMetadata`](CacheMetadata.md).[`url`](CacheMetadata.md#url)
