[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / prefetch

# Function: prefetch()

> **prefetch**(`options`): `Promise`\<[`PrefetchResult`](../interfaces/PrefetchResult.md)\>

Defined in: [packages/proxy/src/core/prefetch.ts:55](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/core/prefetch.ts#L55)

预缓存函数

提前将指定的 URL 列表内容存入缓存，支持并发控制和进度回调。
复用了 `createCachedFetch` 的完整逻辑，自动支持：
- GET/POST/PUT/PATCH/DELETE 等所有方法
- POST body 过滤和缓存键生成
- 站点级配置

## Parameters

### options

[`PrefetchOptions`](../interfaces/PrefetchOptions.md)

预缓存选项

## Returns

`Promise`\<[`PrefetchResult`](../interfaces/PrefetchResult.md)\>

预缓存结果，包含成功/失败数量和错误详情
