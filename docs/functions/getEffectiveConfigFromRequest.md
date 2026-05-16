[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / getEffectiveConfigFromRequest

# Function: getEffectiveConfigFromRequest()

> **getEffectiveConfigFromRequest**(`request`, `config`): `Promise`\<[`ProxyCacheRule`](../interfaces/ProxyCacheRule.md)\>

Defined in: [packages/proxy/src/core/isCacheable.ts:33](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/isCacheable.ts#L33)

获取叠加后的最终生效配置 (Rule -> Site -> Global)

## Parameters

### request

`Request`

### config

[`ProxySiteConfig`](../interfaces/ProxySiteConfig.md)

## Returns

`Promise`\<[`ProxyCacheRule`](../interfaces/ProxyCacheRule.md)\>
