[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / SmartCache

# Class: SmartCache

Defined in: [core/SmartCache.ts:39](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/core/SmartCache.ts#L39)

智能混合缓存类 (Hybrid Multi-tier Cache)

该类实现了 L1 (内存) 和 L2 (磁盘) 的双层混合存储架构，旨在提供高性能且大容量的缓存能力。

### 核心特性：
- **双层架构**: L1 使用 LRU 内存缓存（基于 `secondary-cache` 的 LRUCache），L2 使用持久化磁盘缓存（基于 `cacache`）。
- **大小感知存储**: 自动识别响应体大小。小于阈值的文件同时存于内存和磁盘；超过阈值的文件仅存于磁盘，但其元数据仍保留在内存中。
- **元数据驻留 (Meta-Residency)**: 无论 Body 多大，Headers、Status、Policy 等信息始终优先从内存读取，确保缓存判定性能。
- **流式支持**: 支持通过 `setStream` 和 `getStream` 直接操作大数据流，防止 OOM。
- **一致性保障**: 在并发写入时自动清理内存，确保后续读取不会拿到被污染的旧数据。
- **内存限制**: 通过 `maxTotalMemorySize` 控制 L1 缓存的总内存占用。

## Constructors

### Constructor

> **new SmartCache**(`options`): `SmartCache`

Defined in: [core/SmartCache.ts:44](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/core/SmartCache.ts#L44)

#### Parameters

##### options

[`SmartCacheOptions`](../interfaces/SmartCacheOptions.md) = `{}`

#### Returns

`SmartCache`

## Methods

### clear()

> **clear**(): `Promise`\<`void`\>

Defined in: [core/SmartCache.ts:193](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/core/SmartCache.ts#L193)

#### Returns

`Promise`\<`void`\>

***

### delete()

> **delete**(`key`): `Promise`\<`void`\>

Defined in: [core/SmartCache.ts:188](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/core/SmartCache.ts#L188)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

***

### get()

> **get**(`key`): `Promise`\<[`CacheEntry`](../interfaces/CacheEntry.md) \| `null`\>

Defined in: [core/SmartCache.ts:79](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/core/SmartCache.ts#L79)

获取缓存条目

逻辑：
1. 首先尝试从 L1 内存获取。
2. 如果内存中有 Body，直接返回（Buffer 类型）。
3. 如果内存中只有 Meta（大文件），则从 L2 磁盘创建并返回 ReadStream。
4. 如果内存完全未命中，从磁盘 L2 检索，并根据大小决定是否回填 L1。

#### Parameters

##### key

`string`

缓存指纹键

#### Returns

`Promise`\<[`CacheEntry`](../interfaces/CacheEntry.md) \| `null`\>

完整的缓存条目（带 Buffer 或 Stream 的 Body），未命中返回 null

***

### getStream()

> **getStream**(`key`): `ReadableStream`

Defined in: [core/SmartCache.ts:159](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/core/SmartCache.ts#L159)

获取磁盘读取流

允许直接从 L2 磁盘层以流的形式读取数据，适用于大文件代理。

#### Parameters

##### key

`string`

缓存指纹键

#### Returns

`ReadableStream`

Node.js 可读流

***

### set()

> **set**(`key`, `body`, `metadata`): `Promise`\<`void`\>

Defined in: [core/SmartCache.ts:129](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/core/SmartCache.ts#L129)

写入缓存条目 (原子写入)

适用于已知长度的小型数据块。该操作会同时写入磁盘并回填内存（如果大小未超标）。

#### Parameters

##### key

`string`

缓存指纹键

##### body

`Buffer`

响应体数据 Buffer

##### metadata

`Omit`\<[`CacheMetadata`](../interfaces/CacheMetadata.md), `"size"`\>

响应元数据（不含 size，由本方法自动计算）

#### Returns

`Promise`\<`void`\>

***

### setStream()

> **setStream**(`key`, `metadata`): `WritableStream`

Defined in: [core/SmartCache.ts:175](https://github.com/isdk/proxy.js/blob/76fee3a101f98e5bf29599fe7ea02ab06479cf70/src/core/SmartCache.ts#L175)

获取磁盘写入流 (流式缓存)

该方法用于支持真正的流式代理。它会执行以下一致性操作：
1. 立即清除 L1 内存中的对应键，防止读到旧数据。
2. 返回一个可写流，数据将直接流入磁盘。
3. **一致性修复**: 在流写入完成（finish）时再次清理内存，防止写入期间的并发读取将旧数据再次回填进内存。

#### Parameters

##### key

`string`

缓存指纹键

##### metadata

`Omit`\<[`CacheMetadata`](../interfaces/CacheMetadata.md), `"size"`\>

响应元数据

#### Returns

`WritableStream`

Node.js 可写流
