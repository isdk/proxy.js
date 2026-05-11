[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / isMatch

# Function: isMatch()

> **isMatch**(`pattern`, `value`, `usePrefix`): `boolean`

Defined in: [packages/proxy/src/utils/matcher.ts:25](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/utils/matcher.ts#L25)

通用匹配函数

逻辑优先级：
1. 如果 pattern 是数组，遵循：(匹配任一正向模式) 且 (不匹配任一负向模式)。
2. 如果 pattern 是 RegExp 对象，直接使用 regex.test(value)。
3. 如果 pattern 是 "/regex/flags" 格式的字符串，转为 RegExp 后使用 test。
4. 如果 pattern 是 Glob 字符串，使用 picomatch 进行匹配。
5. 否则，根据 usePrefix 参数进行前缀匹配或精确匹配。

## Parameters

### pattern

匹配模式 (RegExp 或 字符串 或 数组)

`string` | `RegExp` | (`string` \| `RegExp`)[]

### value

`string`

要匹配的值

### usePrefix

`boolean` = `false`

是否在普通字符串匹配时启用前缀匹配 (默认为 false，即精确匹配)

## Returns

`boolean`
