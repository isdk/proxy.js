[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / OfflineCacheMissErrorCode

# Variable: OfflineCacheMissErrorCode

> `const` **OfflineCacheMissErrorCode**: `OfflineCacheMiss` = `ErrorCode.OfflineCacheMiss`

Defined in: [packages/proxy/src/errors.ts:14](https://github.com/isdk/proxy.js/blob/2fdabd45bf6ba59f8ff55647376cc5eea3de7160/src/errors.ts#L14)

Offline 缓存未命中错误代码

当处于 offline 模式且请求的 URL 没有对应缓存时抛出。
这帮助调用者区分：
- 网络请求失败（其他错误类型）
- offline 模式下缓存不存在（本错误）
