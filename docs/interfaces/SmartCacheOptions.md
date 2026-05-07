[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / SmartCacheOptions

# Interface: SmartCacheOptions

Defined in: [core/SmartCache.ts:10](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/SmartCache.ts#L10)

SmartCache 选项

## Properties

### maxMemorySize?

> `optional` **maxMemorySize**: `number`

Defined in: [core/SmartCache.ts:14](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/SmartCache.ts#L14)

内存缓存阈值（字节）。响应体大小超过此值时，Body 将只存入磁盘，而 Meta 仍保留在内存。默认 1MB。

***

### memoryOptions?

> `optional` **memoryOptions**: `Partial`\<`KeyvCacheableMemoryOptions`\>

Defined in: [core/SmartCache.ts:16](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/SmartCache.ts#L16)

透传给 L1 (Memory) 的高级配置

***

### storagePath?

> `optional` **storagePath**: `string`

Defined in: [core/SmartCache.ts:12](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/SmartCache.ts#L12)

磁盘缓存的物理路径。如果不提供，将默认使用系统临时目录。
