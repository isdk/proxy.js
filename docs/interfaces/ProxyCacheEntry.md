[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / ProxyCacheEntry

# Interface: ProxyCacheEntry

Defined in: [packages/proxy/src/types.ts:169](https://github.com/isdk/proxy.js/blob/6f3366d94dc84bfa077995cd404aa1b780ba62a1/src/types.ts#L169)

Complete Cache Entry.
完整的缓存条目。

## Extends

- [`ProxyCacheMetadata`](ProxyCacheMetadata.md)

## Properties

### body

> **body**: `any`

Defined in: [packages/proxy/src/types.ts:171](https://github.com/isdk/proxy.js/blob/6f3366d94dc84bfa077995cd404aa1b780ba62a1/src/types.ts#L171)

Response body data: Buffer for small files, Readable Stream for large ones. 响应体数据。

***

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [packages/proxy/src/types.ts:152](https://github.com/isdk/proxy.js/blob/6f3366d94dc84bfa077995cd404aa1b780ba62a1/src/types.ts#L152)

Response headers object. 响应头对象。

#### Inherited from

[`ProxyCacheMetadata`](ProxyCacheMetadata.md).[`headers`](ProxyCacheMetadata.md#headers)

***

### method

> **method**: `string`

Defined in: [packages/proxy/src/types.ts:158](https://github.com/isdk/proxy.js/blob/6f3366d94dc84bfa077995cd404aa1b780ba62a1/src/types.ts#L158)

Original request method. 原始请求方法。

#### Inherited from

[`ProxyCacheMetadata`](ProxyCacheMetadata.md).[`method`](ProxyCacheMetadata.md#method)

***

### policy

> **policy**: `any`

Defined in: [packages/proxy/src/types.ts:154](https://github.com/isdk/proxy.js/blob/6f3366d94dc84bfa077995cd404aa1b780ba62a1/src/types.ts#L154)

http-cache-semantics policy object. 策略对象，包含 TTL。

#### Inherited from

[`ProxyCacheMetadata`](ProxyCacheMetadata.md).[`policy`](ProxyCacheMetadata.md#policy)

***

### size

> **size**: `number`

Defined in: [packages/proxy/src/types.ts:162](https://github.com/isdk/proxy.js/blob/6f3366d94dc84bfa077995cd404aa1b780ba62a1/src/types.ts#L162)

Byte length of the body. Body 的字节长度。

#### Inherited from

[`ProxyCacheMetadata`](ProxyCacheMetadata.md).[`size`](ProxyCacheMetadata.md#size)

***

### status

> **status**: `number`

Defined in: [packages/proxy/src/types.ts:150](https://github.com/isdk/proxy.js/blob/6f3366d94dc84bfa077995cd404aa1b780ba62a1/src/types.ts#L150)

HTTP Status Code. HTTP 状态码。

#### Inherited from

[`ProxyCacheMetadata`](ProxyCacheMetadata.md).[`status`](ProxyCacheMetadata.md#status)

***

### timestamp

> **timestamp**: `number`

Defined in: [packages/proxy/src/types.ts:160](https://github.com/isdk/proxy.js/blob/6f3366d94dc84bfa077995cd404aa1b780ba62a1/src/types.ts#L160)

Timestamp when cache was written. 写入时间戳。

#### Inherited from

[`ProxyCacheMetadata`](ProxyCacheMetadata.md).[`timestamp`](ProxyCacheMetadata.md#timestamp)

***

### url

> **url**: `string`

Defined in: [packages/proxy/src/types.ts:156](https://github.com/isdk/proxy.js/blob/6f3366d94dc84bfa077995cd404aa1b780ba62a1/src/types.ts#L156)

Original request URL. 原始请求 URL。

#### Inherited from

[`ProxyCacheMetadata`](ProxyCacheMetadata.md).[`url`](ProxyCacheMetadata.md#url)
