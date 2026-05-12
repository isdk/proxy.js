[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / getEffectiveConfig

# Function: getEffectiveConfig()

> **getEffectiveConfig**(`rule`, `siteConfig`): [`ProxySiteConfig`](../interfaces/ProxySiteConfig.md)

Defined in: [packages/proxy/src/utils/getEffectiveConfig.ts:19](https://github.com/isdk/proxy.js/blob/bbcacb8b0dfe43d317743a3f98aa0f9f1b323aad/src/utils/getEffectiveConfig.ts#L19)

获取合并后的有效配置 (Rule -> Site -> Global)

特殊处理：
1. Body 配置如果为简写形式 (string/RegExp/Array)，先标准化为对象再合并，以防丢失 site 级的 maxLength 等配置。

## Parameters

### rule

[`ProxyCacheRule`](../interfaces/ProxyCacheRule.md)

### siteConfig

[`ProxySiteConfig`](../interfaces/ProxySiteConfig.md)

## Returns

[`ProxySiteConfig`](../interfaces/ProxySiteConfig.md)
