[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / extractData

# Function: extractData()

> **extractData**(`source`, `config?`, `defaultAllowed?`): `Record`\<`string`, `string`[]\>

Defined in: [packages/proxy/src/utils/extractData.ts:40](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/utils/extractData.ts#L40)

从源对象中根据过滤配置提取数据并标准化。

此函数主要用于生成缓存指纹。它会：
1. 根据 `config` (include/exclude) 过滤键，调用 `isAllowed` 判断每个键是否允许。
2. 对键进行排序以保证指纹的一致性。
3. 将所有键转换为小写。
4. 将值统一包装为数组并进行排序，消除数组项顺序差异。

**关于 `defaultAllowed` 参数**：
- 只有当没有配置 `include` 和 `exclude` 时，`defaultAllowed` 才会生效。
- 如果配置了 `include`（即使为空数组），`defaultAllowed` 也不会生效。
- 详见 `isAllowed` 函数的优先级逻辑。

## Parameters

### source

`Record`\<`string`, `any`\>

原始数据对象 (如 QueryParams, Headers, Cookies)

### config?

[`KeyFilterConfig`](../interfaces/KeyFilterConfig.md)

过滤配置，支持 `include`（白名单）和 `exclude`（黑名单）

### defaultAllowed?

`boolean`

当没有配置时的默认值（默认 `false`，即不提取任何键）

## Returns

`Record`\<`string`, `string`[]\>

标准化后的数据 Map，键为小写，值为排序后的字符串数组

## Example

```typescript
const headers = { 'Content-Type': 'application/json', 'X-Request-Id': '123' };

// 默认不提取任何键
extractData(headers); // {}

// 提取所有键
extractData(headers, undefined, true); // { 'content-type': ['application/json'], 'x-request-id': ['123'] }

// 白名单
extractData(headers, { include: ['content-type'] }); // { 'content-type': ['application/json'] }

// 黑名单（需要 include 或 defaultAllowed）
extractData(headers, { include: ['*'], exclude: ['x-request-id'] }, true); // { 'content-type': ['application/json'] }
```
