[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / fetchWithCache

# Function: fetchWithCache()

> **fetchWithCache**(`request`, `fetcher`, `options`): `Promise`\<`Response`\>

Defined in: [core/fetchWithCache.ts:244](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/fetchWithCache.ts#L244)

核心协调函数 (Fetcher Orchestrator)

实现了基于流的混合缓存代理核心逻辑，主要机制包括：
- **大文件流式处理**：底层完全通过 Streams 实现，代理大文件时自动写入磁盘且防 OOM。
- **SWR (Stale-While-Revalidate)**：后台静默更新机制。
- **并发防击穿 (Request Coalescing)**：利用 `activeCacheWrites` 将并发请求合并。
- **强制离线容灾**：支持 `staleIfError` 和 `forceCache`（无视 Cache-Control 强制入库）。

并且会在响应头中自动注入 `x-proxy-cache` 标明缓存命中状态 (`HIT`, `STALE`, `MISS`, `STALE_IF_ERROR`)。

## Parameters

### request

`Request`

### fetcher

(`req`) => `Promise`\<`Response`\>

### options

[`FetchWithCacheOptions`](../interfaces/FetchWithCacheOptions.md)

## Returns

`Promise`\<`Response`\>
