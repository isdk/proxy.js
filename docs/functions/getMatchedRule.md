[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / getMatchedRule

# Function: getMatchedRule()

> **getMatchedRule**(`request`, `config`, `bodyState?`): `Promise`\<[`ProxyCacheRule`](../interfaces/ProxyCacheRule.md) \| `null`\>

Defined in: [packages/proxy/src/core/isCacheable.ts:49](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/core/isCacheable.ts#L49)

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
