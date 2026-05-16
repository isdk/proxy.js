[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / SmartCache

# Class: SmartCache

Defined in: [packages/proxy/src/core/SmartCache.ts:107](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/SmartCache.ts#L107)

智能混合缓存类 (Hybrid Multi-tier Cache)

## Description

实现 L1 内存缓存 + L2 磁盘缓存的两级缓存架构：
- **L1 (Memory)**: 基于 LRUCache 的内存缓存，存储最近使用的热点数据
- **L2 (Disk)**: 基于 cacache 的持久化磁盘缓存，支持大文件存储

### 缓存策略
1. **读取时**: 先查内存，未命中则查磁盘；磁盘命中且小于 `maxMemorySize` 时回填内存
2. **写入时**: 同时写入磁盘和内存（大文件 body 不进内存）
3. **大文件优化**: 超过 `maxMemorySize` 的响应只存磁盘，元数据存内存

### 适用场景
- HTTP 响应缓存，减少重复请求
- 大文件流式缓存，内存友好
- 需要持久化 + LRU 淘汰的缓存场景

## Example

```ts
import { SmartCache } from '@isdk/proxy';

const cache = new SmartCache({ maxMemorySize: 2 * 1024 * 1024 });

// 写入缓存
await cache.set('key1', Buffer.from('hello'), {
  url: 'https://api.example.com/data',
  createdAt: Date.now()
});

// 读取缓存
const entry = await cache.get('key1');
if (entry) {
  console.log(entry.body.toString());
}

// 流式写入（适用于大文件）
const writeStream = cache.setStream('large-file', { url: '...' });
fs.createReadStream('big-file.zip').pipe(writeStream);

// 流式读取
const readStream = cache.getStream('large-file');
readStream.pipe(fs.createWriteStream('output.zip'));

// 清理
await cache.clear();
```

## Constructors

### Constructor

> **new SmartCache**(`options`): `SmartCache`

Defined in: [packages/proxy/src/core/SmartCache.ts:126](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/SmartCache.ts#L126)

构造函数

#### Parameters

##### options

[`SmartCacheOptions`](../interfaces/SmartCacheOptions.md) = `{}`

缓存配置选项

#### Returns

`SmartCache`

#### Example

```ts
const cache = new SmartCache();  // 使用默认配置
const cache = new SmartCache({ storagePath: '/tmp/cache' });
```

## Methods

### clear()

> **clear**(`clearPersistent`): `Promise`\<`void`\>

Defined in: [packages/proxy/src/core/SmartCache.ts:406](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/SmartCache.ts#L406)

清空所有缓存

#### Parameters

##### clearPersistent

`boolean` = `true`

是否同时清空磁盘缓存，默认 true

#### Returns

`Promise`\<`void`\>

Promise<void>

#### Description

- 始终清空 L1 内存缓存（所有条目）
- `clearPersistent` 为 true 时，同时清空 L2 磁盘缓存目录下的所有条目

#### Example

```ts
// 清空所有缓存
await cache.clear();

// 仅清空内存，保留磁盘缓存
await cache.clear(false);
```

#### See

[free](#free) 释放资源但不清理磁盘缓存

***

### delete()

> **delete**(`key`, `clearPersistent`): `Promise`\<`void`\>

Defined in: [packages/proxy/src/core/SmartCache.ts:381](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/SmartCache.ts#L381)

删除缓存条目

#### Parameters

##### key

`string`

缓存键

##### clearPersistent

`boolean` = `true`

是否同时删除磁盘缓存，默认 true

#### Returns

`Promise`\<`void`\>

Promise<void>

#### Description

- 始终清除 L1 内存缓存中的条目
- `clearPersistent` 为 true 时，同时删除 L2 磁盘缓存条目

#### Example

```ts
// 仅从内存删除，保留磁盘缓存
await cache.delete('key1', false);

// 完全删除（内存 + 磁盘）
await cache.delete('key1');
```

***

### free()

> **free**(): `void`

Defined in: [packages/proxy/src/core/SmartCache.ts:176](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/SmartCache.ts#L176)

释放缓存资源

#### Returns

`void`

#### Description

清空 L1 内存缓存并清除 cacache 的内部 memoization 状态。
调用后 `initialized` 标志会被设为 false，但不会删除磁盘上的缓存文件。
重新调用 `init()` 可重新初始化。

***

### get()

> **get**(`key`): `Promise`\<[`ProxyCacheEntry`](../interfaces/ProxyCacheEntry.md) \| `null`\>

Defined in: [packages/proxy/src/core/SmartCache.ts:208](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/SmartCache.ts#L208)

获取缓存条目

#### Parameters

##### key

`string`

缓存键

#### Returns

`Promise`\<[`ProxyCacheEntry`](../interfaces/ProxyCacheEntry.md) \| `null`\>

缓存条目，包含 body 和 metadata；若不存在或读取失败返回 null

#### Description

**查找顺序**：
1. 先查 L1 内存缓存
2. 内存命中则直接返回（body 在内存则返回 Buffer，否则返回磁盘流）
3. 内存未命中则查 L2 磁盘
4. 磁盘命中时：
   - 小文件（≤ maxMemorySize）：读取到内存并回填 L1
   - 大文件：只将 metadata 回填 L1，body 返回磁盘流

#### Example

```ts
const entry = await cache.get('user-123');
if (entry) {
  // entry.body 可能是 Buffer（内存命中）或 ReadableStream（磁盘读取）
  const data = Buffer.isBuffer(entry.body) ? entry.body : await streamToBuffer(entry.body);
  console.log(entry.metadata);
}
```

#### Throws

磁盘 IO 错误时静默返回 null，不抛出异常

***

### getStream()

> **getStream**(`key`): `ReadableStream`

Defined in: [packages/proxy/src/core/SmartCache.ts:320](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/SmartCache.ts#L320)

获取磁盘读取流

#### Parameters

##### key

`string`

缓存键

#### Returns

`ReadableStream`

ReadableStream，从磁盘读取缓存内容

#### Description

返回 cacache 的流式读取接口，用于大文件场景的流式消费。
不经过 L1 内存缓存，直接从 L2 磁盘读取。

#### Example

```ts
const readStream = cache.getStream('large-file');
readStream.on('data', (chunk) => { /* 处理数据 */ });
readStream.on('end', () => console.log('完成'));
```

#### See

[setStream](#setstream) 配对使用

***

### init()

> **init**(`options?`): `void`

Defined in: [packages/proxy/src/core/SmartCache.ts:138](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/SmartCache.ts#L138)

初始化或重新初始化缓存

#### Parameters

##### options?

[`SmartCacheOptions`](../interfaces/SmartCacheOptions.md)

缓存配置选项，如果为 undefined 且已初始化则跳过

#### Returns

`void`

#### Description

- 首次调用时使用传入的 options 初始化
- 已初始化时调用会先调用 `free()` 释放旧资源
- 传入 undefined 且已初始化时跳过（用于外部传入 this 的场景）

***

### set()

> **set**(`key`, `body`, `metadata`): `Promise`\<`void`\>

Defined in: [packages/proxy/src/core/SmartCache.ts:272](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/SmartCache.ts#L272)

写入缓存条目

#### Parameters

##### key

`string`

缓存键

##### body

`Buffer`

缓存体（Buffer）

##### metadata

`Omit`\<[`ProxyCacheMetadata`](../interfaces/ProxyCacheMetadata.md), `"size"`\>

元数据（不含 size，会自动填充 body.length）

#### Returns

`Promise`\<`void`\>

Promise<void>

#### Description

**写入策略**：
1. 先计算 body 长度，自动添加到 metadata 中
2. 同步写入 L2 磁盘缓存（cacache）
3. 根据 body 大小决定是否写入 L1 内存：
   - ≤ maxMemorySize：body 和 metadata 都存入 L1
   - > maxMemorySize：只存入 metadata，body 保持在磁盘

#### Example

```ts
const response = await fetch('https://api.example.com/data');
const body = Buffer.from(await response.arrayBuffer());
await cache.set('api-data', body, {
  url: response.url,
  status: response.status,
  headers: Object.fromEntries(response.headers.entries()),
  createdAt: Date.now()
});
```

***

### setStream()

> **setStream**(`key`, `metadata`): `WritableStream`

Defined in: [packages/proxy/src/core/SmartCache.ts:351](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/SmartCache.ts#L351)

获取磁盘写入流

#### Parameters

##### key

`string`

缓存键

##### metadata

`Omit`\<[`ProxyCacheMetadata`](../interfaces/ProxyCacheMetadata.md), `"size"`\>

元数据（不含 size）

#### Returns

`WritableStream`

WritableStream，接收数据并写入磁盘缓存

#### Description

返回 cacache 的流式写入接口，适用于大文件场景。
- 写入前会先清除 L1 内存缓存中该 key 的条目（如果存在）
- 写入完成后（finish 事件）会再次清除 L1 条目，确保内存和磁盘一致

**注意**：流式写入无法自动计算 size，metadata 中不会包含 size 字段。
如需 size，需在写入完成后手动调用其他方法补充。

#### Example

```ts
const writeStream = cache.setStream('large-file', { url: '...' });
const readStream = fs.createReadStream('big-file.zip');
readStream.pipe(writeStream);

writeStream.on('finish', () => {
  console.log('写入完成');
});
```

#### See

[getStream](#getstream) 配对使用
