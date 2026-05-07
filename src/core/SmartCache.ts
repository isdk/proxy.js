import { LRUCache } from 'secondary-cache';
import cacache from 'cacache';
import os from 'os';
import path from 'path';
import type { CacheEntry, CacheMetadata } from '../types';

/**
 * SmartCache 选项
 */
export interface SmartCacheOptions {
  /** 磁盘缓存的物理路径。如果不提供，将默认使用系统临时目录。 */
  storagePath?: string;
  /** 内存缓存阈值（字节）。响应体大小超过此值时，Body 将只存入磁盘，而 Meta 仍保留在内存。默认 1MB。 */
  maxMemorySize?: number;
  /** 内存缓存总大小阈值（字节）。默认 100MB。超过此值将清空内存缓存。 */
  maxTotalMemorySize?: number;
  /** 透传给 L1 (Memory) 的高级配置 (secondary-cache LRUCache options) */
  memoryOptions?: {
    capacity?: number;
    expires?: number;
    cleanInterval?: number;
    [key: string]: any;
  };
}

/**
 * 智能混合缓存类 (Hybrid Multi-tier Cache)
 *
 * 该类实现了 L1 (内存) 和 L2 (磁盘) 的双层混合存储架构，旨在提供高性能且大容量的缓存能力。
 *
 * ### 核心特性：
 * - **双层架构**: L1 使用 LRU 内存缓存（基于 `secondary-cache` 的 LRUCache），L2 使用持久化磁盘缓存（基于 `cacache`）。
 * - **大小感知存储**: 自动识别响应体大小。小于阈值的文件同时存于内存和磁盘；超过阈值的文件仅存于磁盘，但其元数据仍保留在内存中。
 * - **元数据驻留 (Meta-Residency)**: 无论 Body 多大，Headers、Status、Policy 等信息始终优先从内存读取，确保缓存判定性能。
 * - **流式支持**: 支持通过 `setStream` 和 `getStream` 直接操作大数据流，防止 OOM。
 * - **一致性保障**: 在并发写入时自动清理内存，确保后续读取不会拿到被污染的旧数据。
 * - **内存限制**: 通过 `maxTotalMemorySize` 控制 L1 缓存的总内存占用。
 */
export class SmartCache {
  private memory: LRUCache;
  private storagePath: string;
  private maxMemorySize: number;

  constructor(options: SmartCacheOptions = {}) {
    this.storagePath = options.storagePath || path.join(os.tmpdir(), 'isdk-proxy-cache');
    this.maxMemorySize = options.maxMemorySize ?? 1024 * 1024;
    
    const maxTotalMemorySize = options.maxTotalMemorySize || 100 * 1024 * 1024; // 100MB
    const memoryOptions = {
      capacity: 0, // 仅通过权重(Size)限制，不限制数量
      expires: 5 * 60 * 1000,
      maxWeight: maxTotalMemorySize,
      weightOf: (val: any) => {
        let s = 0;
        if (val.body && Buffer.isBuffer(val.body)) {
          s += val.body.length;
        }
        // 粗略估计元数据大小
        s += 512; 
        return s;
      },
      ...options.memoryOptions,
    };
    this.memory = new LRUCache(memoryOptions);
  }

  /**
   * 获取缓存条目
   *
   * 逻辑：
   * 1. 首先尝试从 L1 内存获取。
   * 2. 如果内存中有 Body，直接返回（Buffer 类型）。
   * 3. 如果内存中只有 Meta（大文件），则从 L2 磁盘创建并返回 ReadStream。
   * 4. 如果内存完全未命中，从磁盘 L2 检索，并根据大小决定是否回填 L1。
   *
   * @param key - 缓存指纹键
   * @returns 完整的缓存条目（带 Buffer 或 Stream 的 Body），未命中返回 null
   */
  async get(key: string): Promise<CacheEntry | null> {
    const memEntry = this.memory.get(key) as (Partial<CacheEntry> & CacheMetadata) | undefined;

    if (memEntry) {
      if (memEntry.body) {
        return memEntry as CacheEntry;
      }

      if (memEntry.size === 0) {
        return { ...memEntry, body: Buffer.alloc(0) } as CacheEntry;
      }

      // 关键改进：大文件直接返回磁盘流，不再加载进内存
      const stream = cacache.get.stream(this.storagePath, key);
      return { ...memEntry, body: stream } as CacheEntry;
    }

    // 内存完全未命中，从磁盘获取完整数据
    try {
      const info = await cacache.get.info(this.storagePath, key);
      if (!info) return null;

      // 如果文件很小，我们才 atomic 读取
      if (info.size! <= this.maxMemorySize) {
        const { data, metadata } = await cacache.get(this.storagePath, key);
        const castedMeta = metadata as unknown as CacheMetadata;
        const entry: CacheEntry = { ...castedMeta, body: data };
        this.saveToMemory(key, data, castedMeta);
        return entry;
      } else {
        // 大文件：读取 Meta 后返回流
        const info = await cacache.get.info(this.storagePath, key);
        const castedMeta = info!.metadata as unknown as CacheMetadata;
        this.saveToMemory(key, null as any, castedMeta);
        return { ...castedMeta, body: cacache.get.stream(this.storagePath, key) };
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * 写入缓存条目 (原子写入)
   *
   * 适用于已知长度的小型数据块。该操作会同时写入磁盘并回填内存（如果大小未超标）。
   *
   * @param key - 缓存指纹键
   * @param body - 响应体数据 Buffer
   * @param metadata - 响应元数据（不含 size，由本方法自动计算）
   */
  async set(key: string, body: Buffer, metadata: Omit<CacheMetadata, 'size'>): Promise<void> {
    const fullMeta: CacheMetadata = {
      ...metadata,
      size: body.length
    };

    await cacache.put(this.storagePath, key, body, { metadata: fullMeta });
    this.saveToMemory(key, body, fullMeta);
  }

  /**
   * 内部方法：处理内存回填
   */
  private saveToMemory(key: string, body: Buffer, metadata: CacheMetadata): void {
    if (body && body.length > 0 && body.length <= this.maxMemorySize) {
      this.memory.set(key, { ...metadata, body });
    } else {
      const { ...metaOnly } = metadata;
      this.memory.set(key, metaOnly);
    }
  }

  /**
   * 获取磁盘读取流
   *
   * 允许直接从 L2 磁盘层以流的形式读取数据，适用于大文件代理。
   *
   * @param key - 缓存指纹键
   * @returns Node.js 可读流
   */
  getStream(key: string): NodeJS.ReadableStream {
    return cacache.get.stream(this.storagePath, key) as unknown as NodeJS.ReadableStream;
  }

  /**
   * 获取磁盘写入流 (流式缓存)
   *
   * 该方法用于支持真正的流式代理。它会执行以下一致性操作：
   * 1. 立即清除 L1 内存中的对应键，防止读到旧数据。
   * 2. 返回一个可写流，数据将直接流入磁盘。
   * 3. **一致性修复**: 在流写入完成（finish）时再次清理内存，防止写入期间的并发读取将旧数据再次回填进内存。
   *
   * @param key - 缓存指纹键
   * @param metadata - 响应元数据
   * @returns Node.js 可写流
   */
  setStream(key: string, metadata: Omit<CacheMetadata, 'size'>): NodeJS.WritableStream {
    // 乐观清除内存缓存，防止磁盘更新后内存仍然返回旧数据
    this.memory.del(key);
    const stream = cacache.put.stream(this.storagePath, key, { metadata });
    
    // 关键修复：流写入完成后再次清理内存，防止写入期间被其他并发读取回填了旧数据
    stream.on('finish', () => {
      this.memory.del(key);
    });
    
    return stream as unknown as NodeJS.WritableStream;
  }

  async delete(key: string): Promise<void> {
    this.memory.del(key);
    await cacache.rm.entry(this.storagePath, key);
  }

  async clear(): Promise<void> {
    this.memory.clear();
    await cacache.rm.all(this.storagePath);
  }
}

