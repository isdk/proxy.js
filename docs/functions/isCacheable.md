[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / isCacheable

# Function: isCacheable()

> **isCacheable**(`request`, `config`): `Promise`\<[`CacheAnalysis`](../interfaces/CacheAnalysis.md) \| `undefined`\>

Defined in: [packages/proxy/src/core/isCacheable.ts:166](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/isCacheable.ts#L166)

Validates if the request meets the base cacheability criteria and returns analysis metadata.
判断当前请求是否满足可缓存的基础条件（门控校验）并返回分析上下文。

## Parameters

### request

`Request`

Request object. 请求对象。

### config

[`ProxySiteConfig`](../interfaces/ProxySiteConfig.md)

Site-level configuration. 站点级配置。

## Returns

`Promise`\<[`CacheAnalysis`](../interfaces/CacheAnalysis.md) \| `undefined`\>

- `CacheAnalysis`: If cacheable. Returns metadata for downstream steps (fingerprinting/fetching).
  如果可缓存，返回包含规则和 Body 状态的对象，供后续步骤复用。
- `undefined`: If NOT cacheable. Blocked by site-level or rule-level gatekeeping.
  如果不可缓存（被门控拦截），返回 undefined。

## Important

DO NOT simplify to boolean. The returned `bodyState` is CRITICAL for preventing 
multiple stream reads in subsequent `generateCacheKey` and `fetch` calls.
请勿简化为 boolean。返回的 `bodyState` 对于防止后续流程中重复读取请求流至关重要。
