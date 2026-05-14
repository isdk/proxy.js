[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / ProxyCacheMetadata

# Interface: ProxyCacheMetadata

Defined in: [packages/proxy/src/types.ts:148](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/types.ts#L148)

Cache Metadata.
缓存元数据。

## Extended by

- [`ProxyCacheEntry`](ProxyCacheEntry.md)

## Properties

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [packages/proxy/src/types.ts:152](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/types.ts#L152)

Response headers object. 响应头对象。

***

### method

> **method**: `string`

Defined in: [packages/proxy/src/types.ts:158](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/types.ts#L158)

Original request method. 原始请求方法。

***

### policy

> **policy**: `any`

Defined in: [packages/proxy/src/types.ts:154](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/types.ts#L154)

http-cache-semantics policy object. 策略对象，包含 TTL。

***

### size

> **size**: `number`

Defined in: [packages/proxy/src/types.ts:162](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/types.ts#L162)

Byte length of the body. Body 的字节长度。

***

### status

> **status**: `number`

Defined in: [packages/proxy/src/types.ts:150](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/types.ts#L150)

HTTP Status Code. HTTP 状态码。

***

### timestamp

> **timestamp**: `number`

Defined in: [packages/proxy/src/types.ts:160](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/types.ts#L160)

Timestamp when cache was written. 写入时间戳。

***

### url

> **url**: `string`

Defined in: [packages/proxy/src/types.ts:156](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/types.ts#L156)

Original request URL. 原始请求 URL。
