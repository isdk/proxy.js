**@isdk/proxy**

***

# @isdk/proxy

A high-performance, developer-friendly caching engine for Node.js, specifically designed to solve the complexity of managing HTTP response caches in data-intensive applications.

## Why @isdk/proxy?

In high-concurrency environments—like **API Proxies**, **Web Scrapers**, or **Microservices**—managing caches is often a trade-off between speed and memory.

`@isdk/proxy` provides a **Hybrid Multi-tier Architecture** that gives you the best of both worlds:

- **It solves the Memory vs. Capacity problem**: Keeps small, hot responses in memory (L1) for nanosecond access, while offloading large bodies to persistent disk (L2) without losing the ability to instantly evaluate cache policies.
- **It prevents Cache Stampede**: When a hot entry expires, it ensures only ONE network request is made, preventing your upstream from being crushed by concurrent misses.
- **It is Framework-Agnostic**: Built on Web standard `Request`/`Response` objects, it decouples your caching logic from your HTTP client (MSW, Axios, Fetch, Crawlee, etc.).

## Key Features

- **🚀 Hybrid Multi-tier Cache**: Extreme speed with L1 (LRU Memory) and persistence with L2 (Content Addressable Disk via `cacache`).
- **📥 HTTP POST & Method Support**: Full support for caching POST, PUT, and other methods with intelligent request body fingerprinting.
- **🎯 Precision Filtering**: Fine-grained `cacheRules` to intercept specific paths or query parameters.
- **🌊 Streaming Native**: Fully stream-based internal pipeline natively prevents Out-Of-Memory (OOM) issues when proxying large files.
- **🧠 Intelligent Meta-Residency**: Metadata (Headers, Status, Policy) stays in memory regardless of body size, ensuring nanosecond cache policy evaluations.
- **🔄 Stale-While-Revalidate (SWR)**: Serve stale content instantly while updating the cache silently in the background.
- **🛡️ Request Coalescing (Anti-Stampede)**: Prevent cache stampede by coalescing identical concurrent requests using a shared tracker, ensuring only one network request is made.
- **🚑 Offline Resilience**: Automatically serve stale content if the upstream is down (`staleIfError`), or forcefully cache everything ignoring `Cache-Control: no-store` (`forceCache`).
- **🕵️ Transparent Cache Status**: Injects standard `x-proxy-cache` headers (`HIT`, `STALE`, `MISS`, `STALE_IF_ERROR`) into responses for easy observability.
- **🌐 Framework Agnostic**: Works everywhere by using standard Web `Request`/`Response` APIs.

## Installation

```bash
pnpm add @isdk/proxy
```

## Quick Start: The Core Orchestrator

The primary way to use `@isdk/proxy` is via the `fetchWithCache` function, which can wrap any HTTP request logic.

### Basic Usage (GET)

```typescript
import { SmartCache, createCachedFetch } from '@isdk/proxy';

// 1. Initialize the hybrid cache
const cache = new SmartCache({
  storagePath: './.cache',
  maxMemorySize: 1024 * 1024 // 1MB threshold
});

// 2. Create a pre-configured cached fetcher
const myFetch = createCachedFetch({
  cache,
  config: {
    staleIfError: true,
  },
  backgroundUpdate: true // Enable SWR
});

// 3. Use it!
const response = await myFetch(new Request('https://api.example.com/data'), (req) => fetch(req));
console.log(response.headers.get('x-proxy-cache'));
```

### Advanced Usage: Caching POST Requests

You can cache POST/PUT requests by enabling methods and defining body filters to ignore dynamic fields (like timestamps) in the request body.

```typescript
const myPostFetch = createCachedFetch({
  cache,
  config: {
    methods: ['GET', 'POST'], // Enable POST caching
    body: {
      exclude: ['timestamp', 'nonce'] // Ignore these fields when generating cache keys
    },
    cacheRules: [
      { method: 'POST', path: '/api/v1/query' } // Only cache specific POST endpoints
    ],
    forceCache: true // Often needed for POST if backend doesn't send Cache-Control
  }
});
```

## Configuration: `SiteCacheConfig`

| Field | Type | Description |
| :--- | :--- | :--- |
| `methods` | `string[]` | List of allowed HTTP methods. Default: `['GET', 'HEAD']`. |
| `cacheRules` | `CacheRule[]` | Fine-grained rules. If set, a request must match at least one rule to be cached. |
| `query` | `KeyFilterConfig` | Filters for URL search parameters (`include`/`exclude`). |
| `headers` | `KeyFilterConfig` | Filters for request headers. |
| `cookies` | `KeyFilterConfig` | Filters for cookies. |
| `body` | `KeyFilterConfig` | Filters for request body fields. For JSON, supports field-level filtering; also supports extracting key data via `extract` regex. |
| `staleIfError`| `boolean` | Serve stale cache on network failure. |
| `forceCache` | `boolean` | Ignore `no-store` and force caching (useful for offline support). |
| `offline` | `boolean` | Offline mode. Only reads from cache; throws `OfflineCacheMissError` if no cache exists. |

### `CacheRule` Object

- `method`: HTTP method to match.
- `path`: URL pathname matching (supports **RegExp**, **Glob**, **Array**, or **prefix match**).
- `query`: Key-value pairs. Values can be `string` (exact/Glob match), `true` (must exist), `false` (must not exist), or `RegExp`.
- `bodyType`: Match body type. Supports `'json'`, `'text'`, `'binary'`.
- `body`: Body content matching (supports **RegExp**, **Glob**, or **Array**).

---

### `fetchWithCache` Advanced Options

In addition to `SiteCacheConfig`, `fetchWithCache` supports the following control options:

| Option | Type | Description |
| :--- | :--- | :--- |
| `backgroundUpdate` | `boolean` | Whether to enable background async update (SWR). Default is `true`. |
| `onBackgroundUpdate`| `function` | Callback that receives the update Promise when a background update is triggered. Useful for task tracking. |
| `generateKey` | `function` | Custom cache key generation function. |

### Pattern Matching

`@isdk/proxy` provides powerful pattern matching for all configurable fields:

| Pattern Type | Example | Description |
| :--- | :--- | :--- |
| **RegExp** | `/api/v[12]/.*/i` | JavaScript RegExp (in JSON, use string like `"/api/v[12]/.*/i"`) |
| **Glob** | `/**/*.json` | File path style wildcard matching |
| **Negation** | `['!/api/private/**', '/api/**']` | Exclude patterns (prefixed with `!`, checked first) |
| **Array** | `['/api/v1/*', '/api/v2/*']` | Multiple patterns (OR logic, negative takes precedence) |
| **Boolean** | `true` / `false` | For query params: must/must not exist |

**Example with advanced pattern matching:**

```typescript
const myFetch = createCachedFetch({
  cache,
  config: {
    cacheRules: [
      {
        path: ['/api/v1/items/*', '!/api/v1/items/private/*'], // v1 items, exclude private
        query: {
          format: '/^(json|xml)$/',     // Regex for format param
          'page*': true                  // Glob: any param starting with 'page' must exist
        },
        body: /\"action\"\s*:\s*\"query\"/ // Regex body match
      }
    ]
  }
});
```

## Adapters

`@isdk/proxy` is designed to be framework-agnostic. While the core library is pure, you can find (or build) adapters for specific environments:

- **HTTP Caching Proxy Server (Node.js)**: See [@isdk/proxy-server](https://www.npmjs.com/package/@isdk/proxy-server) (separate package) for running a standalone HTTP forward proxy.
- **Crawlee Adapter**: See [@isdk/proxy-crawlee](https://www.npmjs.com/package/@isdk/proxy-crawlee) (separate package) for integrating with Crawlee web scraping lifecycle.
- **MSW Adapter**: See `@isdk/proxy-msw` (separate package) to use this caching engine as an MSW interceptor.
- **Axios Adapter**: Easily implemented by converting Axios config to Web `Request`.

## Architecture

### Hybrid Storage Strategy

- **L1 (Memory)**: Powered by `@cacheable/memory`. Stores both Meta and Body for small files (< `maxMemorySize`).
- **L2 (Disk)**: Powered by `cacache`. Stores all data for persistence.
- **Optimization**: For large files, only the Metadata is kept in memory. The body is streamed or read from disk only when requested, saving significant memory.

### Request Collapsing

When multiple concurrent requests hit a missing or expired cache entry, `@isdk/proxy` ensures that only **one** request goes to the network. Subsequent requests will wait for the same promise or serve the background-updated data.

## API Reference

### `createCachedFetch(options)` (Recommended)

A higher-order factory function designed for end-users. It creates a pre-configured `fetch` equivalent that automatically tracks concurrent requests internally to prevent cache stampedes.

- **`options.cache`**: An instance of `SmartCache`.
- **`options.config`**: A `SiteCacheConfig` object containing:
  - `staleIfError` (boolean): Serve stale cache if the network fails.
  - `forceCache` (boolean): Force cache everything, ignoring `Cache-Control: no-store`. Ideal for offline-first resilience.
- **`options.backgroundUpdate`**: Set to `true` to enable SWR behavior.
- **`options.activeCacheWrites`**: Optional. A `Map<string, Promise<void>>` that can be shared across multiple `createCachedFetch` instances to enable application-level cache stampede prevention.
- **Returns**: A reusable `(request: Request, fetcher: (req: Request) => Promise<Response>) => Promise<Response>` function.

### `createFetchWithCache(activeCacheWrites?)`

A single-responsibility higher-order function that encapsulates the `activeCacheWrites` concurrency tracker. It returns a variant of `fetchWithCache` that shares an internal Map to coalesce identical concurrent requests. Use this if you are building an intermediate wrapper but don't want to rely on the top-level `createCachedFetch` factory.

- **`activeCacheWrites`**: Optional. An external `Map<string, Promise<void>>` to be used as the concurrency tracker. If not provided, a new internal Map will be created. Sharing the same Map across multiple instances enables application-wide request coalescing.
- **Returns**: `(request: Request, fetcher: (req: Request) => Promise<Response>, options: Omit<FetchWithCacheOptions, 'activeCacheWrites'>) => Promise<Response>`

### `fetchWithCache(request, fetcher, options)`

The core caching orchestrator. Use this directly if you need low-level control or are building a library on top of it.

- **`request`**: Web Standard `Request`.
- **`fetcher`**: The raw fetching callback `(req: Request) => Promise<Response>`.
- **`options.activeCacheWrites`**: A `Map<string, Promise<void>>` that YOU must provide and maintain to coalesce concurrent requests. (If you don't want to manage this, use `createCachedFetch` or `createFetchWithCache` instead).

### `SmartCache`

The hybrid multi-tier storage engine.

- `new SmartCache(options)`
- **`options.maxMemorySize`**: Threshold (in bytes) for offloading bodies to disk (default `1048576`, i.e., 1MB).
- **`options.storagePath`**: Disk storage path for the `cacache` engine (defaults to a system temp folder).

### Utility Functions

Exported from `@isdk/proxy` for advanced usage:

#### `isMatch(pattern, value, usePrefix?)`

Universal pattern matching function. Supports RegExp, Glob, array patterns (with negation), and string prefix/exact matching.

- **`pattern`**: `string | RegExp | (string | RegExp)[]`
- **`value`**: The string to test against
- **`usePrefix`**: For plain strings, use prefix match instead of exact match (default: `false`)
- **Returns**: `boolean`

```typescript
import { isMatch } from '@isdk/proxy';

isMatch('/api/v[12]/.*', '/api/v1/users');     // RegExp
isMatch('/api/**/*.json', '/api/v1/data.json'); // Glob
isMatch(['!/private/**', '/api/**'], '/api/data'); // Negation
```

#### `isGlob(pattern)`

Check if a pattern is Glob syntax.

- **`pattern`**: `string`
- **Returns**: `boolean`

#### `getSiteConfig(urlString, proxyConfig)`

Get the site-specific cache configuration for a given URL.

- **`urlString`**: Full URL to match
- **`proxyConfig`**: `ProxyConfig` object with `sites` and `default` config
- **Returns**: `SiteCacheConfig`

```typescript
import { getSiteConfig } from '@isdk/proxy';

const config = getSiteConfig('https://api.example.com/data', {
  default: { methods: ['GET'] },
  sites: {
    'api.example.com': { methods: ['GET', 'POST'], forceCache: true },
    '/internal/': { staleIfError: true } // prefix match
  }
});
```

#### `isAllowed(key, config, defaultAllowed?)`

Check if a key is allowed to participate in cache key fingerprinting.

- **`key`**: The key name to check
- **`config`**: `KeyFilterConfig` with `include` (whitelist) or `exclude` (blacklist)
- **`defaultAllowed`**: Optional. Default value when no config or no match
- **Returns**: `boolean | undefined`

**Priority Logic**:

1. `exclude` hit → returns `false` (highest priority)
2. `include` exists and hits → returns `true`
3. `include` exists but no hit → returns `false`
4. No config → uses `defaultAllowed` (returns `undefined` if not provided)

```typescript
import { isAllowed } from '@isdk/proxy';

// No config
isAllowed('key'); // undefined (falsy)

// Whitelist
isAllowed('id', { include: ['id', 'name'] }); // true
isAllowed('email', { include: ['id', 'name'] }); // false

// Blacklist
isAllowed('password', { exclude: ['password'] }); // false
isAllowed('name', { exclude: ['password'] }); // undefined (falsy)

// Need defaultAllowed to set default
isAllowed('name', { exclude: ['password'] }, true); // true
```

#### `extractData(source, config, defaultAllowed?)`

Extract and normalize data from a source object based on filter config. Used for generating cache fingerprints.

- **`source`**: Original data object (Query, Headers, Cookies, etc.)
- **`config`**: `KeyFilterConfig` object
- **`defaultAllowed`**: Optional. Whether to allow extraction when no config or no match (default `false`)
- **Returns**: `Record<string, string[]>` normalized data with lowercase keys and sorted array values

```typescript
import { extractData } from '@isdk/proxy';

const headers = { 'Content-Type': 'application/json', 'X-Request-Id': '123' };

// No extraction by default
extractData(headers); // {}

// Extract all keys
extractData(headers, undefined, true); // { 'content-type': ['application/json'], 'x-request-id': ['123'] }

// Whitelist
extractData(headers, { include: ['content-type'] }); // { 'content-type': ['application/json'] }

// Blacklist
extractData(headers, { include: ['*'], exclude: ['x-request-id'] }, true); // { 'content-type': ['application/json'] }
```

### `prefetch(options)`

Pre-cache function that fetches and stores a list of URLs into cache ahead of time.

- **`urls`**: `PrefetchRequest[]`. Each object contains `url` and optional `request` config.
- **`config`**: `ProxyConfig` full configuration.
- **`cache`**: `SmartCache` instance.
- **`concurrency`**: Concurrency limit (default `3`).
- **`onProgress`**: Progress callback `(completed, total, url) => void`.

```typescript
import { prefetch } from '@isdk/proxy';

const result = await prefetch({
  urls: [
    { url: 'https://api.example.com/page1' },
    { url: 'https://api.example.com/api2', request: { method: 'POST', body: '...' } }
  ],
  config,
  cache,
  onProgress: (c, t, url) => console.log(`Progress: ${c}/${t} - ${url}`)
});
console.log(`Succeeded: ${result.succeeded}, Failed: ${result.failed}`);
```

### Error Handling: `OfflineCacheMissError`

When `offline: true` mode is enabled and a request does not hit the cache, this error is thrown.

- **`name`**: `OfflineCacheMissError`
- **`code`**: `ERR_OFFLINE_CACHE_MISS` (can be imported as `OfflineCacheMissErrorCode`)

```typescript
import { OfflineCacheMissError } from '@isdk/proxy';

try {
  await myFetch(request);
} catch (e) {
  if (e instanceof OfflineCacheMissError) {
    // Handle offline cache miss
  }
}
```

### Cache Status Headers

Every response processed by `@isdk/proxy` will include an `x-proxy-cache` header indicating its lifecycle:

- `HIT`: Served entirely from L1 or L2 cache.
- `MISS`: Bypassed cache and fetched from the origin server.
- `STALE`: Served from stale cache while a background update was initiated (SWR).
- `STALE_IF_ERROR`: Origin fetch failed; served from stale cache as a fallback.

## License

MIT
