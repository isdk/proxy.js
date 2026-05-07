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

```typescript
import { SmartCache, createCachedFetch } from '@isdk/proxy';

// 1. Initialize the hybrid cache
const cache = new SmartCache({
  storagePath: './.cache',
  maxMemorySize: 1024 * 1024 // 1MB threshold
});

// 2. Create a pre-configured cached fetcher (automatically tracks concurrent requests)
const myFetch = createCachedFetch({
  cache,
  config: { 
    staleIfError: true,
    forceCache: false // Set to true to cache everything (ignore no-store) for offline-first apps
  },
  backgroundUpdate: true // Enable SWR
});

// 3. Use it anywhere in your app!
const request = new Request('https://api.example.com/data');
const response = await myFetch(request, (req) => fetch(req));

console.log(response.headers.get('x-proxy-cache')); // "MISS", "HIT", "STALE", or "STALE_IF_ERROR"
const data = await response.json();
```

## Adapters

`@isdk/proxy` is designed to be framework-agnostic. While the core library is pure, you can find (or build) adapters for specific environments:

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
- **Returns**: A reusable `(request: Request, fetcher: (req: Request) => Promise<Response>) => Promise<Response>` function.

### `createFetchWithCache()`

A single-responsibility higher-order function that encapsulates the `activeCacheWrites` concurrency tracker. It returns a variant of `fetchWithCache` that shares an internal Map to coalesce identical concurrent requests. Use this if you are building an intermediate wrapper but don't want to rely on the top-level `createCachedFetch` factory.

- **Returns**: `(request: Request, fetcher: (req: Request) => Promise<Response>, options: Omit<FetchWithCacheOptions, 'activeCacheWrites'>) => Promise<Response>`

### `fetchWithCache(request, fetcher, options)`

The core caching orchestrator. Use this directly if you need low-level control or are building a library on top of it.

- **`request`**: Web Standard `Request`.
- **`fetcher`**: The raw fetching callback `(req: Request) => Promise<Response>`.
- **`options.activeCacheWrites`**: A `Map<string, Promise<void>>` that YOU must provide and maintain to coalesce concurrent requests. (If you don't want to manage this, use `createCachedFetch` instead).

### `SmartCache`

The hybrid multi-tier storage engine.

- `new SmartCache(options)`
- **`options.maxMemorySize`**: Threshold (in bytes) for offloading bodies to disk (default `1048576`, i.e., 1MB).
- **`options.storagePath`**: Disk storage path for the `cacache` engine (defaults to a system temp folder).

### Cache Status Headers

Every response processed by `@isdk/proxy` will include an `x-proxy-cache` header indicating its lifecycle:
- `HIT`: Served entirely from L1 or L2 cache.
- `MISS`: Bypassed cache and fetched from the origin server.
- `STALE`: Served from stale cache while a background update was initiated (SWR).
- `STALE_IF_ERROR`: Origin fetch failed; served from stale cache as a fallback.

## License

MIT
