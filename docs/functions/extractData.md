[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / extractData

# Function: extractData()

> **extractData**(`source`, `config?`): `Record`\<`string`, `string`[]\>

Defined in: [utils/extractData.ts:17](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/utils/extractData.ts#L17)

从源对象中根据过滤配置提取数据并标准化。

此函数主要用于生成缓存指纹。它会：
1. 根据 `config` (include/exclude) 过滤键。
2. 对键进行排序以保证指纹的一致性。
3. 将所有键转换为小写。
4. 将值统一包装为数组并进行排序，消除数组项顺序差异。

## Parameters

### source

`Record`\<`string`, `any`\>

原始数据对象 (如 QueryParams, Headers, Cookies)

### config?

[`KeyFilterConfig`](../interfaces/KeyFilterConfig.md)

过滤配置 (白名单或黑名单)

## Returns

`Record`\<`string`, `string`[]\>

标准化后的数据 Map，键为小写，值为字符串数组
