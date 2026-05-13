[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / SmartCacheOptions

# Interface: SmartCacheOptions

Defined in: [packages/proxy/src/core/SmartCache.ts:10](https://github.com/isdk/proxy.js/blob/2fdabd45bf6ba59f8ff55647376cc5eea3de7160/src/core/SmartCache.ts#L10)

SmartCache 选项

## Properties

### maxMemorySize?

> `optional` **maxMemorySize**: `number`

Defined in: [packages/proxy/src/core/SmartCache.ts:14](https://github.com/isdk/proxy.js/blob/2fdabd45bf6ba59f8ff55647376cc5eea3de7160/src/core/SmartCache.ts#L14)

内存缓存阈值（字节）。响应体大小超过此值时，Body 将只存入磁盘，而 Meta 仍保留在内存。默认 1MB。

***

### maxTotalMemorySize?

> `optional` **maxTotalMemorySize**: `number`

Defined in: [packages/proxy/src/core/SmartCache.ts:16](https://github.com/isdk/proxy.js/blob/2fdabd45bf6ba59f8ff55647376cc5eea3de7160/src/core/SmartCache.ts#L16)

内存缓存总大小阈值（字节）。默认 100MB。超过此值将清空内存缓存。

***

### memoryOptions?

> `optional` **memoryOptions**: `object`

Defined in: [packages/proxy/src/core/SmartCache.ts:18](https://github.com/isdk/proxy.js/blob/2fdabd45bf6ba59f8ff55647376cc5eea3de7160/src/core/SmartCache.ts#L18)

透传给 L1 (Memory) 的高级配置 (secondary-cache LRUCache options)

#### Index Signature

\[`key`: `string`\]: `any`

#### capacity?

> `optional` **capacity**: `number`

#### cleanInterval?

> `optional` **cleanInterval**: `number`

#### expires?

> `optional` **expires**: `number`

***

### storagePath?

> `optional` **storagePath**: `string`

Defined in: [packages/proxy/src/core/SmartCache.ts:12](https://github.com/isdk/proxy.js/blob/2fdabd45bf6ba59f8ff55647376cc5eea3de7160/src/core/SmartCache.ts#L12)

磁盘缓存的物理路径。如果不提供，将默认使用系统临时目录。
