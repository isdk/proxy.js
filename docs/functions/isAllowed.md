[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / isAllowed

# Function: isAllowed()

> **isAllowed**(`key`, `config?`): `boolean`

Defined in: [utils/isAllowed.ts:15](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/utils/isAllowed.ts#L15)

判断给定的键是否允许参与缓存指纹计算。

优先级逻辑：
1. 如果配置了 `include` (白名单)，则只有存在于 `include` 中的键才会被允许。
2. 否则，如果配置了 `exclude` (黑名单)，则存在于 `exclude` 中的键将被拒绝。
3. 如果都没有配置，默认允许所有键。

## Parameters

### key

`string`

要检查的键名

### config?

[`KeyFilterConfig`](../interfaces/KeyFilterConfig.md)

过滤配置

## Returns

`boolean`

是否允许
