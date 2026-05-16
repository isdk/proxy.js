[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / CacheAnalysis

# Interface: CacheAnalysis

Defined in: [packages/proxy/src/core/isCacheable.ts:137](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/isCacheable.ts#L137)

Analysis of request cacheability (returned when cacheable).
请求可缓存性分析结果（通过门控时返回）。

## Properties

### bodyState

> **bodyState**: `object`

Defined in: [packages/proxy/src/core/isCacheable.ts:147](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/isCacheable.ts#L147)

Current body reading state (reusable for fingerprinting). 
请求体读取状态（可供后续生成 Key 等环节复用，避免重复读取 Stream）。

#### checked

> **checked**: `boolean`

#### limit

> **limit**: `number`

#### text

> **text**: `string` \| `null`

***

### matchedRule

> **matchedRule**: [`ProxyCacheRule`](ProxyCacheRule.md) \| `null`

Defined in: [packages/proxy/src/core/isCacheable.ts:142](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/isCacheable.ts#L142)

The specific rule that matched the request. 
匹配到的细化规则。
