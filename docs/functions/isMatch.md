[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / isMatch

# Function: isMatch()

> **isMatch**(`pattern`, `value`, `usePrefix`): `boolean`

Defined in: [packages/proxy/src/utils/matcher.ts:30](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/utils/matcher.ts#L30)

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

`string` | `number` | `RegExp` | (`string` \| `number` \| `RegExp`)[]

### value

`string`

Value to test

### usePrefix

Whether to use prefix matching for simple strings (default: false)

#### defaultIfNoPositives?

`boolean` = `true`

#### ignoreCase?

`boolean` = `true`

#### ignoreNegative?

`boolean`

#### usePrefix?

`boolean` = `false`

## Returns

`boolean`
