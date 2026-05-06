import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { SmartCache } from './SmartCache';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { CacheMetadata } from '../types';

describe('SmartCache', () => {
  const storagePath = path.join(os.tmpdir(), `isdk-proxy-smart-test-${Date.now()}`);
  let cache: SmartCache;
  
  const mockMetadata: CacheMetadata = {
    status: 200,
    headers: { 'content-type': 'text/plain' },
    policy: {},
    url: 'https://test.com',
    method: 'GET',
    timestamp: Date.now(),
    size: 0
  };

  beforeAll(async () => {
    await fs.rm(storagePath, { recursive: true, force: true });
    // 设置内存阈值：10 字节
    cache = new SmartCache({ storagePath, maxMemorySize: 10 });
  });

  afterAll(async () => {
    await fs.rm(storagePath, { recursive: true, force: true }).catch(() => {});
  });

  beforeEach(async () => {
    await cache.clear();
  });

  it('小文件应该同时存在于内存和磁盘', async () => {
    const key = 'small-file';
    const body = Buffer.from('small'); // 5 bytes < 10
    await cache.set(key, body, mockMetadata);

    const entry = await cache.get(key);
    // 使用 Buffer.from 确保正确转换
    expect(Buffer.from(entry!.body).toString()).toBe('small');
    
    // 手动删除磁盘，验证内存中是否还有
    await fs.rm(storagePath, { recursive: true, force: true });
    const entryFromMem = await cache.get(key);
    expect(Buffer.from(entryFromMem!.body).toString()).toBe('small');
    
    await fs.mkdir(storagePath, { recursive: true });
  });

  it('大文件应该元数据在内存，Body 在磁盘', async () => {
    const key = 'large-file';
    const body = Buffer.from('this is a large file content'); // > 10 bytes
    await cache.set(key, body, mockMetadata);

    const entry = await cache.get(key);
    expect(Buffer.from(entry!.body).toString()).toBe('this is a large file content');

    // 验证 Meta 是否在内存：
    // 1. 删除磁盘文件
    await fs.rm(storagePath, { recursive: true, force: true });
    // 2. 尝试获取：由于 Body 在磁盘，磁盘已删，获取应失败（返回 null）
    // 但我们可以通过内部状态或行为推断 Meta 确实命中了 L1（虽然本测试主要看最终结果）
    const entryAfterDelete = await cache.get(key);
    expect(entryAfterDelete).toBeNull(); 
    
    await fs.mkdir(storagePath, { recursive: true });
  });

  it('delete 应该同时清理内存和磁盘', async () => {
    const key = 'to-delete';
    await cache.set(key, Buffer.from('data'), mockMetadata);
    await cache.delete(key);
    
    expect(await cache.get(key)).toBeNull();
  });

  it('应该支持流式写入和读取', async () => {
    const key = 'stream-key';
    const stream = cache.setStream(key, mockMetadata);
    
    // 写入流
    stream.end(Buffer.from('stream data'));
    
    // 等待磁盘写入完成 (cacache 流是异步的)
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    // 读取流
    const readStream = cache.getStream(key);
    let result = '';
    for await (const chunk of readStream) {
      result += chunk.toString();
    }
    expect(result).toBe('stream data');
  });
});
