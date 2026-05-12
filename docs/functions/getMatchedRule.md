[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / getMatchedRule

# Function: getMatchedRule()

> **getMatchedRule**(`request`, `config`, `bodyState?`): `Promise`\<[`ProxyCacheRule`](../interfaces/ProxyCacheRule.md) \| `null`\>

Defined in: [packages/proxy/src/core/isCacheable.ts:49](https://github.com/isdk/proxy.js/blob/6f3366d94dc84bfa077995cd404aa1b780ba62a1/src/core/isCacheable.ts#L49)

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
