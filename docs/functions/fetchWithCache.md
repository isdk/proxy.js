[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / fetchWithCache

# Function: fetchWithCache()

> **fetchWithCache**(`request`, `fetcher`, `options`): `Promise`\<`Response`\>

Defined in: [core/fetchWithCache.ts:370](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/core/fetchWithCache.ts#L370)

核心协调函数 (Fetcher Orchestrator)

实现了基于流的混合缓存代理核心逻辑，主要机制包括：
- **多方法支持与过滤**：支持通过 `allowedMethods` 配置可缓存的方法（如 POST, PUT），并通过 `cacheRules` 进行精细化的路径与参数匹配拦截。
- **异步 Request Body 处理**：当缓存 POST/PUT 请求时，会自动读取 Body 并计算唯一指纹（支持 JSON 字段过滤）。
- **大文件流式处理**：底层完全通过 Streams 实现，代理大文件时自动写入磁盘且防 OOM。
- **SWR (Stale-While-Revalidate)**：后台静默更新机制。
- **并发防击穿 (Request Coalescing)**：利用 `activeCacheWrites` 将并发请求合并。
- **强制离线容灾**：支持 `staleIfError` 和 `forceCache`（无视 Cache-Control 强制入库）。

并且会在响应头中自动注入 `x-proxy-cache` 标明缓存命中状态 (`HIT`, `STALE`, `MISS`, `STALE_IF_ERROR`)。

## Parameters

### request

`Request`

原始 Web 标准 Request 对象

### fetcher

(`req`) => `Promise`\<`Response`\>

实际执行网络请求的函数

### options

[`FetchWithCacheOptions`](../interfaces/FetchWithCacheOptions.md)

缓存配置选项

## Returns

`Promise`\<`Response`\>

带有缓存标识头和流式 Body 的 Response 对象
