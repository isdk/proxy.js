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
 */
export class SmartCache {
  private memory: KeyvCacheableMemory;
  private storagePath: string;
  private maxMemorySize: number;

  constructor(options: SmartCacheOptions = {}) {
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
   * 如果是小文件，返回带 Buffer 的 Entry；如果是大文件，返回带 ReadStream 的 Entry。
   */
  async get(key: string): Promise<CacheEntry | null> {
    const memEntry = await this.memory.get(key) as (Partial<CacheEntry> & CacheMetadata) | undefined;

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
        await this.saveToMemory(key, data, castedMeta);
        return entry;
      } else {
        // 大文件：读取 Meta 后返回流
        const info = await cacache.get.info(this.storagePath, key);
        const castedMeta = info!.metadata as unknown as CacheMetadata;
        await this.saveToMemory(key, null as any, castedMeta);
        return { ...castedMeta, body: cacache.get.stream(this.storagePath, key) };
      }
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
   * 内部方法：处理内存回填
   */
  private async saveToMemory(key: string, body: Buffer, metadata: CacheMetadata): Promise<void> {
    if (body && body.length > 0 && body.length <= this.maxMemorySize) {
      await this.memory.set(key, { ...metadata, body });
    } else {
      const { ...metaOnly } = metadata;
      await this.memory.set(key, metaOnly);
    }
  }

  getStream(key: string): NodeJS.ReadableStream {
    return cacache.get.stream(this.storagePath, key) as unknown as NodeJS.ReadableStream;
  }

  setStream(key: string, metadata: Omit<CacheMetadata, 'size'>): NodeJS.WritableStream {
    // 乐观清除内存缓存，防止磁盘更新后内存仍然返回旧数据
    this.memory.delete(key).catch(() => { });
    return cacache.put.stream(this.storagePath, key, { metadata }) as unknown as NodeJS.WritableStream;
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
