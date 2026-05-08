[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / KeyFilterConfig

# Interface: KeyFilterConfig

Defined in: [types.ts:6](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/types.ts#L6)

缓存键过滤配置

用于定义在生成缓存指纹时，哪些字段应该被包含或排除。

## Extended by

- [`BodyFilterConfig`](BodyFilterConfig.md)

## Properties

### exclude?

> `optional` **exclude**: (`string` \| `RegExp`)[]

Defined in: [types.ts:10](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/types.ts#L10)

排除（黑名单）：用于排除像 `timestamp`、`nonce` 等干扰缓存命中的动态字段。支持字符串、Glob 模式或正则表达式。

***

### include?

> `optional` **include**: (`string` \| `RegExp`)[]

Defined in: [types.ts:8](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/types.ts#L8)

仅包含（白名单）：如果设置，只有这些字段会参与 Key 的计算。支持字符串、Glob 模式或正则表达式。
