[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / ProxyBodyConfig

# Interface: ProxyBodyConfig

Defined in: [packages/proxy/src/types.ts:29](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/types.ts#L29)

Special configuration for Request/Response Body.
请求体/响应体专项配置。

## Properties

### extract?

> `optional` **extract**: `string` \| `RegExp`

Defined in: [packages/proxy/src/types.ts:44](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/types.ts#L44)

Regex for extracting data from non-JSON (text) bodies.
用于非 JSON (文本) Body 的提取正则表达式。

***

### match?

> `optional` **match**: [`ProxyMatchPatterns`](../type-aliases/ProxyMatchPatterns.md) \| [`ProxyFieldConfig`](../type-aliases/ProxyFieldConfig.md)

Defined in: [packages/proxy/src/types.ts:39](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/types.ts#L39)

Field-level matching and extraction for JSON bodies.
针对 JSON Body 的字段级匹配与提取。

***

### maxLength?

> `optional` **maxLength**: `number`

Defined in: [packages/proxy/src/types.ts:54](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/types.ts#L54)

Maximum length limit when matching/extracting Body, default is 1024 (1KB).
用于正则匹配/提取 Body 时的最大长度限制，默认 1024 (1KB)。

***

### sort?

> `optional` **sort**: `boolean`

Defined in: [packages/proxy/src/types.ts:49](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/types.ts#L49)

Whether to sort extracted JSON keys or regex capture groups to ensure fingerprint consistency.
是否对提取出的内容或 JSON 键进行排序，以确保指纹一致性。

***

### type?

> `optional` **type**: `"json"` \| `"text"` \| `"binary"`

Defined in: [packages/proxy/src/types.ts:34](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/types.ts#L34)

Body type. If not specified, automatically determined by Content-Type.
Body 类型。不指定时根据 Content-Type 自动判断。
