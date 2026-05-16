[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / getMatchedRule

# Function: getMatchedRule()

> **getMatchedRule**(`request`, `config`, `bodyState?`): `Promise`\<[`ProxyCacheRule`](../interfaces/ProxyCacheRule.md) \| `null`\>

Defined in: [packages/proxy/src/core/isCacheable.ts:7](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/isCacheable.ts#L7)

获取请求匹配到的规则

## Parameters

### request

`Request`

### config

[`ProxySiteConfig`](../interfaces/ProxySiteConfig.md)

### bodyState?

#### checked

`boolean`

#### limit

`number`

#### text

`string` \| `null`

## Returns

`Promise`\<[`ProxyCacheRule`](../interfaces/ProxyCacheRule.md) \| `null`\>
