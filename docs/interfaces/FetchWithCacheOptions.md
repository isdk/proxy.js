[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / FetchWithCacheOptions

# Interface: FetchWithCacheOptions

Defined in: [packages/proxy/src/core/fetchWithCache.ts:13](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/core/fetchWithCache.ts#L13)

fetchWithCache 选项

## Extended by

- [`FetchWithCacheContext`](FetchWithCacheContext.md)

## Properties

### activeCacheWrites?

> `optional` **activeCacheWrites**: `Map`\<`string`, `Promise`\<`void`\>\>

Defined in: [packages/proxy/src/core/fetchWithCache.ts:27](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/core/fetchWithCache.ts#L27)

并发写入任务追踪器

***

### backgroundUpdate?

> `optional` **backgroundUpdate**: `boolean`

Defined in: [packages/proxy/src/core/fetchWithCache.ts:19](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/core/fetchWithCache.ts#L19)

是否启用后台异步更新 (SWR)

***

### cache

> **cache**: [`SmartCache`](../classes/SmartCache.md)

Defined in: [packages/proxy/src/core/fetchWithCache.ts:15](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/core/fetchWithCache.ts#L15)

混合缓存实例

***

### config

> **config**: [`SiteCacheConfig`](SiteCacheConfig.md)

Defined in: [packages/proxy/src/core/fetchWithCache.ts:17](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/core/fetchWithCache.ts#L17)

站点级缓存配置

***

### generateKey()?

> `optional` **generateKey**: (`req`, `config`) => `Promise`\<`string`\>

Defined in: [packages/proxy/src/core/fetchWithCache.ts:23](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/core/fetchWithCache.ts#L23)

自定义缓存键生成函数

根据 Request 对象和站点配置生成唯一的缓存指纹 (异步)

该函数是缓存系统的核心组件，用于将复杂的 HTTP 请求对象转换为唯一的 SHA-256 字符串。
它实现了高度可定制的提取逻辑，允许通过配置排除掉请求中不稳定的因素（如时间戳、Nonce 等）。

### 生成指纹包含的要素：
1. **Method**: 请求方法（统一转为大写）。
2. **Host & Path**: 请求的域名和路径。
3. **Query Params**: URL 查询参数，受 `config.query` 过滤影响。
4. **Headers**: 请求头信息，受 `config.headers` 过滤影响。默认排除 `cookie` 头。
5. **Cookies**: 特别提取的 Cookie 字段，受 `config.cookies` 过滤影响。
6. **Request Body**:
   - 对于 `POST`, `PUT`, `PATCH` 请求，会自动尝试读取 Body。
   - **JSON 类型**: 如果 `Content-Type` 包含 `application/json`，则解析为对象并应用 `config.body` 过滤。
   - **非 JSON/流类型**: 回退到对原始 Body 字节流进行 SHA-256 哈希计算。
   - **安全性**: 使用 `req.clone()` 读取 Body，确保不影响后续真实的 Fetch 请求流消费。

#### Parameters

##### req

`Request`

原始 Web 标准 Request 对象。

##### config

[`SiteCacheConfig`](SiteCacheConfig.md)

站点级缓存配置，决定了哪些字段参与指纹计算。

#### Returns

`Promise`\<`string`\>

返回一个 64 位十六进制的 SHA-256 哈希字符串作为缓存键。

#### Example

```typescript
const cacheKey = await generateCacheKey(request, {
  query: { exclude: ['timestamp'] },
  body: { include: ['id', 'action'] }
});
```

***

### onBackgroundUpdate()?

> `optional` **onBackgroundUpdate**: (`promise`) => `void`

Defined in: [packages/proxy/src/core/fetchWithCache.ts:21](https://github.com/isdk/proxy.js/blob/a1563efa4c3081261eb3af8a6404f1b704b33bf1/src/core/fetchWithCache.ts#L21)

后台更新 Promise 触发时的回调

#### Parameters

##### promise

`Promise`\<`Response`\>

#### Returns

`void`
