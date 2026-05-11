[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / CacheMetadata

# Interface: CacheMetadata

Defined in: [packages/proxy/src/types.ts:119](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L119)

缓存元数据

存储在 L1 内存和 L2 磁盘中的非 Body 信息。
即使 Body 过大未进入内存，此元数据也会驻留在内存中以供快速策略判定。

## Extended by

- [`CacheEntry`](CacheEntry.md)

## Properties

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [packages/proxy/src/types.ts:123](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L123)

响应头对象

***

### method

> **method**: `string`

Defined in: [packages/proxy/src/types.ts:129](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L129)

原始请求方法

***

### policy

> **policy**: `any`

Defined in: [packages/proxy/src/types.ts:125](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L125)

http-cache-semantics 策略对象，包含 TTL 和缓存指令

***

### size

> **size**: `number`

Defined in: [packages/proxy/src/types.ts:133](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L133)

Body 的字节长度，用于精确区分“空响应”与“未入内存的大响应”

***

### status

> **status**: `number`

Defined in: [packages/proxy/src/types.ts:121](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L121)

HTTP 状态码

***

### timestamp

> **timestamp**: `number`

Defined in: [packages/proxy/src/types.ts:131](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L131)

缓存写入时的时间戳

***

### url

> **url**: `string`

Defined in: [packages/proxy/src/types.ts:127](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/types.ts#L127)

原始请求 URL
