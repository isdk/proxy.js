/**
 * Atomic matching pattern: supports strings (including Glob/Negation patterns like '!id') or RegExp objects.
 * 原子匹配模式：支持字符串（含 Glob/否定模式如 '!id'）或正则表达式。
 */
export type ProxyMatchPattern = string | RegExp;

/**
 * Collection of matching patterns: supports a single pattern or an array of patterns.
 * 匹配模式集合：支持单模式或模式数组。
 */
export type ProxyMatchPatterns = ProxyMatchPattern | ProxyMatchPattern[];

/**
 * Field-level configuration: Uses a Record structure to give each Key explicit gatekeeping and fingerprinting semantics.
 * 字段级配置：采用 Record 结构，赋予每个 Key 明确的门控与指纹提取语义。
 * 
 * - key: Field name (e.g., "id", "Authorization").
 * - value: 
 *   - true: Field MUST exist (gatekeeping) and be included in the fingerprint (extraction). 必须存在并包含在指纹中。
 *   - false: Field MUST NOT exist (gatekeeping) and be excluded from the fingerprint. 必须不存在且不包含在指纹中。
 *   - MatchPatterns: Field value MUST match the pattern (gatekeeping) and be included in the fingerprint. 值必须匹配且包含在指纹中。
 */
export type ProxyFieldConfig = Record<string, ProxyMatchPatterns | boolean>;

/**
 * Special configuration for Request/Response Body.
 * 请求体/响应体专项配置。
 */
export interface ProxyBodyConfig {
  /** 
   * Body type. If not specified, automatically determined by Content-Type.
   * Body 类型。不指定时根据 Content-Type 自动判断。
   */
  type?: 'json' | 'text' | 'binary';
  /** 
   * Field-level matching and extraction for JSON bodies.
   * 针对 JSON Body 的字段级匹配与提取。
   */
  match?: ProxyFieldConfig | ProxyMatchPatterns;
  /** 
   * Regex for extracting data from non-JSON (text) bodies.
   * 用于非 JSON (文本) Body 的提取正则表达式。
   */
  extract?: string | RegExp;
  /** 
   * Whether to sort extracted JSON keys or regex capture groups to ensure fingerprint consistency.
   * 是否对提取出的内容或 JSON 键进行排序，以确保指纹一致性。
   */
  sort?: boolean;
  /** 
   * Maximum length limit when matching/extracting Body, default is 1024 (1KB).
   * 用于正则匹配/提取 Body 时的最大长度限制，默认 1024 (1KB)。
   */
  maxLength?: number;
}

/**
 * Core Cache Rule Definition (V8).
 * 核心缓存规则定义。
 * 
 * Defines how requests are "Matched (Gatekeeping)" and "Extracted (Fingerprinting)".
 * 定义请求如何被“匹配 (Gatekeeping)”以及如何被“提取 (Fingerprinting)”。
 */
export interface ProxyCacheRule {
  /** 
   * Path gatekeeping.
   * 路径门控。
   * - string: Supports Glob patterns (including `!` negation).
   * - RegExp: Checks if `url.pathname` matches.
   */
  path?: ProxyMatchPatterns;
  /** 
   * Allowed HTTP methods (e.g., "GET", ["GET", "POST"]).
   * 允许的方法。
   */
  methods?: ProxyMatchPatterns;
  /** 
   * Query parameter matching and fingerprinting configuration.
   * Query 参数匹配与指纹提取配置。
   */
  query?: ProxyFieldConfig | ProxyMatchPatterns;
  /** 
   * Headers matching and fingerprinting configuration.
   * 请求头匹配与指纹提取配置。
   */
  headers?: ProxyFieldConfig | ProxyMatchPatterns;
  /** 
   * Cookie matching and fingerprinting configuration.
   * Cookie 匹配与指纹提取配置。
   */
  cookies?: ProxyFieldConfig | ProxyMatchPatterns;
  /** 
   * Body matching and extraction configuration.
   * 请求体匹配与提取配置。
   */
  body?: ProxyFieldConfig | ProxyBodyConfig | ProxyMatchPatterns;
  
  /** 
   * Fault tolerance: If backend fails (network error or 5xx), return stale cache if available.
   * 容错机制：当后端请求失败且存在旧缓存时，强制返回旧缓存。
   */
  staleIfError?: boolean;
  /** 
   * Force cache: Ignore `Cache-Control: no-store` etc. and force store in cache.
   * 强制缓存：忽略 Cache-Control 指令强制入库。
   */
  forceCache?: boolean;
  /** 
   * Strict offline mode: No network requests, read only from cache. Fails if cache miss.
   * 严格离线模式：只读缓存，不发起网络请求。
   */
  offline?: boolean;
}

/**
 * Site-level Cache Configuration.
 * 站点级缓存配置。
 */
export interface ProxySiteConfig extends ProxyCacheRule {
  /** 
   * List of granular path-based rules.
   * If provided, request must match at least one rule to be cacheable.
   * Matched rule will be deeply merged with site-level config.
   * 细化路径匹配规则列表。匹配到的规则将与站点级配置进行深度合并。
   */
  rules?: ProxyCacheRule[];
}

/**
 * Global Interceptor Configuration.
 * 代理拦截器全局配置。
 */
export interface ProxyConfig extends ProxyCacheRule {
  /** 
   * Granular cache configuration for specific domains.
   * Key can be a hostname (example.com) or a matching pattern.
   * 针对特定域名的精细化缓存配置。
   */
  sites?: Record<string, ProxySiteConfig>;
  /** Physical storage path for disk cache (cacache). 磁盘缓存物理存储路径。 */
  storagePath?: string;
}

/**
 * Cache Metadata.
 * 缓存元数据。
 */
export interface ProxyCacheMetadata {
  /** HTTP Status Code. HTTP 状态码。 */
  status: number;
  /** Response headers object. 响应头对象。 */
  headers: Record<string, string>;
  /** http-cache-semantics policy object. 策略对象，包含 TTL。 */
  policy: any;
  /** Original request URL. 原始请求 URL。 */
  url: string;
  /** Original request method. 原始请求方法。 */
  method: string;
  /** Timestamp when cache was written. 写入时间戳。 */
  timestamp: number;
  /** Byte length of the body. Body 的字节长度。 */
  size: number;
}

/**
 * Complete Cache Entry.
 * 完整的缓存条目。
 */
export interface ProxyCacheEntry extends ProxyCacheMetadata {
  /** Response body data: Buffer for small files, Readable Stream for large ones. 响应体数据。 */
  body: Buffer | any;
}
