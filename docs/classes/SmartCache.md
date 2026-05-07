[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / SmartCache

# Class: SmartCache

Defined in: [core/SmartCache.ts:22](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/SmartCache.ts#L22)

智能混合缓存类 (Hybrid Cache)

## Constructors

### Constructor

> **new SmartCache**(`options`): `SmartCache`

Defined in: [core/SmartCache.ts:27](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/SmartCache.ts#L27)

#### Parameters

##### options

[`SmartCacheOptions`](../interfaces/SmartCacheOptions.md) = `{}`

#### Returns

`SmartCache`

## Methods

### clear()

> **clear**(): `Promise`\<`void`\>

Defined in: [core/SmartCache.ts:122](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/SmartCache.ts#L122)

#### Returns

`Promise`\<`void`\>

***

### delete()

> **delete**(`key`): `Promise`\<`void`\>

Defined in: [core/SmartCache.ts:117](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/SmartCache.ts#L117)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

***

### get()

> **get**(`key`): `Promise`\<[`CacheEntry`](../interfaces/CacheEntry.md) \| `null`\>

Defined in: [core/SmartCache.ts:41](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/SmartCache.ts#L41)

获取缓存条目
如果是小文件，返回带 Buffer 的 Entry；如果是大文件，返回带 ReadStream 的 Entry。

#### Parameters

##### key

`string`

#### Returns

`Promise`\<[`CacheEntry`](../interfaces/CacheEntry.md) \| `null`\>

***

### getStream()

> **getStream**(`key`): `ReadableStream`

Defined in: [core/SmartCache.ts:107](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/SmartCache.ts#L107)

#### Parameters

##### key

`string`

#### Returns

`ReadableStream`

***

### set()

> **set**(`key`, `body`, `metadata`): `Promise`\<`void`\>

Defined in: [core/SmartCache.ts:85](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/SmartCache.ts#L85)

写入缓存

#### Parameters

##### key

`string`

##### body

`Buffer`

##### metadata

`Omit`\<[`CacheMetadata`](../interfaces/CacheMetadata.md), `"size"`\>

#### Returns

`Promise`\<`void`\>

***

### setStream()

> **setStream**(`key`, `metadata`): `WritableStream`

Defined in: [core/SmartCache.ts:111](https://github.com/isdk/proxy.js/blob/bed37fa43507dcbe5cdfa453876163571399d761/src/core/SmartCache.ts#L111)

#### Parameters

##### key

`string`

##### metadata

`Omit`\<[`CacheMetadata`](../interfaces/CacheMetadata.md), `"size"`\>

#### Returns

`WritableStream`
