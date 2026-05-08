[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / BodyFilterConfig

# Interface: BodyFilterConfig

Defined in: [types.ts:13](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/types.ts#L13)

缓存键过滤配置

用于定义在生成缓存指纹时，哪些字段应该被包含或排除。

## Extends

- [`KeyFilterConfig`](KeyFilterConfig.md)

## Properties

### exclude?

> `optional` **exclude**: (`string` \| `RegExp`)[]

Defined in: [types.ts:10](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/types.ts#L10)

排除（黑名单）：用于排除像 `timestamp`、`nonce` 等干扰缓存命中的动态字段。支持字符串、Glob 模式或正则表达式。

#### Inherited from

[`KeyFilterConfig`](KeyFilterConfig.md).[`exclude`](KeyFilterConfig.md#exclude)

***

### extract?

> `optional` **extract**: `string` \| `RegExp`

Defined in: [types.ts:18](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/types.ts#L18)

用于非 JSON (文本) Body 的提取正则表达式。
如果包含捕获组，则提取捕获组内容作为指纹；否则提取整个匹配部分。

***

### include?

> `optional` **include**: (`string` \| `RegExp`)[]

Defined in: [types.ts:8](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/types.ts#L8)

仅包含（白名单）：如果设置，只有这些字段会参与 Key 的计算。支持字符串、Glob 模式或正则表达式。

#### Inherited from

[`KeyFilterConfig`](KeyFilterConfig.md).[`include`](KeyFilterConfig.md#include)

***

### maxLength?

> `optional` **maxLength**: `number`

Defined in: [types.ts:25](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/types.ts#L25)

用于正则匹配/提取 Body 时的最大长度限制，默认 1024 (1KB)

***

### sort?

> `optional` **sort**: `boolean`

Defined in: [types.ts:23](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/types.ts#L23)

是否对提取出的捕获组进行排序。
开启后可解决 Body 中参数顺序不一致导致的指纹失效问题。
