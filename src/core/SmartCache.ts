import { LRUCache } from 'secondary-cache';
import cacache from 'cacache';
import os from 'os';
import path from 'path';
import type { ProxyCacheEntry, ProxyCacheMetadata } from '../types';

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
      ...options.memoryOptions,
    };
    this.memory = new LRUCache(memoryOptions);
  }

  /**
   * 获取缓存条目
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
   * 写入缓存条目 (原子写入)
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
   * 内部方法：处理内存回填
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
   */
  getStream(key: string): NodeJS.ReadableStream {
    return cacache.get.stream(this.storagePath, key) as unknown as NodeJS.ReadableStream;
  }

  /**
   * 获取磁盘写入流 (流式缓存)
   */
  setStream(key: string, metadata: Omit<ProxyCacheMetadata, 'size'>): NodeJS.WritableStream {
    this.memory.del(key);
    const stream = cacache.put.stream(this.storagePath, key, { metadata });

    stream.on('finish', () => {
      this.memory.del(key);
    });

    return stream as unknown as NodeJS.WritableStream;
  }

  async delete(key: string, clearPersistent = true): Promise<void> {
    this.memory.del(key);
    if (clearPersistent) { await cacache.rm.entry(this.storagePath, key) }
  }

  async clear(clearPersistent = true): Promise<void> {
    this.memory.clear();
    if (clearPersistent) { await cacache.rm.all(this.storagePath) }
  }
}
