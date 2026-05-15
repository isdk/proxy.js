# @isdk/proxy

A high-performance, developer-friendly cache proxy engine for Node.js designed to handle the complexity of HTTP response caching in data-intensive applications.

## Why @isdk/proxy?

In scenarios like **high-concurrency API proxies**, **web crawlers**, or **microservices**, cache management often requires compromises between "speed" and "capacity". `@isdk/proxy` solves this with its unique architecture:

- **Two-Pass Pipeline**: Features a decoupled pipeline for "Gatekeeping" (determining cacheability) and "Fingerprinting" (generating cache keys). Both stages use the same configuration logic, achieving full semantic orthogonality.
- **Metadata Residency**: Metadata (Headers, Status, Policy) always resides in memory, ensuring nanosecond-level cache validity assessment regardless of response body size.
- **Request Coalescing**: Prevents cache stampedes by ensuring only one concurrent request is sent to the origin when a hot cache expires.
- **Environment Agnostic**: Built on Web Standard `Request`/`Response` objects. Works anywhere.

## Core Features

- **🚀 Hybrid Multi-tier Cache**: L1 (LRU memory) for instant response, L2 (content-addressable disk `cacache`) for persistent storage.
- **📥 HTTP POST & Multi-method Support**: Full support for caching POST, PUT, and other non-GET methods with intelligent body fingerprinting.
- **🎯 Granular Interception**: Surgical precision in cache control via `rules` for specific paths or fields.
- **🌊 Native Streaming**: Built entirely on stream pipelines to prevent OOM when proxying large files.
- **🧠 Intelligent Metadata Residency**: Metadata (Headers, Status, Policy) stays in memory for instant policy decisions.
- **🔄 Stale-While-Revalidate (SWR)**: Returns stale data instantly while updating the cache in the background.
- **🛡️ Request Coalescing**: Merges concurrent requests for the same resource to protect upstream servers.
- **🚑 High Resiliency & STALE_RESCUE**: Automatically returns stale cache on backend failure (`staleIfError`). When WAF challenges, dirty data (via `minLength` or `body` patterns), or 403/429 blocks are detected, it protects the valid old cache and returns it as `STALE_RESCUE`.
- **🛡️ Built-in WAF Presets**: Pre-integrated presets for Cloudflare, AWS WAF, and others, ready to use out of the box.
- **🕵️ Transparent Status**: Injects `x-proxy-cache` header (`HIT`, `STALE`, `MISS`, `STALE_RESCUE`, `STALE_IF_ERROR`) for easy debugging.

## Installation

```bash
pnpm add @isdk/proxy
```

## Quick Start: Core Coordination

The primary way to use `@isdk/proxy` is through the `fetchWithCache` function, which can wrap any HTTP request logic.

### Basic Usage (GET Request)

```typescript
import { SmartCache, createCachedFetch } from '@isdk/proxy';

// 1. Initialize hybrid cache instance
const cache = new SmartCache({
  storagePath: './.cache',
  maxMemorySize: 1024 * 1024 // 1MB memory threshold
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

### Advanced: POST Requests & Field Filtering

Configure `methods` to enable POST caching and use field filters to ensure cache key stability.

```typescript
const myPostFetch = createCachedFetch({
  cache,
  config: {
    methods: ['GET', 'POST'],
    // Query filtering: defaults to all, here excluding 'timestamp'
    query: ['*', '!timestamp'],
    // Body filtering: field-level matching for JSON
    body: {
      match: { 'action': 'query', 'version': true },
      maxLength: 1024 // Limit body read length
    },
    rules: [
      { methods: ['POST'], path: '/api/v1/query' }
    ],
    forceCache: true
  }
});
```

## Configuration Reference

### `ProxySiteConfig`

| Option | Type | Description |
| :--- | :--- | :--- |
| `path` | `MatchPatterns` | Path gatekeeping. Supports Glob, Regex, or Negation. |
| `methods` | `MatchPatterns` | Allowed HTTP methods. Default `['GET', 'HEAD']`. |
| `rules` | `ProxyCacheRule[]` | Granular rules. Matched rules are deeply merged with site-level config. |
| `query` | `FieldConfig` | Query parameter filtering. Defaults to all. |
| `headers` | `FieldConfig` | Header filtering. Defaults to none. |
| `cookies` | `FieldConfig` | Cookie filtering. Defaults to none. |
| `body` | `BodyConfig` | Body matching & extraction. |
| `staleIfError`| `boolean` | Return stale cache on backend errors. |
| `forceCache` | `boolean` | Force caching regardless of origin directives. |
| `offline` | `boolean` | Strict offline mode: Read-only cache, returns `512` on cache miss. |
| `response` | `ResponseConfig` | Response-side cacheability validation. Supports status, headers, and body matching. |

### `ResponseConfig`

Define "what is valid and cacheable content" to automatically filter out WAF challenge pages.

| Option | Type | Description |
| :--- | :--- | :--- |
| `statuses` | `MatchPatterns`| Allowed HTTP status codes. Defaults to common cacheable statuses (200, 404, etc.). |
| `headers` | `FieldConfig` | Required or forbidden response headers. |
| `body` | `MatchPatterns`| Response body matching. Supports Glob negation (e.g., `!*Challenge*`) to exclude dirty data. |
| `minLength` | `number` | Minimum content length. Shorter responses will be intercepted (triggers `STALE_RESCUE`). |

### Cache Status Meanings (`x-proxy-cache`)

| Status | Description |
| :--- | :--- |
| `HIT` | Cache hit, fresh content within TTL. |
| `OFFLINE_HIT` | Cache hit successfully in `offline: true` mode. |
| `STALE` | Cache hit but expired, SWR background update triggered. |
| `MISS` | Cache miss, request sent to origin and result cached. |
| `STALE_IF_ERROR` | Origin request failed (network error or 5xx), returned expired stale cache. |
| `STALE_RESCUE_{REASON}` | Disaster recovery protection. Served valid old cache when origin returned invalid data (e.g., `WAF_CHALLENGE` or `TOO_SHORT`). |
| `MISS_EXCLUDED_REQUEST` | Request excluded from caching by configuration rules (method, path, etc.). |
| `OFFLINE_MISS_EXCLUDED_REQUEST` | Offline mode, request excluded by rules and no local cache available. |
| `MISS_UNSTORABLE` | Response not storable (e.g., `no-store` directive and `forceCache` off). |
| `MISS_EXCLUDED_{REASON}` | Response validation failed (e.g., body too short or WAF challenge detected). |
| `MISS_EXCLUDED_WAF_CHALLENGE`| Explicitly detected WAF challenge page and no old cache available. |

### Built-in WAF Protection

`@isdk/proxy` includes识别主流 WAF 厂商的内置识别规则. It's enabled by default via `isResponseCacheable` options. You can also import specific presets:

```typescript
import { CLOUDFLARE_WAF_PRESET, AWS_WAF_PRESET, isWAFChallenge } from '@isdk/proxy';

// Scenario A: Declarative Interception (Auto-filter via rules)
const config = {
  rules: [
    { 
      path: '/api/**', 
      ...CLOUDFLARE_WAF_PRESET // Apply CF validation to specific paths
    }
  ]
}

// Scenario B: Programmatic Detection (Manual check in code)
if (await isWAFChallenge(response)) {
  console.log('WAF Challenge detected, intervention required');
}
```

### MatchPatterns Syntax

`@isdk/proxy` provides powerful matching capabilities with negation support:

| Type | Example | Description |
| :--- | :--- | :--- |
| **Negation** | `['*', '!/api/private/**']` | Exclude matching (starts with `!`). |
| **Glob** | `/**/*.json` | Path-style glob matching. |
| **Regex String** | `"/^api\\/v\\d/"` | Automatically converted to RegExp object. |
| **Boolean (Field)** | `true` / `false` | Required / forbidden. |

> [!TIP]
> **Exclusion Priority**: In a MatchPatterns array, if any `!` pattern matches, the overall result is `false`.

### Advanced Matching & Boundary Cases

`@isdk/proxy` distinguishes between two complementary matching modes: **MatchPatterns Mode** and **Record Mode**. Understanding their differences is crucial for robust configuration.

#### 1. MatchPatterns Mode

* **Types**: `string | RegExp | Array`
* **Semantic**: **Existence Filter**. "At least one field in the request must match this pattern."
* **Logic**: Based on `some` logic.

| Config Example | Semantic | Result for Empty Request |
| :--- | :--- | :--- |
| `['*']` | Pass if any field exists. | ❌ Blocked (No keys to match) |
| `['id', 'name']` | Must contain 'id' or 'name'. | ❌ Blocked |
| `['*', '!sid']` | Must contain fields other than 'sid'.| ❌ Blocked |
| `[]` (Empty Array) | Block all (No key can match an empty array).| ❌ Blocked |

> [!TIP]
> **MatchPatterns is best for Whitelists or coarse Blacklists.** e.g., `query: ['id']` means "the request must have an id parameter and will be cached based ONLY on that id."

#### 2. Record Mode

* **Types**: `Record<string, ProxyMatchPatterns | boolean>`
* **Semantic**: **Field Validation**. Logic declarations for specific keys.
* **Logic**: Based on `AND` logic.

| Config Example | Semantic | Result for Empty Request |
| :--- | :--- | :--- |
| `{}` (Empty Object) | No validation rules. | ✅ Pass |
| `{ sid: true }` | Explicitly requires 'sid' to exist. | ❌ Blocked |
| `{ sid: false }` | Explicitly requires 'sid' to **NOT** exist. | ✅ Pass |
| `{ lang: 'en' }` | Requires 'lang' to exist and match 'en'. | ❌ Blocked |

#### 3. Boundary Cases Summary

| Configuration | Matching Result | Recommended Usage |
| :--- | :--- | :--- |
| **`undefined`** | **Pass (Ignored)** | Default: no gatekeeping check for this category. |
| **`{}` (Empty Object)**| **Pass (Valid)** | No rules defined means everything is allowed. |
| **`[]` (Empty Array)** | **Fail (Invalid)** | No key can pass an empty matching set. |
| **Empty Request** | **Depends on Category**| `query` passes by default; `headers/cookies` fail by default. |

---

## Architecture: Two-Pass Logic

1. **First Pass: Gatekeeping**
    Uses `path`, `methods`, etc., to determine if the request is eligible for caching.
2. **Second Pass: Fingerprinting**
    Uses the same field configurations to implicitly perform data extraction. For example, if `query` is `['*', '!token']`, the extraction phase automatically strips `token` before hashing.

## Adapters

- **Node.js Server**: [@isdk/proxy-server](https://www.npmjs.com/package/@isdk/proxy-server).
- **Crawlee Adapter**: [@isdk/proxy-crawlee](https://www.npmjs.com/package/@isdk/proxy-crawlee).
- **MSW Adapter**: [@isdk/proxy-msw](https://www.npmjs.com/package/@isdk/proxy-msw).

## API Reference

### `createCachedFetch(options)` (Recommended)

A high-level factory function for end users. It automatically maintains the concurrency tracker in an internal closure and returns a production-ready Fetch instance with built-in cache stampede protection.

- **`options.cache`**: A `SmartCache` instance.
- **`options.config`**: Global configuration object (`ProxyConfig`).
- **`options.backgroundUpdate`**: Whether to enable SWR (Stale-While-Revalidate). Defaults to `true`.
- **`options.onBackgroundUpdate`**: Callback that receives the background update Promise when triggered.
- **`options.refresh`**: **Force Refresh**. Bypasses cache reading to force an origin request. If a valid response is received, it automatically "heals" and updates the cache. Often used to "pierce" through WAF challenges.
- **`options.activeCacheWrites`**: Optional. Shared concurrency tracker Map.
- **Returns**: A wrapped fetch function `(request, fetcher) => Promise<Response>`.

### `createFetchWithCache(activeCacheWrites?)`

A single-responsibility utility for isolating the `activeCacheWrites` concurrency tracker. Use this if you are building middleware and want to avoid manual tracker management.

- **`activeCacheWrites`**: Optional. An external `Map<string, Promise<void>>`.
- **Returns**: A `fetchWithCache` variant bound to the tracker.

### `fetchWithCache(request, fetcher, options)`

The low-level core coordination function.

- **`request`**: Web Standard `Request` object.
- **`fetcher`**: Origin request callback `(req: Request) => Promise<Response>`.
- **`options.activeCacheWrites`**: **Required**. Shared lock state Map.
- **`options.cache`**: `SmartCache` instance.
- **`options.config`**: `ProxySiteConfig` configuration.
- **`options.backgroundUpdate`**: Whether to enable SWR.

---

### `SmartCache`

The core engine managing multi-tier hybrid storage.

- `new SmartCache(options)`
- **`options.maxMemorySize`**: Threshold (in bytes) for storing response bodies in memory (L1). Bodies larger than this stream directly to disk (default `1048576`, i.e., 1MB).
- **`options.storagePath`**: Physical path for the disk L2 cache (cacache).

---

### Utility Functions

#### `isMatch(pattern, value, usePrefix?, defaultIfNoPositives?, ignoreCase?)`

Universal matching function supporting Regex, Glob, Negation patterns, and simple strings.

- **`pattern`**: `string | RegExp | (string | RegExp)[]`
- **`value`**: The string to test.
- **`usePrefix`**: Whether to use prefix matching for simple strings (default: `false`).
- **`defaultIfNoPositives`**: Return value when no positive patterns match (default: `true`).
- **`ignoreCase`**: Whether to perform case-insensitive matching (default: `true`).

```typescript
import { isMatch } from '@isdk/proxy';

isMatch('/api/v[12]/.*', '/api/v1/users');           // Regex
isMatch('/api/**/*.json', '/api/v1/data.json');       // Glob
isMatch(['*', '!/private/**'], '/api/data');         // Negation: Allow all except private
isMatch(['!id'], 'id', false, false);                // Returns false (no positive match)
```

#### `isGlob(pattern)`

Checks if a string is a Glob pattern.

- **`pattern`**: `string`
- **Returns**: `boolean`

```typescript
import { isGlob } from '@isdk/proxy';

isGlob('/api/*.json'); // true
isGlob('/api/v1');     // false
```

#### `getSiteConfig(urlString, proxyConfig)`

Retrieves site-specific cache configuration based on the URL. It first tries to match hostnames or path prefixes in `sites`, otherwise falls back to `proxyConfig`.

- **`urlString`**: The complete request URL.
- **`proxyConfig`**: The `ProxyConfig` object containing `sites` and global rules.
- **Returns**: A `ProxySiteConfig` object.

```typescript
import { getSiteConfig } from '@isdk/proxy';

const config = getSiteConfig('https://api.example.com/data', {
  methods: ['GET'],
  sites: {
    'api.example.com': { forceCache: true }, // Hostname match
    '/internal/': { offline: true }          // Path prefix match
  }
});
```


#### `isAllowed(key, config, defaultAllowed?)`

Determines if a specific key (e.g., header name) is allowed in fingerprinting.

- **`key`**: The key name.
- **`config`**: `ProxyMatchPatterns` configuration.
- **`defaultAllowed`**: Default policy if no patterns match.

```typescript
import { isAllowed } from '@isdk/proxy';

isAllowed('id', ['id', 'name']);           // true (Whitelist)
isAllowed('auth', ['*', '!auth']);         // false (Blacklist)
isAllowed('other', ['!id'], false, false); // false (Default denied)
```

#### `extractData(source, config, defaultAllowed?)`

Extracts and normalizes data from source objects. Used for fingerprinting.

- **`source`**: The original data object.
- **`config`**: `ProxyFieldConfig` or `ProxyMatchPatterns`.
- **`defaultAllowed`**: Default extraction policy.

```typescript
import { extractData } from '@isdk/proxy';

const headers = { 'Content-Type': 'application/json', 'X-Token': 'abc' };

// Array mode: filter Keys
extractData(headers, ['content-type']); // { 'content-type': ['application/json'] }

// Object mode: precise Value matching
extractData(headers, {
  'content-type': '/^application\/.*/'
}); // { 'content-type': ['application/json'] }
```

---

### `prefetch(options)`

Prefetch function to populate the cache with a specified list of URLs.

- **`options.urls`**: `PrefetchRequest[]`.
- **`options.config`**: Full `ProxyConfig`.
- **`options.cache`**: `SmartCache` instance.
- **`options.concurrency`**: Concurrency limit (default `3`).
- **`options.onProgress`**: Progress callback `(completed, total, url) => void`.

- **Returns**: `Promise<PrefetchResult>`
  - `succeeded`: Number of successfully prefetched requests.
  - `failed`: Number of failures.
  - `errors`: List of failure details `{ url, error }[]`.

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

### Offline Cache Miss Response

When `offline: true` is enabled and the request misses the cache, a Response with status `512` is returned instead of throwing an error.

- **`status`**: `512` (Custom status code `OfflineCacheMissErrorCode`)
- **`statusText`**: `Offline mode: No cached response`

```typescript
const response = await myFetch(request);
if (response.status === OfflineCacheMissErrorCode) {
  // Handle cache miss
}
```

### Cache Status Headers

All `Response` objects returned by `@isdk/proxy` include an `x-proxy-cache` header for observability. This header provides granular status information:

- **Core Hits**:
  - `HIT`: Cache hit. Data served from L1 (memory) or L2 (disk).
  - `OFFLINE_HIT`: Served from cache in offline mode.
- **Fetching & Updates**:
  - `MISS`: Cache miss. Fetched from origin and successfully cached.
  - `STALE`: Stale hit. Served from cache while a background SWR update is triggered.
- **Failovers**:
  - `STALE_IF_ERROR`: Backend failed; serving stale cache as a fallback.
  - `STALE_RESCUE_{REASON}`: Disaster recovery protection. Served valid old cache when origin returned invalid data.
- **Exclusion Reasons**:
  - `MISS_EXCLUDED_REQUEST`: Request excluded by configuration rules.
  - `OFFLINE_MISS_EXCLUDED_REQUEST`: Offline mode, request excluded and no cache found.
  - `MISS_UNSTORABLE`: Response not cacheable (e.g., `Cache-Control: no-store`).
  - `MISS_EXCLUDED_{REASON}`: Response validation failed; data fetched but not cached.

**Common `{REASON}` Suffixes:**

| Suffix | Meaning |
| :--- | :--- |
| `WAF_CHALLENGE` | Explicitly detected WAF challenge page (via built-in or custom rules). |
| `TOO_SHORT` | Content length is less than the configured `minLength`. |
| `BODY_MATCH_FAILED` | Content failed body keyword matching (negation hit or positive miss). |
| `STATUS_MISMATCH_{CODE}` | Status code not in the allowed cache list (e.g., `STATUS_MISMATCH_503`). |
| `HEADERS_MISMATCH` | Response headers do not meet configuration requirements. |
| `BODY_READ_ERROR` | Error occurred while reading response body for analysis. |
| `UNKNOWN` | Other unspecified validation failure. |

### Response Object Properties

To ensure consistency for downstream consumers, responses returned by `fetchWithCache` feature:

1. **URL Preservation**: The `response.url` property correctly reflects the original request URL, even when served from cache.
2. **Clone Compatibility**: Custom properties and headers are preserved when calling `response.clone()`.

### Debugging

This library uses the [debug](https://github.com/debug-js/debug) package. Enable internal tracing by setting the `DEBUG` environment variable:

```bash
# Trace all cache logic for fetch operations
DEBUG=@isdk/proxy:fetchWithCache node app.js

# Trace everything
DEBUG=@isdk/proxy:* node app.js
```

Logs cover configuration merging, fingerprinting, policy evaluation, SWR tasks, and response validation.

## License

MIT
