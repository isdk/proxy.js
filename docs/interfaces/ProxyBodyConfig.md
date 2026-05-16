[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / ProxyBodyConfig

# Interface: ProxyBodyConfig

Defined in: [packages/proxy/src/types.ts:29](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L29)

Special configuration for Request/Response Body.
请求体/响应体专项配置。

## Properties

### extract?

> `optional` **extract**: [`ProxyMatchPatterns`](../type-aliases/ProxyMatchPatterns.md) \| [`ProxyFieldConfig`](../type-aliases/ProxyFieldConfig.md)

Defined in: [packages/proxy/src/types.ts:46](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L46)

Data extraction rules (used for Fingerprinting).
Supports JSON field filtering or Regex for text bodies.
数据提取规则（用于指纹提取）。支持 JSON 字段过滤或针对文本 Body 的正则提取。

***

### match?

> `optional` **match**: [`ProxyMatchPatterns`](../type-aliases/ProxyMatchPatterns.md) \| [`ProxyFieldConfig`](../type-aliases/ProxyFieldConfig.md)

Defined in: [packages/proxy/src/types.ts:40](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L40)

Body matching rules (used for Gatekeeping).
Supports JSON field-level matching or string/regex matching for text bodies.
Body 匹配规则（用于门控）。支持针对 JSON 的字段级匹配，或针对文本 Body 的字符串/正则匹配。

***

### maxLength?

> `optional` **maxLength**: `number`

Defined in: [packages/proxy/src/types.ts:56](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L56)

Maximum length limit when matching/extracting Body, default is 1024 (1KB).
用于正则匹配/提取 Body 时的最大长度限制，默认 1024 (1KB)。

***

### sort?

> `optional` **sort**: `boolean`

Defined in: [packages/proxy/src/types.ts:51](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L51)

Whether to sort extracted JSON keys or regex capture groups to ensure fingerprint consistency.
是否对提取出的内容或 JSON 键进行排序，以确保指纹一致性。

***

### type?

> `optional` **type**: `"json"` \| `"text"` \| `"binary"`

Defined in: [packages/proxy/src/types.ts:34](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/types.ts#L34)

Body type. If not specified, automatically determined by Content-Type.
Body 类型。不指定时根据 Content-Type 自动判断。
