[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / isAllowed

# Function: isAllowed()

> **isAllowed**(`key`, `patterns?`, `defaultAllowed?`): `boolean`

Defined in: [packages/proxy/src/utils/isAllowed.ts:25](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/utils/isAllowed.ts#L25)

判断给定的键是否允许参与缓存指纹计算。

基于 V8 重构后的逻辑：
1. 采用正交匹配范式，不再区分显式的 include/exclude 结构。
2. 利用 `isMatch` 内部支持的数组和 `!` 否定模式来实现黑白名单。

## Parameters

### key

`string`

要检查的键名

### patterns?

[`ProxyMatchPatterns`](../type-aliases/ProxyMatchPatterns.md)

匹配模式 (支持数组和 ! 否定)

### defaultAllowed?

`boolean` = `false`

当没有配置时的默认值 (默认 false)

## Returns

`boolean`

是否允许

## Example

```typescript
// 白名单
isAllowed('id', ['id', 'name']); // true

// 黑名单 (使用 ! 排除)
isAllowed('timestamp', ['*', '!timestamp']); // false
```
