[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / ProxyCacheEntry

# Interface: ProxyCacheEntry

Defined in: [packages/proxy/src/types.ts:199](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L199)

Complete Cache Entry.
完整的缓存条目。

## Extends

- [`ProxyCacheMetadata`](ProxyCacheMetadata.md)

## Properties

### body

> **body**: `any`

Defined in: [packages/proxy/src/types.ts:201](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L201)

Response body data: Buffer for small files, Readable Stream for large ones. 响应体数据。

***

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [packages/proxy/src/types.ts:182](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L182)

Response headers object. 响应头对象。

#### Inherited from

[`ProxyCacheMetadata`](ProxyCacheMetadata.md).[`headers`](ProxyCacheMetadata.md#headers)

***

### method

> **method**: `string`

Defined in: [packages/proxy/src/types.ts:188](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L188)

Original request method. 原始请求方法。

#### Inherited from

[`ProxyCacheMetadata`](ProxyCacheMetadata.md).[`method`](ProxyCacheMetadata.md#method)

***

### policy

> **policy**: `any`

Defined in: [packages/proxy/src/types.ts:184](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L184)

http-cache-semantics policy object. 策略对象，包含 TTL。

#### Inherited from

[`ProxyCacheMetadata`](ProxyCacheMetadata.md).[`policy`](ProxyCacheMetadata.md#policy)

***

### size

> **size**: `number`

Defined in: [packages/proxy/src/types.ts:192](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L192)

Byte length of the body. Body 的字节长度。

#### Inherited from

[`ProxyCacheMetadata`](ProxyCacheMetadata.md).[`size`](ProxyCacheMetadata.md#size)

***

### status

> **status**: `number`

Defined in: [packages/proxy/src/types.ts:180](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L180)

HTTP Status Code. HTTP 状态码。

#### Inherited from

[`ProxyCacheMetadata`](ProxyCacheMetadata.md).[`status`](ProxyCacheMetadata.md#status)

***

### timestamp

> **timestamp**: `number`

Defined in: [packages/proxy/src/types.ts:190](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L190)

Timestamp when cache was written. 写入时间戳。

#### Inherited from

[`ProxyCacheMetadata`](ProxyCacheMetadata.md).[`timestamp`](ProxyCacheMetadata.md#timestamp)

***

### url

> **url**: `string`

Defined in: [packages/proxy/src/types.ts:186](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L186)

Original request URL. 原始请求 URL。

#### Inherited from

[`ProxyCacheMetadata`](ProxyCacheMetadata.md).[`url`](ProxyCacheMetadata.md#url)
