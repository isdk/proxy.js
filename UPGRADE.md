# Upgrade Guide: Migrating from V0.1 to V0.2

This version introduces the **"Two-Pass Pipeline"** architecture, providing fully orthogonalized configuration semantics. This guide outlines the breaking changes and how to migrate your existing codebase.

## 1. Type Renaming Reference

To ensure a clean and consistent namespace, all core types now feature a `Proxy` prefix:

| Old Type Name | New Type Name | Description |
| :--- | :--- | :--- |
| `SiteCacheConfig` | `ProxySiteConfig` | Site-level configuration |
| `CacheRule` | `ProxyCacheRule` | Granular interception rules |
| `CacheConfig` | `ProxyConfig` | Global interceptor configuration |
| `CacheEntry` | `ProxyCacheEntry` | Complete cache entry |
| `CacheMetadata` | `ProxyCacheMetadata` | Cache metadata |
| `KeyFilterConfig` | `ProxyMatchPatterns` | Field filtering (now simplified to array mode) |

## 2. Configuration Migration: From `include/exclude` to `MatchPatterns`

The nested `include`/`exclude` structure has been replaced by a flat array that supports negation patterns (`!`).

### Comparison

**Old (include/exclude):**
```typescript
{
  query: {
    include: ['id', 'name'],
    exclude: ['timestamp']
  }
}
```

**New (MatchPatterns):**
```typescript
{
  // Array mode: '!' denotes exclusion, with highest priority
  query: ['id', 'name', '!timestamp']
}
```

## 3. Changes in Default Behavior

V8 follows the "Secure Fingerprint" principle with updated default extraction policies:

- **Query Parameters**: **Included by default**. If you previously relied on Query being ignored by default, you must now explicitly specify it (e.g., `query: []` or `query: ['id']`).
- **Headers / Cookies**: **Excluded by default**. This remains consistent with previous versions, but the internal logic is now stricter to prevent cache fragmentation from dynamic headers (like `User-Agent`).

## 4. Simplified Body Configuration

Body configurations now support a "shorthand" mode for field filtering without requiring a nested object.

**Old:**
```typescript
{
  body: {
    match: { 'action': 'query' }
  }
}
```

**New:**
```typescript
{
  // Shortcut mode for simple field filtering
  body: ['!nonce', '!timestamp'],
  // Or use the full object mode for advanced features (e.g., maxLength)
  body: {
    match: { 'action': 'query' },
    maxLength: 1024
  }
}
```

## 5. Error Handling

The status code for `OfflineCacheMissError` is now standardized:

- **Old**: Relied on string codes or various values.
- **New**: `error.code` is now strictly **`512`**.

## 6. Migration Checklist

- [ ] Search and replace all type names (add the `Proxy` prefix).
- [ ] Review `query` configurations: To keep everything included, you can remove old `include: ['*']`. To exclude specific items, use `['*', '!item']`.
- [ ] Review `headers` configurations: If your fingerprints depend on specific headers, ensure they are explicitly listed in the `headers` array or object.
- [ ] Convert all `include/exclude` logic into the new single array pattern.

---

# Upgrade Guide: Migrating from V0.2 to V0.3

## 1. Offline Mode Behavior Change

When `offline: true` is enabled and the cache misses, it now returns a Response with status `512` instead of throwing an error.

- **Old**: Throws `OfflineCacheMissError`
- **New**: Returns `Response` with `status: 512`

```typescript
// Old
try {
  await fetchWithCache(request, fetcher, { config: { offline: true } });
} catch (e) {
  if (e instanceof OfflineCacheMissError) {
    // Handle cache miss
  }
}

// New
const response = await fetchWithCache(request, fetcher, { config: { offline: true } });
if (response.status === OfflineCacheMissErrorCode) {
  // Handle cache miss
}
```

## 2. Migration Checklist

- [ ] Update Offline mode error handling: change from `try/catch` to checking `response.status === OfflineCacheMissErrorCode`.
