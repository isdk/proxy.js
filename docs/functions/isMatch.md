[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / isMatch

# Function: isMatch()

> **isMatch**(`pattern`, `value`, `usePrefix`, `defaultIfNoPositives`, `ignoreCase`): `boolean`

Defined in: [packages/proxy/src/utils/matcher.ts:29](https://github.com/isdk/proxy.js/blob/6f3366d94dc84bfa077995cd404aa1b780ba62a1/src/utils/matcher.ts#L29)

Universal matching function with advanced logic.
通用匹配函数。

Logic Priority (优先级):
1. Array (数组): Follows "(Match ANY positives) AND (Match NO negatives)".
2. RegExp (正则): Direct regex test.
3. Regex String (正则字符串): Supports "/regex/flags" format.
4. Glob (通配符): Uses picomatch for file-path style matching.
5. String (普通字符串): Prefix or exact match based on `usePrefix`.

## Parameters

### pattern

Matching pattern (RegExp, string, or Array)

`string` | `RegExp` | (`string` \| `RegExp`)[]

### value

`string`

Value to test

### usePrefix

`boolean` = `false`

Whether to use prefix matching for simple strings (default: false)

### defaultIfNoPositives

`boolean` = `true`

Return value when only negatives are provided and none match (default: true)

### ignoreCase

`boolean` = `true`

Whether to perform case-insensitive matching (default: true)

## Returns

`boolean`
