# @isdk/proxy

这是一个专为 Node.js 开发者设计的高性能、开发者友好的缓存引擎，旨在解决数据密集型应用中 HTTP 响应缓存管理的复杂性。

## 为什么选择 @isdk/proxy？

在**高并发 API 代理**、**网页爬虫**或**微服务**等场景下，缓存管理通常需要在“速度”和“容量”之间进行妥协。`@isdk/proxy` 通过其独特的**混合多级架构**，完美解决了这一痛点：

- **解决“内存 vs. 容量”的矛盾**：它将小而热的响应存储在内存 (L1) 中以实现纳秒级访问，同时将大文件响应体转储到持久化磁盘 (L2)。更重要的是，它实现了 **“元数据驻留”**——无论响应体多大，其判定逻辑（Headers、Status、Policy）始终保留在内存中，确保瞬时完成缓存有效性评估。
- **防止缓存雪崩/击穿 (Cache Stampede)**：当一个热点缓存失效时，它通过内置的“请求合并”机制，确保同一时间只有一个网络请求被发出，有效保护上游服务器不被瞬间激增的并发请求压垮。
- **完全解耦，环境中立**：基于 Web 标准的 `Request`/`Response` 对象构建。这意味着你的缓存逻辑不再被某个具体的 HTTP 库（如 MSW, Axios, Fetch 或 Crawlee）所绑定，一套逻辑，到处运行。

## 核心特性

- **🚀 混合多级缓存**: L1 (LRU 内存) 提供极速响应，L2 (内容寻址磁盘 `cacache`) 提供持久化存储。
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

```typescript
import { SmartCache, createCachedFetch } from '@isdk/proxy';

// 1. 初始化混合缓存实例
const cache = new SmartCache({
  storagePath: './.cache',
  maxMemorySize: 1024 * 1024 // 内存阈值 1MB
});

// 2. 创建一个预配置的缓存 Fetcher (内部会自动防缓存击穿)
const myFetch = createCachedFetch({
  cache,
  config: { 
    staleIfError: true,
    forceCache: false // 设置为 true 可无视 no-store 强制缓存一切，适用于离线应用
  },
  backgroundUpdate: true // 开启 SWR (过期后后台静默更新)
});

// 3. 在应用的任何地方愉快地使用它！
const request = new Request('https://api.example.com/data');
const response = await myFetch(request, (req) => fetch(req)); // 传入任何返回 Promise<Response> 的获取函数

console.log(response.headers.get('x-proxy-cache')); // 输出: "MISS", "HIT", "STALE" 或 "STALE_IF_ERROR"
const data = await response.json();
```

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
- **返回值**: 一个可随处调用的 `(request: Request, fetcher: (req: Request) => Promise<Response>) => Promise<Response>` 包装函数。

### `createFetchWithCache()`

单一职责的高阶函数。专门用于封装和隔离 `activeCacheWrites` 并发追踪器。
它会返回一个绑定了闭包内 Map 的 `fetchWithCache` 变体函数。如果你正在构建中间件，但又不想使用顶层的 `createCachedFetch` 工厂，可以用它来免除手动维护追踪器的烦恼。

- **返回值**: `(request: Request, fetcher: (req: Request) => Promise<Response>, options: Omit<FetchWithCacheOptions, 'activeCacheWrites'>) => Promise<Response>`

### `fetchWithCache(request, fetcher, options)`

底层的核心缓存协调函数。如果你在开发更上层的插件或有特殊的生命周期控制需求，可以直接调用它。

- **`request`**: Web 标准的 `Request` 对象。
- **`fetcher`**: 发起真实网络请求的回调函数 `(req: Request) => Promise<Response>`。
- **`options.activeCacheWrites`**: 必须由**外部传入**的一个 `Map<string, Promise<void>>`，用于在多个并发的 `fetchWithCache` 调用间共享锁状态，以实现请求合并。如果你不想自己维护它，请使用 `createCachedFetch`。

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
