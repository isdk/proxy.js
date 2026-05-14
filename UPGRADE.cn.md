# 升级指南：从 V0.1 迁移至 V0.2

本版本引入了全新的“双遍扫描流水线”架构，实现了配置语义的正交化。由于配置结构和默认行为发生了重大变更，请参考此指南进行迁移。

## 1. 类型重命名对照表

为了保持命名空间的整洁与一致性，核心类型现在均带有 `Proxy` 前缀：

| 旧类型名 | 新类型名 | 说明 |
| :--- | :--- | :--- |
| `SiteCacheConfig` | `ProxySiteConfig` | 站点级配置 |
| `CacheRule` | `ProxyCacheRule` | 细化拦截规则 |
| `CacheConfig` | `ProxyConfig` | 全局拦截器配置 |
| `CacheEntry` | `ProxyCacheEntry` | 缓存条目 |
| `CacheMetadata` | `ProxyCacheMetadata` | 缓存元数据 |
| `KeyFilterConfig` | `ProxyMatchPatterns` | 字段过滤配置 (已简化为数组模式) |

## 2. 核心变更：从 `include/exclude` 迁移至 `MatchPatterns`

旧版使用嵌套的 `include`/`exclude` 对象，新版统一使用支持否定模式 (`!`) 的数组。

### 示例对比

**旧版 (Old):**
```typescript
{
  query: {
    include: ['id', 'name'],
    exclude: ['timestamp']
  }
}
```

**新版 (New):**
```typescript
{
  // 数组模式，'!' 表示排除，且排除优先级最高
  query: ['id', 'name', '!timestamp']
}
```

## 3. 默认行为变更

新版遵循“安全指纹”原则，对默认提取行为做了调整：

- **Query 参数**: **默认全量提取**。如果您之前依赖默认不提取 Query，现在需要显式指定（例如 `query: []` 或 `query: ['id']`）。
- **Headers / Cookies**: **默认全量不提取**。这与旧版一致，但现在内部判定逻辑更严格，确保动态 Header（如 `User-Agent`）不会导致缓存碎片化。

## 4. Body 匹配配置简化

Body 配置现在支持直接简写，不再强制使用嵌套对象。

**旧版:**
```typescript
{
  body: {
    match: { 'action': 'query' }
  }
}
```

**新版:**
```typescript
{
  // 如果只需过滤字段，可以直接传数组（快捷模式）
  body: ['!nonce', '!timestamp'],
  // 或者保留对象模式以使用高级特性（如 maxLength）
  body: {
    match: { 'action': 'query' },
    maxLength: 1024
  }
}
```

## 5. 错误处理

`OfflineCacheMissError` 的状态码已固定为自定义状态码：

- **旧版**: 可能依赖字符串 code。
- **新版**: `error.code` 现在固定为 **`512`**。

## 6. 迁移 Checklist

- [ ] 搜索并替换所有的类型名称（添加 `Proxy` 前缀）。
- [ ] 检查所有的 `query` 配置：如果希望继续保持全量匹配，可以移除旧的 `include: ['*']`；如果要排除特定项，改用 `['*', '!item']`。
- [ ] 检查 `headers` 配置：如果依赖某些 Header 生成指纹，请确保它们在 `headers` 数组或对象中被定义。
- [ ] 将所有的 `include/exclude` 逻辑转化为单一数组模式。

---

# 升级指南：从 V0.2 迁移至 V0.3

## 1. Offline 模式行为变更

`offline` 模式下缓存未命中时，不再抛出错误，而是返回状态码 `512` 的 Response。

- **旧版**: 抛出 `OfflineCacheMissError` 异常
- **新版**: 返回 `Response` with `status: 512`

```typescript
// 旧版
try {
  await fetchWithCache(request, fetcher, { config: { offline: true } });
} catch (e) {
  if (e instanceof OfflineCacheMissError) {
    // 处理缓存未命中
  }
}

// 新版
const response = await fetchWithCache(request, fetcher, { config: { offline: true } });
if (response.status === OfflineCacheMissErrorCode) {
  // 处理缓存未命中
}
```

## 2. 迁移 Checklist

- [ ] 更新 Offline 模式错误处理逻辑：从 `try/catch` 改为检查 `response.status === OfflineCacheMissErrorCode`。
