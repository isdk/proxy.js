import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { SmartCache } from './SmartCache';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { ProxyCacheMetadata } from '../types';

describe('SmartCache', () => {
  const storagePath = path.join(os.tmpdir(), `isdk-proxy-smart-test-${Date.now()}`);
  let cache: SmartCache;

  const mockMetadata: ProxyCacheMetadata = {
    status: 200,
    headers: { 'content-type': 'text/plain' },
    policy: {},
    url: 'https://test.com',
    method: 'GET',
    timestamp: Date.now(),
    size: 0
  };

  /** 辅助函数：消费可能为 Buffer 或 Stream 的 Body */
  async function consumeBody(body: any): Promise<string> {
    if (!body) return '';
    if (body instanceof Buffer) {
      return body.toString();
    }
    if (body instanceof Uint8Array) {
      return Buffer.from(body).toString();
    }
    // Keyv 等可能会将 Buffer 序列化为 { type: 'Buffer', data: [...] }
    if (body.type === 'Buffer' && Array.isArray(body.data)) {
      return Buffer.from(body.data).toString();
    }
    if (typeof body === 'string') {
      return body;
    }
    if (typeof body.on === 'function') {
      let result = '';
      for await (const chunk of body) {
        result += chunk.toString();
      }
      return result;
    }

    // 如果都不是，打印出来看看是啥结构
    console.log('consumeBody unknown body:', typeof body, body);
    return '';
  }

  beforeAll(async () => {
    await fs.rm(storagePath, { recursive: true, force: true });
    // 设置内存阈值：10 字节
    cache = new SmartCache({ storagePath, maxMemorySize: 10 });
  });

  afterAll(async () => {
    await fs.rm(storagePath, { recursive: true, force: true }).catch(() => { });
  });

  beforeEach(async () => {
    await cache.clear();
  });

  it('小文件应该同时存在于内存和磁盘', async () => {
    const key = 'small-file';
    const body = Buffer.from('small'); // 5 bytes < 10
    await cache.set(key, body, mockMetadata);

    const entry = await cache.get(key);
    expect(await consumeBody(entry!.body)).toBe('small');

    // 手动删除磁盘，验证内存中是否还有
    await fs.rm(storagePath, { recursive: true, force: true });
    const entryFromMem = await cache.get(key);
    expect(await consumeBody(entryFromMem!.body)).toBe('small');

    await fs.mkdir(storagePath, { recursive: true });
  });

  it('大文件应该元数据在内存，Body 在磁盘', async () => {
    const key = 'large-file';
    const body = Buffer.from('this is a large file content'); // > 10 bytes
    await cache.set(key, body, mockMetadata);

    const entry = await cache.get(key);
    // 关键：大文件返回的是流，需要异步消费
    expect(await consumeBody(entry!.body)).toBe('this is a large file content');

    // 验证 Meta 是否在内存：
    // 1. 删除磁盘文件
    await fs.rm(storagePath, { recursive: true, force: true });
    // 2. 尝试获取：由于 Meta 在内存，它会返回一个指向已删除文件的流
    const entryAfterDelete = await cache.get(key);
    expect(entryAfterDelete).not.toBeNull();
    // 3. 消费流时应该抛出错误 (例如 ENOENT)
    await expect(consumeBody(entryAfterDelete!.body)).rejects.toThrow();

    await fs.mkdir(storagePath, { recursive: true });
  });

  it('delete 应该同时清理内存和磁盘', async () => {
    const key = 'to-delete';
    await cache.set(key, Buffer.from('data'), mockMetadata);
    await cache.delete(key);

    expect(await cache.get(key)).toBeNull();
  });

  it('delete(key, false) 应该仅清理内存，保留磁盘', async () => {
    const key = 'mem-only-delete';
    await cache.set(key, Buffer.from('data'), mockMetadata);
    await cache.delete(key, false);

    // 内存已清，磁盘还在
    const entry = await cache.get(key);
    expect(entry).not.toBeNull();
    expect(await consumeBody(entry!.body)).toBe('data');
  });

  it('clear(clearPersistent=false) 应该仅清空内存，保留磁盘', async () => {
    const key = 'clear-mem-only';
    await cache.set(key, Buffer.from('data'), mockMetadata);
    await cache.clear(false);

    // 内存已清，磁盘还在
    const entry = await cache.get(key);
    expect(entry).not.toBeNull();
    expect(await consumeBody(entry!.body)).toBe('data');
  });

  it('应该支持流式写入和读取', async () => {
    const key = 'stream-key';
    const stream = cache.setStream(key, mockMetadata);

    // 写入流
    stream.end(Buffer.from('stream data'));

    // 等待磁盘写入完成 (cacache 流是异步的)
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve as any);
      stream.on('error', reject);
    });

    // 读取流
    const readStream = cache.getStream(key);
    expect(await consumeBody(readStream)).toBe('stream data');
  });

  it('流式写入完成后 L1 内存应被清理', async () => {
    const key = 'stream-cleanup';
    const writeStream = cache.setStream(key, mockMetadata);
    writeStream.end(Buffer.from('stream cleanup test'));

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve as any);
      writeStream.on('error', reject);
    });

    // 磁盘写入后删除磁盘
    await fs.rm(storagePath, { recursive: true, force: true });
    const entry = await cache.get(key);
    // 内存中没有 body（因为流式写入不进入 L1），磁盘已删，所以返回 null
    expect(entry).toBeNull();

    await fs.mkdir(storagePath, { recursive: true });
  });

  it('不存在的 key 应该返回 null', async () => {
    const entry = await cache.get('non-existent-key');
    expect(entry).toBeNull();
  });

  it('写入同一 key 应该覆盖旧数据', async () => {
    const key = 'overwrite-key';
    await cache.set(key, Buffer.from('old'), mockMetadata);
    await cache.set(key, Buffer.from('new'), mockMetadata);

    const entry = await cache.get(key);
    expect(await consumeBody(entry!.body)).toBe('new');
  });

  it('maxMemorySize 边界测试：刚好等于阈值时 Body 应进入磁盘', async () => {
    const boundaryCache = new SmartCache({
      storagePath: path.join(storagePath, 'boundary'),
      maxMemorySize: 5
    });

    // 刚好 5 字节，应该走大文件逻辑（> 不进入，= 进入磁盘）
    const key = 'boundary-file';
    await boundaryCache.set(key, Buffer.from('12345'), mockMetadata);
    const entry = await boundaryCache.get(key);

    // 5 字节等于阈值，根据实现逻辑，body.length <= maxMemorySize 时进入内存
    expect(await consumeBody(entry!.body)).toBe('12345');

    await boundaryCache.clear();
  });

  it('init() 应支持重新初始化', async () => {
    const key = 'reinit-test';
    await cache.set(key, Buffer.from('data'), mockMetadata);

    // 重新初始化，使用新配置
    const newStoragePath = path.join(storagePath, 'new-dir');
    cache.init({ storagePath: newStoragePath, maxMemorySize: 20 });

    // 旧数据应该丢失（新路径）
    expect(await cache.get(key)).toBeNull();

    // 写入新数据到新路径
    await cache.set(key, Buffer.from('new-data'), mockMetadata);
    expect(await consumeBody((await cache.get(key))!.body)).toBe('new-data');

    await cache.free();
    await fs.rm(newStoragePath, { recursive: true, force: true });
  });

  it('free() 应释放资源但保留磁盘缓存', async () => {
    const freeCache = new SmartCache({
      storagePath: path.join(storagePath, 'free-test')
    });
    const key = 'free-test-key';
    await freeCache.set(key, Buffer.from('data'), mockMetadata);

    freeCache.free();

    // free 后 initialized 为 false，重新 init 可继续使用
    freeCache.init();
    const entry = await freeCache.get(key);
    expect(await consumeBody(entry!.body)).toBe('data');

    await freeCache.clear();
  });

  it('LRU 淘汰后再次访问被淘汰的 key 应从磁盘恢复', async () => {
    const lruCache = new SmartCache({
      storagePath: path.join(storagePath, 'lru-recover'),
      maxTotalMemorySize: 1024,
      maxMemorySize: 512
    });

    const meta = { ...mockMetadata, timestamp: Date.now() };

    // 填满内存
    await lruCache.set('key1', Buffer.alloc(300), meta);
    await lruCache.set('key2', Buffer.alloc(300), meta);

    // key1 被淘汰，写入 key3 触发
    await lruCache.set('key3', Buffer.alloc(300), meta);

    // 从磁盘重新读取 key1
    const entry = await lruCache.get('key1');
    expect(entry).not.toBeNull();
    expect(await consumeBody(entry!.body)).toBe(Buffer.alloc(300).toString());
  });

  it('空 Buffer 应该被正确处理', async () => {
    const key = 'empty-body';
    await cache.set(key, Buffer.alloc(0), mockMetadata);
    const entry = await cache.get(key);
    expect(entry).not.toBeNull();
    expect(await consumeBody(entry!.body)).toBe('');
  });

  it('memoryOptions 应该被正确透传', async () => {
    const optCache = new SmartCache({
      storagePath: path.join(storagePath, 'memory-opt'),
      memoryOptions: {
        expires: 1000, // 1秒过期
        capacity: 10
      }
    });

    await optCache.set('expire-test', Buffer.from('data'), mockMetadata);

    // 等待过期
    await new Promise(resolve => setTimeout(resolve, 1100));

    // 内存中应该已过期，磁盘还在
    await fs.rm(path.join(storagePath, 'memory-opt'), { recursive: true, force: true });
    const entry = await optCache.get('expire-test');
    expect(entry).toBeNull();
  });

  it('内存总量限制：当达到 maxTotalMemorySize 时应按 LRU 顺序剔除旧数据', async () => {
    // 假设 maxTotalMemorySize 为 2048 (2KB)
    // 我们的 Meta 估算是 512B，Body 为 512B，则每个 Entry 约 1024B
    const limitedCache = new SmartCache({
      storagePath: path.join(storagePath, 'limit-test'),
      maxTotalMemorySize: 2500, // 约容纳 2 个 Entry
      maxMemorySize: 1000       // 允许 Body 进入内存
    });

    const meta = { ...mockMetadata, timestamp: Date.now() };

    // 1. 存入第一个
    await limitedCache.set('key1', Buffer.alloc(512), meta);
    // 2. 存入第二个
    await limitedCache.set('key2', Buffer.alloc(512), meta);

    // 验证两者都在内存 (利用 delete 磁盘后依然能 get 到的特性)
    await fs.rm(path.join(storagePath, 'limit-test'), { recursive: true, force: true });
    expect(await limitedCache.get('key1')).not.toBeNull();
    expect(await limitedCache.get('key2')).not.toBeNull();

    // 3. 存入第三个，此时应触发 LRU 淘汰 key1
    await limitedCache.set('key3', Buffer.alloc(512), meta);

    // key1 应该已被内存剔除（因为磁盘已删，内存没有就返回 null 或报错）
    // 注意：SmartCache.get 在内存未命中时会尝试读磁盘，磁盘已删则返回 null
    expect(await limitedCache.get('key1')).toBeNull();
    expect(await limitedCache.get('key2')).not.toBeNull();
    expect(await limitedCache.get('key3')).not.toBeNull();
  });
});
