[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / SmartCacheOptions

# Interface: SmartCacheOptions

Defined in: [packages/proxy/src/core/SmartCache.ts:22](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/SmartCache.ts#L22)

SmartCache 选项

## Example

```ts
const cache = new SmartCache({
  storagePath: '/tmp/my-cache',
  maxMemorySize: 2 * 1024 * 1024,  // 2MB
  maxTotalMemorySize: 200 * 1024 * 1024,  // 200MB
  memoryOptions: {
    capacity: 1000,
    expires: 10 * 60 * 1000  // 10分钟
  }
});
```

## Properties

### maxMemorySize?

> `optional` **maxMemorySize**: `number`

Defined in: [packages/proxy/src/core/SmartCache.ts:35](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/SmartCache.ts#L35)

内存缓存阈值（字节）。

#### Description

响应体大小超过此值时，Body 将只存入磁盘，而 Meta 元数据仍保留在内存中。
此优化可减少大文件对内存的占用。

#### Default

```ts
1024 * 1024 (1MB)
```

***

### maxTotalMemorySize?

> `optional` **maxTotalMemorySize**: `number`

Defined in: [packages/proxy/src/core/SmartCache.ts:41](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/SmartCache.ts#L41)

内存缓存总大小阈值（字节）。

#### Description

超过此值时，LRU 缓存会自动清除最久未使用的条目以释放内存。

#### Default

```ts
100 * 1024 * 1024 (100MB)
```

***

### memoryOptions?

> `optional` **memoryOptions**: `object`

Defined in: [packages/proxy/src/core/SmartCache.ts:47](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/SmartCache.ts#L47)

透传给 L1 内存缓存的高级配置。

#### Index Signature

\[`key`: `string`\]: `any`

允许添加其他 LRUCache 支持的选项

#### capacity?

> `optional` **capacity**: `number`

LRU 缓存的最大条目数，为 0 时仅按 maxWeight 限制

#### cleanInterval?

> `optional` **cleanInterval**: `number`

清理检查间隔（毫秒）

#### expires?

> `optional` **expires**: `number`

缓存条目过期时间（毫秒），默认 5 分钟

#### Description

基于 secondary-cache 的 LRUCache 选项，可自定义容量、过期时间等参数。

#### See

https://www.npmjs.com/package/secondary-cache

***

### storagePath?

> `optional` **storagePath**: `string`

Defined in: [packages/proxy/src/core/SmartCache.ts:28](https://github.com/isdk/proxy.js/blob/f5a749970f69b68943b2d54ecd2dc1b566c7b859/src/core/SmartCache.ts#L28)

磁盘缓存的物理路径。

#### Description

如果不提供，将默认使用系统临时目录 (`os.tmpdir()`) 下的 `isdk-proxy-cache` 目录。

#### Default

```ts
os.tmpdir() + '/isdk-proxy-cache'
```
