[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / extractData

# Function: extractData()

> **extractData**(`source`, `config?`, `defaultAllowed?`): `Record`\<`string`, `string`[]\>

Defined in: [packages/proxy/src/utils/extractData.ts:23](https://github.com/isdk/proxy.js/blob/2fdabd45bf6ba59f8ff55647376cc5eea3de7160/src/utils/extractData.ts#L23)

Universal Data Extraction and Filtering Utility (for Objects)
通用数据提取与过滤函数 (针对对象)

Core Logic:
1. If no config: Extract all or none based on defaultAllowed.
2. If config is Array/Pattern: Filter by Key using MatchPatterns logic.
3. If config is Record: Precise field-level extraction:
   - true: Extract this field (full).
   - false: Exclude this field.
   - Patterns: Match/extract based on the field's VALUE using Glob/Regex.

Extracted values are normalized into sorted string arrays for fingerprint stability.
提取后的值统一标准化为排序后的字符串数组，以确保指纹稳定性。

## Parameters

### source

`Record`\<`string`, `any`\>

Original data object (Query, Headers, Cookies, etc.)

### config?

Filtering configuration (MatchPatterns or Record)

[`ProxyMatchPatterns`](../type-aliases/ProxyMatchPatterns.md) | [`ProxyFieldConfig`](../type-aliases/ProxyFieldConfig.md)

### defaultAllowed?

`boolean` = `true`

Default policy when no pattern matches (default: true)

## Returns

`Record`\<`string`, `string`[]\>
