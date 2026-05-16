[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / isWAFChallenge

# Function: isWAFChallenge()

> **isWAFChallenge**(`response`, `presets`): `Promise`\<`boolean`\>

Defined in: [packages/proxy/src/core/wafPresets.ts:98](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/wafPresets.ts#L98)

高度可复用的简单好使的 WAF 挑战判定函数

## Parameters

### response

`Response`

Web 标准 Response 对象

### presets

[`ProxyCacheRule`](../interfaces/ProxyCacheRule.md)[] = `...`

自定义规则，默认使用内置所有已注册的 WAF 预设

## Returns

`Promise`\<`boolean`\>

是否为人机挑战页面
