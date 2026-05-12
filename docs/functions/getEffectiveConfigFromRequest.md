[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / getEffectiveConfigFromRequest

# Function: getEffectiveConfigFromRequest()

> **getEffectiveConfigFromRequest**(`request`, `config`): `Promise`\<[`ProxyCacheRule`](../interfaces/ProxyCacheRule.md)\>

Defined in: [packages/proxy/src/core/isCacheable.ts:75](https://github.com/isdk/proxy.js/blob/bbcacb8b0dfe43d317743a3f98aa0f9f1b323aad/src/core/isCacheable.ts#L75)

获取叠加后的最终生效配置 (Rule -> Site -> Global)

## Parameters

### request

`Request`

### config

[`ProxySiteConfig`](../interfaces/ProxySiteConfig.md)

## Returns

`Promise`\<[`ProxyCacheRule`](../interfaces/ProxyCacheRule.md)\>
