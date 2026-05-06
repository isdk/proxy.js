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
- **🧠 Intelligent Meta-Residency**: Metadata (Headers, Status, Policy) stays in memory regardless of body size, ensuring nanosecond cache policy evaluations.
- **🔄 Stale-While-Revalidate (SWR)**: Serve stale content instantly while updating the cache silently in the background.
- **🛡️ Request Collapsing**: Prevent cache stampede by ensuring only one network request is made for concurrent misses on the same resource.
- **🚑 Error Fallback (Stale-If-Error)**: Automatically serve stale content if the upstream is down.
- **🌐 Framework Agnostic**: Works everywhere by using standard Web `Request`/`Response` APIs.

## Installation

```bash
pnpm add @isdk/proxy
```

## Quick Start: The Core Orchestrator

The primary way to use `@isdk/proxy` is via the `fetchWithCache` function, which can wrap any HTTP request logic.

```typescript
import { SmartCache, fetchWithCache } from '@isdk/proxy';

// 1. Initialize the hybrid cache
const cache = new SmartCache({
  storagePath: './.cache',
  maxMemorySize: 1024 * 1024 // 1MB threshold
});

// 2. Wrap your fetcher
const request = new Request('https://api.example.com/data');
const response = await fetchWithCache(
  request,
  (req) => fetch(req), // Any fetcher that returns a Promise<Response>
  {
    cache,
    config: { staleIfError: true },
    backgroundUpdate: true // Enable SWR
  }
);

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

### `SmartCache`

The class managing multi-tier storage.

- `new SmartCache(options)`
- `options.maxMemorySize`: Threshold for offloading bodies to disk (default 1MB).

### `fetchWithCache`

The central orchestrator for the caching lifecycle.

- `request`: Web Standard `Request`.
- `fetcher`: `(req: Request) => Promise<Response>`.
- `options.backgroundUpdate`: Set to `true` for SWR behavior.

## License

MIT
