[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / CacheMetadata

# Interface: CacheMetadata

Defined in: [types.ts:35](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L35)

缓存元数据

存储在 L1 内存和 L2 磁盘中的非 Body 信息。
即使 Body 过大未进入内存，此元数据也会驻留在内存中以供快速策略判定。

## Extended by

- [`CacheEntry`](CacheEntry.md)

## Properties

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types.ts:39](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L39)

响应头对象

***

### method

> **method**: `string`

Defined in: [types.ts:45](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L45)

原始请求方法

***

### policy

> **policy**: `any`

Defined in: [types.ts:41](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L41)

http-cache-semantics 策略对象，包含 TTL 和缓存指令

***

### size

> **size**: `number`

Defined in: [types.ts:49](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L49)

Body 的字节长度，用于精确区分“空响应”与“未入内存的大响应”

***

### status

> **status**: `number`

Defined in: [types.ts:37](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L37)

HTTP 状态码

***

### timestamp

> **timestamp**: `number`

Defined in: [types.ts:47](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L47)

缓存写入时的时间戳

***

### url

> **url**: `string`

Defined in: [types.ts:43](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/types.ts#L43)

原始请求 URL
