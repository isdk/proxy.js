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
});
