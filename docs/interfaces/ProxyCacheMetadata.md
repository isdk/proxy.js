[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / ProxyCacheMetadata

# Interface: ProxyCacheMetadata

Defined in: [packages/proxy/src/types.ts:178](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L178)

Cache Metadata.
缓存元数据。

## Extended by

- [`ProxyCacheEntry`](ProxyCacheEntry.md)

## Properties

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [packages/proxy/src/types.ts:182](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L182)

Response headers object. 响应头对象。

***

### method

> **method**: `string`

Defined in: [packages/proxy/src/types.ts:188](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L188)

Original request method. 原始请求方法。

***

### policy

> **policy**: `any`

Defined in: [packages/proxy/src/types.ts:184](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L184)

http-cache-semantics policy object. 策略对象，包含 TTL。

***

### size

> **size**: `number`

Defined in: [packages/proxy/src/types.ts:192](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L192)

Byte length of the body. Body 的字节长度。

***

### status

> **status**: `number`

Defined in: [packages/proxy/src/types.ts:180](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L180)

HTTP Status Code. HTTP 状态码。

***

### timestamp

> **timestamp**: `number`

Defined in: [packages/proxy/src/types.ts:190](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L190)

Timestamp when cache was written. 写入时间戳。

***

### url

> **url**: `string`

Defined in: [packages/proxy/src/types.ts:186](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L186)

Original request URL. 原始请求 URL。
