import { KeyvCacheableMemory, type KeyvCacheableMemoryOptions } from '@cacheable/memory';
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
  /** 透传给 L1 (Memory) 的高级配置 */
  memoryOptions?: Partial<KeyvCacheableMemoryOptions>;
}

/**
 * 智能混合缓存类 (Hybrid Cache)
 * 
 * 内部管理 L1 (LRU 内存) 和 L2 (Content Addressable 磁盘) 两级存储。
 * 核心特性：
 * 1. **Meta 驻留**：无论文件多大，元数据 (Headers, Status, Policy) 始终在内存中，加速缓存判定。
 * 2. **大小自适应**：小文件双写（内存+磁盘），大文件单写（仅磁盘）。
 * 3. **内容寻址**：基于 cacache，支持高性能的流式读写和数据一致性校验。
 */
export class SmartCache {
  private memory: KeyvCacheableMemory;
  private storagePath: string;
  private maxMemorySize: number;

  constructor(options: SmartCacheOptions = {}) {
    // 默认使用系统临时目录下的 isdk-proxy-cache 文件夹
    this.storagePath = options.storagePath || path.join(os.tmpdir(), 'isdk-proxy-cache');
    this.maxMemorySize = options.maxMemorySize ?? 1024 * 1024;
    this.memory = new KeyvCacheableMemory({
      lruSize: 500,
      ttl: 5 * 60 * 1000,
      ...options.memoryOptions,
    });
  }

  /**
   * 获取缓存条目
   * 优先从内存读取 Meta，根据 size 决定是否从磁盘读取 Body
   */
  async get(key: string): Promise<CacheEntry | null> {
    // 1. 尝试从内存获取 (可能只包含 Meta)
    const memEntry = await this.memory.get(key) as (Partial<CacheEntry> & CacheMetadata) | undefined;
    
    if (memEntry) {
      // 场景 A: 内存中已经有完整的 Body (小文件)
      if (memEntry.body) {
        return memEntry as CacheEntry;
      }
      
      // 场景 B: 内存中没有 Body，但 size 为 0 (空响应)
      if (memEntry.size === 0) {
        return { ...memEntry, body: Buffer.alloc(0) } as CacheEntry;
      }

      // 场景 C: 内存中没有 Body，且 size > 0 (确定是大文件在磁盘)
      try {
        const { data } = await cacache.get(this.storagePath, key);
        return { ...memEntry, body: data };
      } catch (e) {
        return null; 
      }
    }

    // 2. 内存完全未命中，从磁盘获取完整数据
    try {
      const info = await cacache.get.info(this.storagePath, key);
      if (!info) return null;

      const { data, metadata } = await cacache.get(this.storagePath, key);
      const castedMeta = metadata as unknown as CacheMetadata;
      
      const entry: CacheEntry = {
        ...castedMeta,
        body: data,
      };

      await this.saveToMemory(key, data, castedMeta);

      return entry;
    } catch (error) {
      return null;
    }
  }

  /**
   * 写入缓存
   */
  async set(key: string, body: Buffer, metadata: Omit<CacheMetadata, 'size'>): Promise<void> {
    const fullMeta: CacheMetadata = {
      ...metadata,
      size: body.length
    };

    await cacache.put(this.storagePath, key, body, { metadata: fullMeta });
    await this.saveToMemory(key, body, fullMeta);
  }

  /**
   * 内部方法：处理内存回填逻辑，确保 Meta 始终驻留
   */
  private async saveToMemory(key: string, body: Buffer, metadata: CacheMetadata): Promise<void> {
    if (body.length > 0 && body.length <= this.maxMemorySize) {
      // 小文件：Meta + Body 进内存
      await this.memory.set(key, { ...metadata, body });
    } else {
      // 大文件或空文件：仅 Meta 进内存，Body 留空
      const { ...metaOnly } = metadata;
      await this.memory.set(key, metaOnly);
    }
  }

  /**
   * 获取磁盘流
   */
  getStream(key: string) {
    return cacache.get.stream(this.storagePath, key);
  }

  /**
   * 写入磁盘流
   */
  setStream(key: string, metadata: Omit<CacheMetadata, 'size'>) {
    return cacache.put.stream(this.storagePath, key, { metadata });
  }

  async delete(key: string): Promise<void> {
    await this.memory.delete(key);
    await cacache.rm.entry(this.storagePath, key);
  }

  async clear(): Promise<void> {
    await this.memory.clear();
    await cacache.rm.all(this.storagePath);
  }
}
