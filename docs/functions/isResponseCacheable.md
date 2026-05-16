[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / isResponseCacheable

# Function: isResponseCacheable()

> **isResponseCacheable**(`response`, `rule`, `options`): `Promise`\<[`ResponseCacheCheckResult`](../interfaces/ResponseCacheCheckResult.md)\>

Defined in: [packages/proxy/src/core/isResponseCacheable.ts:22](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/isResponseCacheable.ts#L22)

判断响应是否满足缓存条件 (响应侧校验)

## Parameters

### response

`Response`

### rule

[`ProxyCacheRule`](../interfaces/ProxyCacheRule.md)

### options

#### bodyText?

`string`

#### useWafPresets?

`boolean`

## Returns

`Promise`\<[`ResponseCacheCheckResult`](../interfaces/ResponseCacheCheckResult.md)\>

## Description

此函数执行以下检查：
1. 状态码匹配 (statuses)
2. 响应头匹配 (headers)
3. 最小长度校验 (minLength)
4. 响应体内容校验 (body) - 支持正向包含与负向 (!) 排除
