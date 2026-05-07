# @isdk/proxy

这是一个专为 Node.js 开发者设计的高性能、开发者友好的缓存引擎，旨在解决数据密集型应用中 HTTP 响应缓存管理的复杂性。

## 为什么选择 @isdk/proxy？

在**高并发 API 代理**、**网页爬虫**或**微服务**等场景下，缓存管理通常需要在“速度”和“容量”之间进行妥协。`@isdk/proxy` 通过其独特的**混合多级架构**，完美解决了这一痛点：

- **解决“内存 vs. 容量”的矛盾**：它将小而热的响应存储在内存 (L1) 中以实现纳秒级访问，同时将大文件响应体转储到持久化磁盘 (L2)。更重要的是，它实现了 **“元数据驻留”**——无论响应体多大，其判定逻辑（Headers、Status、Policy）始终保留在内存中，确保瞬时完成缓存有效性评估。
- **防止缓存雪崩/击穿 (Cache Stampede)**：当一个热点缓存失效时，它通过内置的“请求合并”机制，确保同一时间只有一个网络请求被发出，有效保护上游服务器不被瞬间激增的并发请求压垮。
- **完全解耦，环境中立**：基于 Web 标准的 `Request`/`Response` 对象构建。这意味着你的缓存逻辑不再被某个具体的 HTTP 库（如 MSW, Axios, Fetch 或 Crawlee）所绑定，一套逻辑，到处运行。

## 核心特性

- **🚀 混合多级缓存**: L1 (LRU 内存) 提供极速响应，L2 (内容寻址磁盘 `cacache`) 提供持久化存储。
- **📥 HTTP POST & 多方法支持**: 完整支持 POST、PUT 等非 GET 方法的缓存，内置智能请求体指纹计算机制。
- **🎯 精细化规则拦截**: 支持通过 `cacheRules` 对特定路径或 Query 参数进行外科手术式的精确缓存控制。
- **🌊 原生流式分发**: 内部完全基于 Stream 管道化构建，在代理大文件时天然防 OOM 内存溢出。
- **🧠 智能元数据驻留**: 无论文件多大，元数据 (Headers, Status, Policy) 始终驻留在内存中，确保纳秒级的缓存策略判定。
- **🔄 过期后异步更新 (SWR)**: 立即返回过期数据，同时在后台静默更新缓存，实现“零等待”响应。
- **🛡️ 请求合并防击穿 (Request Coalescing)**: 当大量并发请求同一资源时，通过全局 Map 合并排队，确保只有一个源站网络请求被发出，彻底防止缓存击穿。
- **🚑 强离线容灾**: 当后端服务宕机时，自动强制返回旧缓存 (`staleIfError`)；甚至可以无视 `no-store` 指令强制缓存一切内容 (`forceCache`)。
- **🕵️ 透明的缓存状态**: 自动在返回结果中注入 `x-proxy-cache` 响应头 (`HIT`, `STALE`, `MISS`, `STALE_IF_ERROR`)，极大方便调试与监控。
- **🌐 环境中立**: 完美适配所有支持 Web 标准 `Request`/`Response` API 的环境。

## 安装

```bash
pnpm add @isdk/proxy
```

## 快速开始：核心协调函数

使用 `@isdk/proxy` 的主要方式是通过 `fetchWithCache` 函数，它可以包装任何 HTTP 请求逻辑。

### 基础用法 (GET 请求)

```typescript
import { SmartCache, createCachedFetch } from '@isdk/proxy';

// 1. 初始化混合缓存实例
const cache = new SmartCache({
  storagePath: './.cache',
  maxMemorySize: 1024 * 1024 // 内存阈值 1MB
});

// 2. 创建一个预配置的缓存 Fetcher
const myFetch = createCachedFetch({
  cache,
  config: {
    staleIfError: true,
  },
  backgroundUpdate: true // 开启 SWR (过期后后台静默更新)
});

// 3. 愉快地使用它！
const response = await myFetch(new Request('https://api.example.com/data'), (req) => fetch(req));
console.log(response.headers.get('x-proxy-cache'));
```

### 进阶用法：缓存 POST 请求

你可以通过配置 `methods` 开启 POST/PUT 缓存，并使用 `body` 过滤器排除请求体中的动态字段（如时间戳、随机数），从而确保缓存键的稳定性。

```typescript
const myPostFetch = createCachedFetch({
  cache,
  config: {
    methods: ['GET', 'POST'], // 允许缓存 POST
    body: {
      exclude: ['timestamp', 'nonce'] // 生成缓存键时忽略这些动态字段
    },
    cacheRules: [
      { method: 'POST', path: '/api/v1/query' } // 仅对特定的 POST 接口生效
    ],
    forceCache: true // 对于 POST 请求，后端通常不发 Cache-Control，建议开启强制缓存
  }
});
```

## 配置详解：`SiteCacheConfig`

| 配置项 | 类型 | 说明 |
| :--- | :--- | :--- |
| `methods` | `string[]` | 允许缓存的 HTTP 方法列表。默认仅为 `['GET', 'HEAD']`。 |
| `cacheRules` | `CacheRule[]` | 精细化拦截规则。如果配置，请求必须匹配其中至少一条规则才会被缓存。 |
| `query` | `KeyFilterConfig` | URL 查询参数过滤（`include` 白名单 / `exclude` 黑名单）。 |
| `headers` | `KeyFilterConfig` | 请求头过滤。 |
| `cookies` | `KeyFilterConfig` | Cookie 字段过滤。 |
| `body` | `KeyFilterConfig` | **仅限 JSON** 的请求体字段过滤。 |
| `staleIfError`| `boolean` | 网络请求失败时，是否强制返回本地过期的旧缓存。 |
| `forceCache` | `boolean` | 是否无视源站指令强制执行缓存，常用于离线应用。 |

### `CacheRule` 规则对象
- `method`: 匹配的 HTTP 方法。
- `path`: 路径前缀匹配（如 `/api/`）。
- `query`: 键值对匹配。值可以是 `string`（全等匹配）、`true`（参数必须存在）、`false`（参数必须不存在）。

## 适配器 (Adapters)

`@isdk/proxy` 旨在成为环境无关的纯净核心。虽然核心库保持纯粹，但你可以轻松集成或找到针对特定环境的适配器：

- **MSW 适配器**: 参见 `@isdk/proxy-msw` (独立包)，将此缓存引擎作为 MSW 拦截器使用。
- **Axios 适配器**: 可以通过将 Axios 配置转换为 Web 标准 `Request` 轻松实现。
- **Crawlee 适配器**: 能够集成到爬虫生命周期中，减少重复抓取。

## 架构设计详解

### 1. 混合存储策略 (Hybrid Storage)

- **L1 (内存层)**: 基于 `@cacheable/memory`。对于小文件（小于 `maxMemorySize`），同时存储元数据和响应体。
- **L2 (磁盘层)**: 基于 `cacache`（内容寻址存储）。负责持久化和大数据存储。
- **性能优化**: 对于大文件，响应体只保存在磁盘，但其 **元数据（Metadata）** 仍会驻留在内存中。这意味着即使磁盘文件很大，系统依然可以瞬间判断其是否过期。

### 2. 请求合并 (Request Collapsing)

当多个并发请求同时遇到缓存缺失或过期时，`@isdk/proxy` 会利用 `In-Flight` 状态 Map 追踪正在进行的 Promise，确保只有**一个**真实的网络请求被发出。其他请求会根据配置选择等待新数据或立即返回现有的过期数据。

### 3. SWR 与 后台更新

当缓存过期但在 SWR 窗口内时：

1. `fetchWithCache` 立即构造并返回旧的 `Response`。
2. 启动异步网络请求。
3. 网络请求完成后，自动更新 L1 和 L2 缓存。

## API 参考

### `createCachedFetch(options)` (强烈推荐)

面向终端用户的高阶工厂函数。它会自动在内部闭包中维护并发追踪器，为你生成一个开箱即用、绝不会发生缓存击穿的 Fetch 实例。

- **`options.cache`**: `SmartCache` 实例。
- **`options.config`**: 全局缓存配置对象 (`SiteCacheConfig`):
  - `staleIfError` (boolean): 网络请求失败时，是否强制返回本地过期的旧缓存以保障可用性。
  - `forceCache` (boolean): 是否无视源站的 `Cache-Control: no-store` 指令强制执行缓存入盘。适用于极端弱网或离线优先的应用场景。
- **`options.backgroundUpdate`**: 设置为 `true` 以开启 SWR (Stale-While-Revalidate) 行为。
- **`options.activeCacheWrites`**: 可选参数。一个 `Map<string, Promise<void>>`，用于在多个 `createCachedFetch` 实例之间共享并发追踪状态，实现应用级别的缓存击穿防护。
- **返回值**: 一个可随处调用的 `(request: Request, fetcher: (req: Request) => Promise<Response>) => Promise<Response>` 包装函数。

### `createFetchWithCache(activeCacheWrites?)`

单一职责的高阶函数。专门用于封装和隔离 `activeCacheWrites` 并发追踪器。
它会返回一个绑定了闭包内 Map 的 `fetchWithCache` 变体函数。如果你正在构建中间件，但又不想使用顶层的 `createCachedFetch` 工厂，可以用它来免除手动维护追踪器的烦恼。

- **`activeCacheWrites`**: 可选参数。外部传入的 `Map<string, Promise<void>>` 作为并发追踪器。如果不提供，将自动创建一个新的内部 Map。在多个实例间共享同一个 Map 可以实现应用范围内的请求合并。
- **返回值**: `(request: Request, fetcher: (req: Request) => Promise<Response>, options: Omit<FetchWithCacheOptions, 'activeCacheWrites'>) => Promise<Response>`

### `fetchWithCache(request, fetcher, options)`

底层的核心缓存协调函数。如果你在开发更上层的插件或有特殊的生命周期控制需求，可以直接调用它。

- **`request`**: Web 标准的 `Request` 对象。
- **`fetcher`**: 发起真实网络请求的回调函数 `(req: Request) => Promise<Response>`。
- **`options.activeCacheWrites`**: 必须由**外部传入**的一个 `Map<string, Promise<void>>`，用于在多个并发的 `fetchWithCache` 调用间共享锁状态，以实现请求合并。如果你不想自己维护它，请使用 `createCachedFetch` 或 `createFetchWithCache`。

### `SmartCache`

管理多级混合存储的核心引擎。

- `new SmartCache(options)`
- **`options.maxMemorySize`**: 响应体进入内存 (L1) 的大小阈值（字节），超过此大小的文件将直接进入磁盘流传输（默认 `1048576` 即 1MB）。
- **`options.storagePath`**: 磁盘 L2 缓存（cacache）的物理存储路径（默认为操作系统的临时目录）。

### 缓存状态标头 (Cache Status Headers)

由 `@isdk/proxy` 处理并返回的所有 `Response`，其 Headers 中都会注入 `x-proxy-cache` 字段以便观测生命周期，可能的值有：

- `HIT`: 完美命中，数据完全来自于 L1 内存或 L2 磁盘缓存。
- `MISS`: 缓存未命中（或主动绕过缓存），数据真实来自于源站请求。
- `STALE`: 命中过期缓存（已通过 SWR 机制在后台发起了静默网络更新）。
- `STALE_IF_ERROR`: 源站请求失败（网络断开或报错），系统作为兜底强制返回了过期的旧缓存。

## 许可证

MIT
