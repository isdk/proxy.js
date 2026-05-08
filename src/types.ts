/**
 * 缓存键过滤配置
 *
 * 用于定义在生成缓存指纹时，哪些字段应该被包含或排除。
 */
export interface KeyFilterConfig {
  /** 仅包含（白名单）：如果设置，只有这些字段会参与 Key 的计算。支持字符串、Glob 模式或正则表达式。 */
  include?: (string | RegExp)[];
  /** 排除（黑名单）：用于排除像 `timestamp`、`nonce` 等干扰缓存命中的动态字段。支持字符串、Glob 模式或正则表达式。 */
  exclude?: (string | RegExp)[];
}

export interface BodyFilterConfig extends KeyFilterConfig {
  /**
   * 用于非 JSON (文本) Body 的提取正则表达式。
   * 如果包含捕获组，则提取捕获组内容作为指纹；否则提取整个匹配部分。
   */
  extract?: string | RegExp;
  /**
   * 是否对提取出的捕获组进行排序。
   * 开启后可解决 Body 中参数顺序不一致导致的指纹失效问题。
   */
  sort?: boolean;
  /** 用于正则匹配/提取 Body 时的最大长度限制，默认 1024 (1KB) */
  maxLength?: number;
}

/**
 * 精细化缓存匹配规则
 *
 * 用于在 `methods` 过滤的基础上，进一步限定哪些具体的请求路径或参数需要被缓存。
 * 多个规则之间是 **OR (逻辑或)** 关系，即请求只需匹配其中一条规则即可。
 * 在单个规则对象内部，各字段之间是 **AND (逻辑与)** 关系。
 */
export interface CacheRule {
  /**
   * 匹配的方法 (如 "POST")。
   * 如果指定，则必须方法完全一致；如果不指定，则匹配所有 `methods` 中允许的方法。
   */
  method?: string;
  /**
   * 路径匹配。
   * - 字符串: 默认进行 Glob 模式匹配（支持 `!` 否定），若非 Glob 且非正则字符串则退化为前缀匹配。
   * - 正则表达式: 检查 `url.pathname` 是否匹配。
   */
  /**
   * 路径匹配。
   * - 字符串: 默认进行 Glob 模式匹配（支持 `!` 否定），若非 Glob 且非正则字符串则退化为前缀匹配。
   * - 正则表达式: 检查 `url.pathname` 是否匹配。
   * - 数组: 支持传入多个模式（含否定模式），只要其中一个匹配即可。
   */
  path?: string | RegExp | (string | RegExp)[];
  /**
   * Query 参数匹配规则。
   * - 键名: 支持字符串、Glob 或正则。
   * - 值:
   *   - 字符串: 支持 Glob 模式匹配。
   *   - 正则表达式: 检查参数值是否匹配。
   *   - `true`: 要求该参数必须存在于 URL 中。
   *   - `false`: 要求该参数必须 **不** 存在于 URL 中。
   */
  query?: Record<string, string | boolean | RegExp>;
  /**
   * 强制指定 Body 类型。
   * 如果不指定，则根据 `Content-Type` 自动判断。
   */
  bodyType?: 'json' | 'text' | 'binary';
  /**
   * Body 内容匹配。
   * 仅当 Body 为文本或 JSON 时有效。
   * - 字符串: 支持 Glob 模式匹配。
   * - 正则表达式: 检查 Body 内容是否匹配。
   * - 数组: 支持传入多个模式。
   */
  body?: string | RegExp | (string | RegExp)[];
}

/**
 * 站点级缓存配置
 */
export interface SiteCacheConfig {
  /**
   * 允许缓存的 HTTP 方法列表。
   * 默认值: ['GET', 'HEAD']。
   * 若要缓存 POST/PUT，必须在此显式添加，并确保后端响应满足缓存条件（或开启 `forceCache`）。
   */
  methods?: string[];
  /**
   * 精细化缓存规则列表。
   * 如果配置了此项，请求必须匹配其中至少一条规则才会被允许进入缓存流程。
   * 适用于只希望缓存特定 API 接口的场景。
   */
  cacheRules?: CacheRule[];
  /** Query 参数过滤配置：决定哪些查询参数参与缓存指纹 (Cache Key) 的计算 */
  query?: KeyFilterConfig;
  /** 请求头过滤配置：决定哪些 Header 参与缓存指纹计算 */
  headers?: KeyFilterConfig;
  /** Cookie 过滤配置：决定哪些 Cookie 字段参与缓存指纹计算 */
  cookies?: KeyFilterConfig;
  /**
   * 请求体过滤配置 (仅限 JSON 类型)。
   * 当方法为 POST/PUT/PATCH 且为 JSON 格式时，用于从 Body 中提取特定字段参与指纹计算。
   */
  body?: BodyFilterConfig;
  /** 容错机制：当后端请求失败（网络错误或 5xx）且存在旧缓存时，是否强制返回旧缓存 */
  staleIfError?: boolean;
  /** 强制缓存：是否忽略 `Cache-Control: no-store` 等指令强制入库。 */
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
