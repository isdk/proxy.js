[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / OfflineCacheMissErrorCode

# Variable: OfflineCacheMissErrorCode

> `const` **OfflineCacheMissErrorCode**: `OfflineCacheMiss` = `ErrorCode.OfflineCacheMiss`

Defined in: [packages/proxy/src/errors.ts:14](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/errors.ts#L14)

Offline 缓存未命中错误代码

当处于 offline 模式且请求的 URL 没有对应缓存时抛出。
这帮助调用者区分：
- 网络请求失败（其他错误类型）
- offline 模式下缓存不存在（本错误）
