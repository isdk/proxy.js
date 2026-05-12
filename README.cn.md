# @isdk/proxy

这是一个专为 Node.js 开发者设计的高性能、开发者友好的缓存引擎，旨在解决数据密集型应用中 HTTP 响应缓存管理的复杂性。

## 为什么选择 @isdk/proxy？

在**高并发 API 代理**、**网页爬虫**或**微服务**等场景下，缓存管理通常需要在“速度”和“容量”之间进行妥协。`@isdk/proxy` 通过其独特的**混合多级架构**，完美解决了这一痛点：

- **双遍扫描流水线 (Two-Pass Pipeline)**：内部采用解耦的“门控”与“指纹提取”流水线。 gatekeeping（判定是否可缓存）与 fingerprinting（生成缓存键）基于同一套配置逻辑，实现了语义的完全正交。
- **解决“内存 vs. 容量”的矛盾**：它将小而热的响应存储在内存 (L1) 中以实现纳秒级访问，同时将大文件响应体转储到持久化磁盘 (L2)。更重要的是，它实现了 **“元数据驻留”**——无论响应体多大，其判定逻辑（Headers、Status、Policy）始终保留在内存中，确保瞬时完成缓存有效性评估。
- **防止缓存雪崩/击穿 (Cache Stampede)**：当一个热点缓存失效时，它通过内置的“请求合并”机制，确保同一时间只有一个网络请求被发出，有效保护上游服务器不被瞬间激增的并发请求压垮。
- **完全解耦，环境中立**：基于 Web 标准的 `Request`/`Response` 对象构建。这意味着你的缓存逻辑不再被某个具体的 HTTP 库所绑定，一套逻辑，到处运行。

## 核心特性

- **🚀 混合多级缓存**: L1 (LRU 内存) 提供极速响应，L2 (内容寻址磁盘 `cacache`) 提供持久化存储。
- **📥 HTTP POST & 多方法支持**: 完整支持 POST、PUT 等非 GET 方法的缓存，内置智能请求体指纹计算机制。
- **🎯 精细化规则拦截**: 支持通过 `rules` 对特定路径或字段进行外科手术式的精确缓存控制。
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

### 进阶用法：配置 POST 请求与字段过滤

你可以通过配置 `methods` 开启 POST/PUT 缓存，并使用 `body` 过滤器排除请求体中的动态字段（如时间戳、随机数），从而确保缓存键的稳定性。

```typescript
const myPostFetch = createCachedFetch({
  cache,
  config: {
    methods: ['GET', 'POST'],
    // Query 过滤：默认提取全部，此处排除 timestamp
    query: ['*', '!timestamp'],
    // 请求体过滤：支持字段级匹配
    body: {
      match: ['!nonce'] // 生成缓存键时忽略这些动态字段
    },
    rules: [
      { methods: ['POST'], path: '/api/v1/query' }
    ],
    forceCache: true // 对于 POST 请求，后端通常不发 Cache-Control，建议开启强制缓存
  }
});
```

## 配置详解

### `ProxySiteConfig` 站点配置

| 配置项 | 类型 | 说明 |
| :--- | :--- | :--- |
| `path` | `MatchPatterns` | 路径门控。支持 Glob、正则或否定模式。 |
| `methods` | `MatchPatterns` | 允许缓存的 HTTP 方法。默认 `['GET', 'HEAD']`。 |
| `rules` | `ProxyCacheRule[]` | 精细化拦截规则。匹配到的规则将与站点级配置进行深度合并。 |
| `query` | `FieldConfig` | URL 查询参数过滤。默认全量提取。 |
| `headers` | `FieldConfig` | 请求头过滤。默认全量**不**提取。 |
| `cookies` | `FieldConfig` | Cookie 字段过滤。默认全量**不**提取。 |
| `body` | `BodyConfig` | 请求体匹配与提取。支持 JSON 字段过滤、Text 正则提取和 Binary 全量哈希。 |
| `staleIfError`| `boolean` | 网络请求失败时，是否强制返回本地过期的旧缓存。 |
| `forceCache` | `boolean` | 是否无视源站指令强制执行缓存。 |
| `offline` | `boolean` | 离线模式。开启后只读缓存，若无缓存则抛出 `OfflineCacheMissError`。 |

### `ProxyCacheRule` 规则对象

规则对象用于 `rules` 列表中，其字段与 `ProxySiteConfig` 基本一致，但专注于特定请求的匹配逻辑。

---

### `fetchWithCache` 高级选项

除了 `ProxySiteConfig` 外，`fetchWithCache` 还支持以下控制选项：

| 选项 | 类型 | 说明 |
| :--- | :--- | :--- |
| `backgroundUpdate` | `boolean` | 是否启用后台异步更新 (SWR)。默认为 `true`。 |
| `onBackgroundUpdate`| `function` | 当触发后台更新时，接收该更新 Promise 的回调。可用作任务追踪。 |
| `generateKey` | `function` | 自定义缓存键生成函数。 |

### 模式匹配说明 (MatchPatterns)

`@isdk/proxy` 提供强大的模式匹配能力，支持否定模式（`!`）和优先级判定：

| 模式类型 | 示例 | 说明 |
| :--- | :--- | :--- |
| **正则表达式** | `/api/v[12]/.*/i` | JavaScript 正则。 |
| **Glob 通配符** | `/**/*.json` | 文件路径风格通配符匹配。 |
| **否定模式** | `['*', '!/api/private/**']` | 排除匹配（以 `!` 开头）。 |
| **数组格式** | `['/api/v1/*', '/api/v2/*']` | 多模式组合（OR 逻辑，负向模式具有最高优先级）。 |

## 适配器 (Adapters)

`@isdk/proxy` 旨在成为环境无关的纯净核心。你可以轻松集成或找到针对特定环境的适配器：

- **HTTP 代理服务器 (Node.js)**: 参见 [@isdk/proxy-server](https://www.npmjs.com/package/@isdk/proxy-server)。
- **Crawlee 适配器**: 参见 [@isdk/proxy-crawlee](https://www.npmjs.com/package/@isdk/proxy-crawlee)。
- **MSW 适配器**: 参见 [@isdk/proxy-msw](https://www.npmjs.com/package/@isdk/proxy-msw)。

## 架构设计详解

### 1. 混合存储策略 (Hybrid Storage)

- **L1 (内存层)**: 基于 LRU 缓存。对于小于 `maxMemorySize` 的响应体，同时存储元数据和内容。
- **L2 (磁盘层)**: 基于 `cacache`。负责持久化和大数据存储。
- **元数据驻留**: 无论文件多大，元数据始终驻留在内存中，确保纳秒级的缓存策略判定。

### 2. 请求合并 (Request Collapsing)

当多个并发请求同时遇到缓存缺失或过期时，系统会利用 `In-Flight` 状态追踪正在进行的 Promise，确保只有一个网络请求被发出。其他请求会等待该请求结果或返回现有的过期数据。

### 3. SWR 与 后台更新

当缓存过期但在 SWR 窗口内时：立即返回旧的 `Response`，并启动异步后台请求更新缓存。

## API 参考

### `createCachedFetch(options)` (强烈推荐)

面向终端用户的高阶工厂函数。它会自动在内部闭包中维护并发追踪器，为你生成一个开箱即用、具备缓存击穿防护的 Fetch 实例。

- **`options.cache`**: `SmartCache` 实例。
- **`options.config`**: 全局缓存配置对象 (`ProxyConfig`)。
- **`options.backgroundUpdate`**: 是否启用后台异步更新 (SWR)。默认为 `true`。
- **`options.onBackgroundUpdate`**: 当触发后台更新时，接收该更新 Promise 的回调。
- **`options.activeCacheWrites`**: 可选。共享的并发追踪器 Map。
- **返回值**: 一个包装后的 Fetch 函数 `(request, fetcher) => Promise<Response>`。

### `createFetchWithCache(activeCacheWrites?)`

单一职责的高阶函数。专门用于封装和隔离 `activeCacheWrites` 并发追踪器。
如果你正在构建中间件，但又不想使用顶层的 `createCachedFetch` 工厂，可以用它来免除手动维护追踪器的烦恼。

- **`activeCacheWrites`**: 可选。外部传入的 `Map<string, Promise<void>>`。如果不提供，将自动创建一个新的内部 Map。
- **返回值**: 绑定了追踪器的 `fetchWithCache` 变体函数。

### `fetchWithCache(request, fetcher, options)`

底层的核心缓存协调函数。

- **`request`**: Web 标准的 `Request` 对象。
- **`fetcher`**: 发起真实网络请求的回调函数 `(req: Request) => Promise<Response>`。
- **`options.activeCacheWrites`**: 必须由**外部传入**的一个 `Map<string, Promise<void>>`，用于在多个并发的 `fetchWithCache` 调用间共享锁状态，以实现请求合并。如果你不想自己维护它，请使用 `createCachedFetch` 或 `createFetchWithCache`。

### `SmartCache`

管理多级混合存储的核心引擎。

- `new SmartCache(options)`
- **`options.maxMemorySize`**: 响应体进入内存 (L1) 的大小阈值（字节），超过此大小的文件将直接进入磁盘流传输（默认 `1048576` 即 1MB）。
- **`options.storagePath`**: 磁盘 L2 缓存（cacache）的物理存储路径（默认为操作系统的临时目录）。

### 工具函数

#### `isMatch(pattern, value, usePrefix?, defaultIfNoPositives?, ignoreCase?)`

通用模式匹配函数。支持正则表达式、Glob、数组模式（含否定）和字符串前缀/精确匹配。

- **`pattern`**: `string | RegExp | (string | RegExp)[]`
- **`value`**: 要测试的字符串。
- **`usePrefix`**: 是否使用前缀匹配（默认：`false`）。
- **`defaultIfNoPositives`**: 当数组中没有正向模式时的默认返回值（默认：`true`）。
- **`ignoreCase`**: 是否忽略大小写（默认：`true`）。

```typescript
import { isMatch } from '@isdk/proxy';

isMatch('/api/v[12]/.*', '/api/v1/users');           // 正则表达式
isMatch('/api/**/*.json', '/api/v1/data.json');       // Glob 通配符
isMatch(['*', '!/private/**'], '/api/data');         // 否定模式：允许所有但排除 private
isMatch(['!id'], 'id', false, false);                // 返回 false (因为没有正向匹配)
```

#### `isGlob(pattern)`

判断字符串是否为 Glob 语法。

- **`pattern`**: `string`
- **返回值**: `boolean`

```typescript
import { isGlob } from '@isdk/proxy';

isGlob('/api/*.json'); // true
isGlob('/api/v1');     // false
```

#### `getSiteConfig(urlString, proxyConfig)`

根据 URL 获取对应的站点级缓存配置。它会首先尝试匹配 `sites` 中的主机名或路径前缀，如果没有匹配，则回退到 `proxyConfig` 本身。

- **`urlString`**: 完整的请求 URL。
- **`proxyConfig`**: 包含 `sites` 和 全局规则的 `ProxyConfig` 对象。
- **返回值**: `ProxySiteConfig` 对象。

```typescript
import { getSiteConfig } from '@isdk/proxy';

const config = getSiteConfig('https://api.example.com/data', {
  methods: ['GET'],
  sites: {
    'api.example.com': { forceCache: true }, // 域名匹配
    '/internal/': { offline: true }          // 路径前缀匹配
  }
});
```

#### `isAllowed(key, config, defaultAllowed?)`

判定指定的键是否允许参与缓存计算。

- **`key`**: 键名（如 Header 名）。
- **`config`**: `ProxyMatchPatterns` 匹配模式。
- **`defaultAllowed`**: 当配置未命中时的默认策略。

```typescript
import { isAllowed } from '@isdk/proxy';

isAllowed('id', ['id', 'name']);           // true (白名单)
isAllowed('auth', ['*', '!auth']);         // false (黑名单)
isAllowed('other', ['!id'], false, false); // false (默认不通过)
```

#### `extractData(source, config, defaultAllowed?)`

从源对象中根据过滤配置提取数据并标准化。用于生成缓存指纹。

- **`source`**: 原始数据对象。
- **`config`**: `ProxyFieldConfig` 或 `ProxyMatchPatterns` 配置。
- **`defaultAllowed`**: 默认是否允许提取。

```typescript
import { extractData } from '@isdk/proxy';

const headers = { 'Content-Type': 'application/json', 'X-Token': 'abc' };

// 数组模式：过滤 Key
extractData(headers, ['content-type']); // { 'content-type': ['application/json'] }

// 对象模式：精准匹配 Value
extractData(headers, {
  'content-type': '/^application\/.*/'
}); // { 'content-type': ['application/json'] }
```
- **返回值**: `Record<string, string[]>` 标准化后的数据，键为小写，值为排序后的数组。

---

### `prefetch(options)`

预缓存函数，提前将指定的 URL 列表内容存入缓存。

- **`options.urls`**: `PrefetchRequest[]`。包含 `url` 和可选的 `request` 参数。
- **`options.config`**: `ProxyConfig` 完整配置。
- **`options.cache`**: `SmartCache` 实例。
- **`options.concurrency`**: 并发数（默认 `3`）。
- **`options.onProgress`**: 进度回调 `(completed, total, url) => void`。

- **返回值**: `Promise<PrefetchResult>`
  - `succeeded`: 成功预取的请求数量。
  - `failed`: 失败的数量。
  - `errors`: 失败详情列表 `{ url, error }[]`。

```typescript
import { prefetch } from '@isdk/proxy';

const result = await prefetch({
  urls: [{ url: 'https://api.com/page1' }],
  config,
  cache,
  onProgress: (c, t, url) => console.log(`${c}/${t}: ${url}`)
});
console.log(`Succeeded: ${result.succeeded}, Failed: ${result.failed}`);
```

### 错误处理：`OfflineCacheMissError`

在开启 `offline: true` 模式时，如果请求未命中缓存，将抛出此错误。

- **`name`**: `OfflineCacheMissError`
- **`code`**: `512` (自定义状态码)

```typescript
import { OfflineCacheMissError } from '@isdk/proxy';

try {
  await myFetch(request);
} catch (e) {
  if (e instanceof OfflineCacheMissError) {
    // 处理缓存未命中
  }
}
```

### 缓存状态标头 (Cache Status Headers)

由 `@isdk/proxy` 处理并返回的所有 `Response`，其 Headers 中都会注入 `x-proxy-cache` 字段以便观测生命周期，可能的值有：

- `HIT`: 完美命中，数据完全来自于 L1 内存或 L2 磁盘缓存。
- `MISS`: 缓存未命中（或主动绕过缓存），数据真实来自于源站请求。
- `STALE`: 命中过期缓存（已通过 SWR 机制在后台发起了静默网络更新）。
- `STALE_IF_ERROR`: 源站请求失败（网络断开或报错），系统作为兜底强制返回了过期的旧缓存。

## 许可证

MIT
