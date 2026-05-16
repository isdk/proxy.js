[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / generateCacheKey

# Function: generateCacheKey()

> **generateCacheKey**(`req`, `siteConfig`, `bodyState?`, `effectiveConfig?`): `Promise`\<`string`\>

Defined in: [packages/proxy/src/core/generateCacheKey.ts:15](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/generateCacheKey.ts#L15)

根据 Request 对象和配置生成唯一的缓存指纹 (异步)

## Parameters

### req

`Request`

请求对象

### siteConfig

[`ProxySiteConfig`](../interfaces/ProxySiteConfig.md)

站点级配置

### bodyState?

可选的 Body 读取状态（用于性能优化，避免重复读取）

#### checked

`boolean`

#### json?

`any`

#### limit

`number`

#### text

`string` \| `null`

### effectiveConfig?

[`ProxyCacheRule`](../interfaces/ProxyCacheRule.md)

可选的最终生效配置（用于性能优化，避免重复合并）

## Returns

`Promise`\<`string`\>
