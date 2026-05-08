[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / getSiteConfig

# Function: getSiteConfig()

> **getSiteConfig**(`urlString`, `proxyConfig`): [`SiteCacheConfig`](../interfaces/SiteCacheConfig.md)

Defined in: [utils/getSiteConfig.ts:17](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/utils/getSiteConfig.ts#L17)

根据 URL 获取对应的站点缓存配置

匹配逻辑：
1. 遍历 sites 中的所有 key。
2. 如果 key 是正则或 Glob 格式字符串，则对完整 URL 进行匹配。
3. 如果 key 是普通字符串，则作为 URL 前缀进行匹配。
4. 返回第一个匹配到的配置；若均未匹配，则返回 defaultConfig。

## Parameters

### urlString

`string`

请求的完整 URL

### proxyConfig

[`ProxyConfig`](../interfaces/ProxyConfig.md)

全局代理配置

## Returns

[`SiteCacheConfig`](../interfaces/SiteCacheConfig.md)

匹配到的站点配置
