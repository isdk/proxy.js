[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / fetchWithCache

# Function: fetchWithCache()

> **fetchWithCache**(`request`, `fetcher`, `options`): `Promise`\<`Response`\>

Defined in: [packages/proxy/src/core/fetchWithCache.ts:234](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/core/fetchWithCache.ts#L234)

核心协调函数：协调请求、缓存命中、并发控制和 SWR

流程如下：
1. 初始化上下文并生成缓存键。
2. 检查离线模式：若开启则强读取，未命中直接抛错。
3. 检查请求是否符合缓存规则 (isCacheable)。
4. 尝试读取缓存并判定状态 (HIT / STALE)。
5. 处理 SWR (后台更新)。
6. 处理请求合并 (Request Coalescing)，防止缓存击穿。
7. 若缓存缺失，发起网络请求并流式写入。

## Parameters

### request

`Request`

标准 Web Request 对象

### fetcher

(`req`) => `Promise`\<`Response`\>

底层发起真实请求的函数

### options

[`FetchWithCacheOptions`](../interfaces/FetchWithCacheOptions.md)

缓存协调配置项

## Returns

`Promise`\<`Response`\>

标准 Web Response 对象 (带 x-proxy-cache 标头)
