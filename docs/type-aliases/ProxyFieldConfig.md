[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / ProxyFieldConfig

# Type Alias: ProxyFieldConfig

> **ProxyFieldConfig** = `Record`\<`string`, [`ProxyMatchPatterns`](ProxyMatchPatterns.md) \| `boolean`\>

Defined in: [packages/proxy/src/types.ts:23](https://github.com/isdk/proxy.js/blob/bbcacb8b0dfe43d317743a3f98aa0f9f1b323aad/src/types.ts#L23)

Field-level configuration: Uses a Record structure to give each Key explicit gatekeeping and fingerprinting semantics.
字段级配置：采用 Record 结构，赋予每个 Key 明确的门控与指纹提取语义。

- key: Field name (e.g., "id", "Authorization").
- value: 
  - true: Field MUST exist (gatekeeping) and be included in the fingerprint (extraction). 必须存在并包含在指纹中。
  - false: Field MUST NOT exist (gatekeeping) and be excluded from the fingerprint. 必须不存在且不包含在指纹中。
  - MatchPatterns: Field value MUST match the pattern (gatekeeping) and be included in the fingerprint. 值必须匹配且包含在指纹中。
