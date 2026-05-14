import { LRUCache } from 'secondary-cache';
import cacache from 'cacache';
import os from 'os';
import path from 'path';
import type { ProxyCacheEntry, ProxyCacheMetadata } from '../types';

/**
 * SmartCache 选项
 * @example
 * ```ts
 * const cache = new SmartCache({
 *   storagePath: '/tmp/my-cache',
 *   maxMemorySize: 2 * 1024 * 1024,  // 2MB
 *   maxTotalMemorySize: 200 * 1024 * 1024,  // 200MB
 *   memoryOptions: {
 *     capacity: 1000,
 *     expires: 10 * 60 * 1000  // 10分钟
 *   }
 * });
 * ```
 */
export interface SmartCacheOptions {
  /**
   * 磁盘缓存的物理路径。
   * @description 如果不提供，将默认使用系统临时目录 (`os.tmpdir()`) 下的 `isdk-proxy-cache` 目录。
   * @default os.tmpdir() + '/isdk-proxy-cache'
   */
  storagePath?: string;
  /**
   * 内存缓存阈值（字节）。
   * @description 响应体大小超过此值时，Body 将只存入磁盘，而 Meta 元数据仍保留在内存中。
   * 此优化可减少大文件对内存的占用。
   * @default 1024 * 1024 (1MB)
   */
  maxMemorySize?: number;
  /**
   * 内存缓存总大小阈值（字节）。
   * @description 超过此值时，LRU 缓存会自动清除最久未使用的条目以释放内存。
   * @default 100 * 1024 * 1024 (100MB)
   */
  maxTotalMemorySize?: number;
  /**
   * 透传给 L1 内存缓存的高级配置。
   * @description 基于 secondary-cache 的 LRUCache 选项，可自定义容量、过期时间等参数。
   * @see https://www.npmjs.com/package/secondary-cache
   */
  memoryOptions?: {
    /** LRU 缓存的最大条目数，为 0 时仅按 maxWeight 限制 */
    capacity?: number;
    /** 缓存条目过期时间（毫秒），默认 5 分钟 */
    expires?: number;
    /** 清理检查间隔（毫秒） */
    cleanInterval?: number;
    /** 允许添加其他 LRUCache 支持的选项 */
    [key: string]: any;
  };
}

/**
 * 智能混合缓存类 (Hybrid Multi-tier Cache)
 *
 * @description
 * 实现 L1 内存缓存 + L2 磁盘缓存的两级缓存架构：
 * - **L1 (Memory)**: 基于 LRUCache 的内存缓存，存储最近使用的热点数据
 * - **L2 (Disk)**: 基于 cacache 的持久化磁盘缓存，支持大文件存储
 *
 * ### 缓存策略
 * 1. **读取时**: 先查内存，未命中则查磁盘；磁盘命中且小于 `maxMemorySize` 时回填内存
 * 2. **写入时**: 同时写入磁盘和内存（大文件 body 不进内存）
 * 3. **大文件优化**: 超过 `maxMemorySize` 的响应只存磁盘，元数据存内存
 *
 * ### 适用场景
 * - HTTP 响应缓存，减少重复请求
 * - 大文件流式缓存，内存友好
 * - 需要持久化 + LRU 淘汰的缓存场景
 *
 * @example
 * ```ts
 * import { SmartCache } from '@isdk/proxy';
 *
 * const cache = new SmartCache({ maxMemorySize: 2 * 1024 * 1024 });
 *
 * // 写入缓存
 * await cache.set('key1', Buffer.from('hello'), {
 *   url: 'https://api.example.com/data',
 *   createdAt: Date.now()
 * });
 *
 * // 读取缓存
 * const entry = await cache.get('key1');
 * if (entry) {
 *   console.log(entry.body.toString());
 * }
 *
 * // 流式写入（适用于大文件）
 * const writeStream = cache.setStream('large-file', { url: '...' });
 * fs.createReadStream('big-file.zip').pipe(writeStream);
 *
 * // 流式读取
 * const readStream = cache.getStream('large-file');
 * readStream.pipe(fs.createWriteStream('output.zip'));
 *
 * // 清理
 * await cache.clear();
 * ```
 */
export class SmartCache {
  /** L1 内存缓存实例 */
  private memory!: LRUCache;
  /** L2 磁盘缓存路径 */
  private storagePath!: string;
  /** 单条目内存阈值（字节） */
  private maxMemorySize!: number;
  /** 初始化状态标志 */
  private initialized!: boolean;

  /**
   * 构造函数
   * @param options 缓存配置选项
   * @example
   * ```ts
   * const cache = new SmartCache();  // 使用默认配置
   * const cache = new SmartCache({ storagePath: '/tmp/cache' });
   * ```
   */
  constructor(options: SmartCacheOptions = {}) {
    this.init(options)
  }

  /**
   * 初始化或重新初始化缓存
   * @param options 缓存配置选项，如果为 undefined 且已初始化则跳过
   * @description
   * - 首次调用时使用传入的 options 初始化
   * - 已初始化时调用会先调用 `free()` 释放旧资源
   * - 传入 undefined 且已初始化时跳过（用于外部传入 this 的场景）
   */
  init(options?: SmartCacheOptions) {
    if (!options) {
      if (this.initialized) return;
      options = this as any;
    } else if (this.initialized) {
      this.free();
    }
    if (this !== options as any) {
      this.storagePath = options!.storagePath || path.join(os.tmpdir(), 'isdk-proxy-cache');
      this.maxMemorySize = options!.maxMemorySize ?? 1024 * 1024;
    }

    const maxTotalMemorySize = options!.maxTotalMemorySize || 100 * 1024 * 1024; // 100MB
    const memoryOptions = {
      capacity: 0,
      expires: 5 * 60 * 1000,
      maxWeight: maxTotalMemorySize,
      weightOf: (val: any) => {
        let s = 0;
        if (val.body && Buffer.isBuffer(val.body)) {
          s += val.body.length;
        }
        s += 512;
        return s;
      },
      ...options!.memoryOptions,
    };
    this.memory = new LRUCache(memoryOptions);
    this.initialized = true;
  }

  /**
   * 释放缓存资源
   * @description
   * 清空 L1 内存缓存并清除 cacache 的内部 memoization 状态。
   * 调用后 `initialized` 标志会被设为 false，但不会删除磁盘上的缓存文件。
   * 重新调用 `init()` 可重新初始化。
   */
  free() {
    this.memory?.clear();
    cacache.clearMemoized();
    this.initialized = false;
  }

  /**
   * 获取缓存条目
   * @param key - 缓存键
   * @returns 缓存条目，包含 body 和 metadata；若不存在或读取失败返回 null
   *
   * @description
   * **查找顺序**：
   * 1. 先查 L1 内存缓存
   * 2. 内存命中则直接返回（body 在内存则返回 Buffer，否则返回磁盘流）
   * 3. 内存未命中则查 L2 磁盘
   * 4. 磁盘命中时：
   *    - 小文件（≤ maxMemorySize）：读取到内存并回填 L1
   *    - 大文件：只将 metadata 回填 L1，body 返回磁盘流
   *
   * @example
   * ```ts
   * const entry = await cache.get('user-123');
   * if (entry) {
   *   // entry.body 可能是 Buffer（内存命中）或 ReadableStream（磁盘读取）
   *   const data = Buffer.isBuffer(entry.body) ? entry.body : await streamToBuffer(entry.body);
   *   console.log(entry.metadata);
   * }
   * ```
   *
   * @throws 磁盘 IO 错误时静默返回 null，不抛出异常
   */
  async get(key: string): Promise<ProxyCacheEntry | null> {
    const memEntry = this.memory.get(key) as (Partial<ProxyCacheEntry> & ProxyCacheMetadata) | undefined;

    if (memEntry) {
      if (memEntry.body) {
        return memEntry as ProxyCacheEntry;
      }

      if (memEntry.size === 0) {
        return { ...memEntry, body: Buffer.alloc(0) } as ProxyCacheEntry;
      }

      const stream = cacache.get.stream(this.storagePath, key);
      return { ...memEntry, body: stream } as ProxyCacheEntry;
    }

    try {
      const info = await cacache.get.info(this.storagePath, key);
      if (!info) return null;

      if (info.size! <= this.maxMemorySize) {
        const { data, metadata } = await cacache.get(this.storagePath, key);
        const castedMeta = metadata as unknown as ProxyCacheMetadata;
        const entry: ProxyCacheEntry = { ...castedMeta, body: data };
        this.saveToMemory(key, data, castedMeta);
        return entry;
      } else {
        const info = await cacache.get.info(this.storagePath, key);
        const castedMeta = info!.metadata as unknown as ProxyCacheMetadata;
        this.saveToMemory(key, null as any, castedMeta);
        return { ...castedMeta, body: cacache.get.stream(this.storagePath, key) } as ProxyCacheEntry;
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * 写入缓存条目
   * @param key - 缓存键
   * @param body - 缓存体（Buffer）
   * @param metadata - 元数据（不含 size，会自动填充 body.length）
   * @returns Promise<void>
   *
   * @description
   * **写入策略**：
   * 1. 先计算 body 长度，自动添加到 metadata 中
   * 2. 同步写入 L2 磁盘缓存（cacache）
   * 3. 根据 body 大小决定是否写入 L1 内存：
   *    - ≤ maxMemorySize：body 和 metadata 都存入 L1
   *    - > maxMemorySize：只存入 metadata，body 保持在磁盘
   *
   * @example
   * ```ts
   * const response = await fetch('https://api.example.com/data');
   * const body = Buffer.from(await response.arrayBuffer());
   * await cache.set('api-data', body, {
   *   url: response.url,
   *   status: response.status,
   *   headers: Object.fromEntries(response.headers.entries()),
   *   createdAt: Date.now()
   * });
   * ```
   */
  async set(key: string, body: Buffer, metadata: Omit<ProxyCacheMetadata, 'size'>): Promise<void> {
    const fullMeta: ProxyCacheMetadata = {
      ...metadata,
      size: body.length
    };

    await cacache.put(this.storagePath, key, body, { metadata: fullMeta });
    this.saveToMemory(key, body, fullMeta);
  }

  /**
   * 内部方法：处理 L1 内存回填
   * @param key - 缓存键
   * @param body - 缓存体
   * @param metadata - 完整元数据（含 size）
   *
   * @description
   * 根据 body 大小决定存储策略：
   * - body 存在且非空且 ≤ maxMemorySize：完整存入 L1
   * - 否则：仅存储 metadata（不含 body），节省内存
   */
  private saveToMemory(key: string, body: Buffer, metadata: ProxyCacheMetadata): void {
    if (body && body.length > 0 && body.length <= this.maxMemorySize) {
      this.memory.set(key, { ...metadata, body });
    } else {
      const { ...metaOnly } = metadata;
      this.memory.set(key, metaOnly);
    }
  }

  /**
   * 获取磁盘读取流
   * @param key - 缓存键
   * @returns ReadableStream，从磁盘读取缓存内容
   *
   * @description
   * 返回 cacache 的流式读取接口，用于大文件场景的流式消费。
   * 不经过 L1 内存缓存，直接从 L2 磁盘读取。
   *
   * @example
   * ```ts
   * const readStream = cache.getStream('large-file');
   * readStream.on('data', (chunk) => { /* 处理数据 *\/ });
   * readStream.on('end', () => console.log('完成'));
   * ```
   *
   * @see {@link setStream} 配对使用
   */
  getStream(key: string): NodeJS.ReadableStream {
    return cacache.get.stream(this.storagePath, key) as unknown as NodeJS.ReadableStream;
  }

  /**
   * 获取磁盘写入流
   * @param key - 缓存键
   * @param metadata - 元数据（不含 size）
   * @returns WritableStream，接收数据并写入磁盘缓存
   *
   * @description
   * 返回 cacache 的流式写入接口，适用于大文件场景。
   * - 写入前会先清除 L1 内存缓存中该 key 的条目（如果存在）
   * - 写入完成后（finish 事件）会再次清除 L1 条目，确保内存和磁盘一致
   *
   * **注意**：流式写入无法自动计算 size，metadata 中不会包含 size 字段。
   * 如需 size，需在写入完成后手动调用其他方法补充。
   *
   * @example
   * ```ts
   * const writeStream = cache.setStream('large-file', { url: '...' });
   * const readStream = fs.createReadStream('big-file.zip');
   * readStream.pipe(writeStream);
   *
   * writeStream.on('finish', () => {
   *   console.log('写入完成');
   * });
   * ```
   *
   * @see {@link getStream} 配对使用
   */
  setStream(key: string, metadata: Omit<ProxyCacheMetadata, 'size'>): NodeJS.WritableStream {
    this.memory.del(key);
    const stream = cacache.put.stream(this.storagePath, key, { metadata });

    stream.on('finish', () => {
      this.memory.del(key);
    });

    return stream as unknown as NodeJS.WritableStream;
  }

  /**
   * 删除缓存条目
   * @param key - 缓存键
   * @param clearPersistent - 是否同时删除磁盘缓存，默认 true
   * @returns Promise<void>
   *
   * @description
   * - 始终清除 L1 内存缓存中的条目
   * - `clearPersistent` 为 true 时，同时删除 L2 磁盘缓存条目
   *
   * @example
   * ```ts
   * // 仅从内存删除，保留磁盘缓存
   * await cache.delete('key1', false);
   *
   * // 完全删除（内存 + 磁盘）
   * await cache.delete('key1');
   * ```
   */
  async delete(key: string, clearPersistent = true): Promise<void> {
    this.memory.del(key);
    if (clearPersistent) { await cacache.rm.entry(this.storagePath, key) }
  }

  /**
   * 清空所有缓存
   * @param clearPersistent - 是否同时清空磁盘缓存，默认 true
   * @returns Promise<void>
   *
   * @description
   * - 始终清空 L1 内存缓存（所有条目）
   * - `clearPersistent` 为 true 时，同时清空 L2 磁盘缓存目录下的所有条目
   *
   * @example
   * ```ts
   * // 清空所有缓存
   * await cache.clear();
   *
   * // 仅清空内存，保留磁盘缓存
   * await cache.clear(false);
   * ```
   *
   * @see {@link free} 释放资源但不清理磁盘缓存
   */
  async clear(clearPersistent = true): Promise<void> {
    this.memory.clear();
    if (clearPersistent) { await cacache.rm.all(this.storagePath) }
  }
}
