[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / CacheRule

# Interface: CacheRule

Defined in: [types.ts:35](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/types.ts#L35)

精细化缓存匹配规则

用于在 `methods` 过滤的基础上，进一步限定哪些具体的请求路径或参数需要被缓存。
多个规则之间是 **OR (逻辑或)** 关系，即请求只需匹配其中一条规则即可。
在单个规则对象内部，各字段之间是 **AND (逻辑与)** 关系。

## Properties

### body?

> `optional` **body**: `string` \| `RegExp` \| (`string` \| `RegExp`)[]

Defined in: [types.ts:75](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/types.ts#L75)

Body 内容匹配。
仅当 Body 为文本或 JSON 时有效。
- 字符串: 支持 Glob 模式匹配。
- 正则表达式: 检查 Body 内容是否匹配。
- 数组: 支持传入多个模式。

***

### bodyType?

> `optional` **bodyType**: `"json"` \| `"text"` \| `"binary"`

Defined in: [types.ts:67](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/types.ts#L67)

强制指定 Body 类型。
如果不指定，则根据 `Content-Type` 自动判断。

***

### method?

> `optional` **method**: `string`

Defined in: [types.ts:40](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/types.ts#L40)

匹配的方法 (如 "POST")。
如果指定，则必须方法完全一致；如果不指定，则匹配所有 `methods` 中允许的方法。

***

### path?

> `optional` **path**: `string` \| `RegExp` \| (`string` \| `RegExp`)[]

Defined in: [types.ts:52](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/types.ts#L52)

路径匹配。
- 字符串: 默认进行 Glob 模式匹配（支持 `!` 否定），若非 Glob 且非正则字符串则退化为前缀匹配。
- 正则表达式: 检查 `url.pathname` 是否匹配。
- 数组: 支持传入多个模式（含否定模式），只要其中一个匹配即可。

***

### query?

> `optional` **query**: `Record`\<`string`, `string` \| `boolean` \| `RegExp`\>

Defined in: [types.ts:62](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/types.ts#L62)

Query 参数匹配规则。
- 键名: 支持字符串、Glob 或正则。
- 值:
  - 字符串: 支持 Glob 模式匹配。
  - 正则表达式: 检查参数值是否匹配。
  - `true`: 要求该参数必须存在于 URL 中。
  - `false`: 要求该参数必须 **不** 存在于 URL 中。
