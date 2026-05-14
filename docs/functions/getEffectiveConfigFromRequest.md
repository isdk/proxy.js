[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / getEffectiveConfigFromRequest

# Function: getEffectiveConfigFromRequest()

> **getEffectiveConfigFromRequest**(`request`, `config`): `Promise`\<[`ProxyCacheRule`](../interfaces/ProxyCacheRule.md)\>

Defined in: [packages/proxy/src/core/isCacheable.ts:75](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/core/isCacheable.ts#L75)

获取叠加后的最终生效配置 (Rule -> Site -> Global)

## Parameters

### request

`Request`

### config

[`ProxySiteConfig`](../interfaces/ProxySiteConfig.md)

## Returns

`Promise`\<[`ProxyCacheRule`](../interfaces/ProxyCacheRule.md)\>
