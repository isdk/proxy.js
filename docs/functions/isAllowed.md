[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / isAllowed

# Function: isAllowed()

> **isAllowed**(`key`, `config?`, `defaultAllowed?`): `boolean`

Defined in: [utils/isAllowed.ts:37](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/utils/isAllowed.ts#L37)

判断给定的键是否允许参与缓存指纹计算。

**优先级逻辑**：
1. `exclude` 命中 → 返回 `false`（优先级最高，会覆盖前面的结果）
2. `include` 存在且命中 → 返回 `true`
3. `include` 存在但不命中 → 返回 `false`
4. 都没有配置 → 使用 `defaultAllowed`（未传则返回 `undefined`）

**注意**：`include` 和 `exclude` 可以同时配置，此时 `exclude` 优先级更高。

## Parameters

### key

`string`

要检查的键名

### config?

[`KeyFilterConfig`](../interfaces/KeyFilterConfig.md)

过滤配置，支持 `include`（白名单）和 `exclude`（黑名单）

### defaultAllowed?

`boolean`

当没有配置或配置未命中时的默认值（可选）

## Returns

`boolean`

是否允许。返回 `boolean` 或 `undefined`（当没有配置且未传 defaultAllowed 时）

## Example

```typescript
// 无配置
isAllowed('key'); // undefined

// 白名单
isAllowed('id', { include: ['id', 'name'] }); // true
isAllowed('email', { include: ['id', 'name'] }); // false

// 黑名单
isAllowed('password', { exclude: ['password'] }); // false
isAllowed('name', { exclude: ['password'] }); // undefined

// 设置默认值
isAllowed('name', { exclude: ['password'] }, true); // true
```
