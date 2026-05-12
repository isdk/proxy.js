[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / SmartCache

# Class: SmartCache

Defined in: [packages/proxy/src/core/SmartCache.ts:29](https://github.com/isdk/proxy.js/blob/bbcacb8b0dfe43d317743a3f98aa0f9f1b323aad/src/core/SmartCache.ts#L29)

智能混合缓存类 (Hybrid Multi-tier Cache)

## Constructors

### Constructor

> **new SmartCache**(`options`): `SmartCache`

Defined in: [packages/proxy/src/core/SmartCache.ts:34](https://github.com/isdk/proxy.js/blob/bbcacb8b0dfe43d317743a3f98aa0f9f1b323aad/src/core/SmartCache.ts#L34)

#### Parameters

##### options

[`SmartCacheOptions`](../interfaces/SmartCacheOptions.md) = `{}`

#### Returns

`SmartCache`

## Methods

### clear()

> **clear**(`clearPersistent`): `Promise`\<`void`\>

Defined in: [packages/proxy/src/core/SmartCache.ts:147](https://github.com/isdk/proxy.js/blob/bbcacb8b0dfe43d317743a3f98aa0f9f1b323aad/src/core/SmartCache.ts#L147)

#### Parameters

##### clearPersistent

`boolean` = `true`

#### Returns

`Promise`\<`void`\>

***

### delete()

> **delete**(`key`, `clearPersistent`): `Promise`\<`void`\>

Defined in: [packages/proxy/src/core/SmartCache.ts:142](https://github.com/isdk/proxy.js/blob/bbcacb8b0dfe43d317743a3f98aa0f9f1b323aad/src/core/SmartCache.ts#L142)

#### Parameters

##### key

`string`

##### clearPersistent

`boolean` = `true`

#### Returns

`Promise`\<`void`\>

***

### get()

> **get**(`key`): `Promise`\<[`ProxyCacheEntry`](../interfaces/ProxyCacheEntry.md) \| `null`\>

Defined in: [packages/proxy/src/core/SmartCache.ts:59](https://github.com/isdk/proxy.js/blob/bbcacb8b0dfe43d317743a3f98aa0f9f1b323aad/src/core/SmartCache.ts#L59)

获取缓存条目

#### Parameters

##### key

`string`

#### Returns

`Promise`\<[`ProxyCacheEntry`](../interfaces/ProxyCacheEntry.md) \| `null`\>

***

### getStream()

> **getStream**(`key`): `ReadableStream`

Defined in: [packages/proxy/src/core/SmartCache.ts:124](https://github.com/isdk/proxy.js/blob/bbcacb8b0dfe43d317743a3f98aa0f9f1b323aad/src/core/SmartCache.ts#L124)

获取磁盘读取流

#### Parameters

##### key

`string`

#### Returns

`ReadableStream`

***

### set()

> **set**(`key`, `body`, `metadata`): `Promise`\<`void`\>

Defined in: [packages/proxy/src/core/SmartCache.ts:99](https://github.com/isdk/proxy.js/blob/bbcacb8b0dfe43d317743a3f98aa0f9f1b323aad/src/core/SmartCache.ts#L99)

写入缓存条目 (原子写入)

#### Parameters

##### key

`string`

##### body

`Buffer`

##### metadata

`Omit`\<[`ProxyCacheMetadata`](../interfaces/ProxyCacheMetadata.md), `"size"`\>

#### Returns

`Promise`\<`void`\>

***

### setStream()

> **setStream**(`key`, `metadata`): `WritableStream`

Defined in: [packages/proxy/src/core/SmartCache.ts:131](https://github.com/isdk/proxy.js/blob/bbcacb8b0dfe43d317743a3f98aa0f9f1b323aad/src/core/SmartCache.ts#L131)

获取磁盘写入流 (流式缓存)

#### Parameters

##### key

`string`

##### metadata

`Omit`\<[`ProxyCacheMetadata`](../interfaces/ProxyCacheMetadata.md), `"size"`\>

#### Returns

`WritableStream`
