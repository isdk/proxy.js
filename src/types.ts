/**
 * 缓存键过滤配置
 *
 * 用于定义在生成缓存指纹时，哪些字段应该被包含或排除。
 */
export interface KeyFilterConfig {
  /** 仅包含（白名单）：如果设置，只有这些字段会参与 Key 的计算 */
  include?: string[];
  /** 排除（黑名单）：用于排除像 `timestamp`、`nonce` 等干扰缓存命中的动态字段 */
  exclude?: string[];
}

/**
 * 站点级缓存配置
 */
export interface SiteCacheConfig {
  /** Query 参数过滤配置 */
  query?: KeyFilterConfig;
  /** 请求头过滤配置 */
  headers?: KeyFilterConfig;
  /** Cookie 过滤配置 */
  cookies?: KeyFilterConfig;
  /** 当后端请求失败且存在旧缓存时，是否强制返回旧缓存（容错机制） */
  staleIfError?: boolean;
  /** 是否强制缓存一切响应（无视 no-store 等不缓存指令），用于极端的离线可用容错场景 */
  forceCache?: boolean;
}

/**
 * 缓存元数据
 *
 * 存储在 L1 内存和 L2 磁盘中的非 Body 信息。
 * 即使 Body 过大未进入内存，此元数据也会驻留在内存中以供快速策略判定。
 */
export interface CacheMetadata {
  /** HTTP 状态码 */
  status: number;
  /** 响应头对象 */
  headers: Record<string, string>;
  /** http-cache-semantics 策略对象，包含 TTL 和缓存指令 */
  policy: any;
  /** 原始请求 URL */
  url: string;
  /** 原始请求方法 */
  method: string;
  /** 缓存写入时的时间戳 */
  timestamp: number;
  /** Body 的字节长度，用于精确区分“空响应”与“未入内存的大响应” */
  size: number;
}

/**
 * 完整的缓存条目
 */
export interface CacheEntry extends CacheMetadata {
  /** 响应体数据：小文件为 Buffer，大文件为可读流 */
  body: Buffer | any;
}

/**
 * 代理拦截器全局配置
 */
export interface ProxyConfig {
  /** 默认缓存配置，当请求的域名未在 sites 中匹配时使用 */
  default: SiteCacheConfig;
  /** 针对特定域名的精细化缓存配置 */
  sites: Record<string, SiteCacheConfig>;
  /** 磁盘缓存（cacache）的物理存储路径，可选，默认为系统临时目录 */
  storagePath?: string;
}
