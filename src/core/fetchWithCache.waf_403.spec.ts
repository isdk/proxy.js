import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { SmartCache, fetchWithCache } from './index';
import { ProxySiteConfig } from '../types';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

describe('fetchWithCache WAF 403 Validation', () => {
  const testDirs: string[] = [];

  async function createTestCache(name: string) {
    const storagePath = path.join(os.tmpdir(), `isdk-proxy-test-waf-403-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    testDirs.push(storagePath);
    await fs.rm(storagePath, { recursive: true, force: true });
    const cache = new SmartCache({ storagePath });
    const activeCacheWrites = new Map<string, Promise<void>>();
    return { cache, storagePath, activeCacheWrites };
  }

  afterAll(async () => {
    for (const dir of testDirs) {
      try { await fs.rm(dir, { recursive: true, force: true }); } catch (e) { }
    }
  });

  it('当回源返回 403 且被识别为 WAF 挑战时，若无缓存应返回 MISS_EXCLUDED_WAF_CHALLENGE', async () => {
    const { cache, activeCacheWrites } = await createTestCache('miss-waf-403');
    const config: ProxySiteConfig = {};
    const request = new Request('https://api.example.com/waf-403-miss');

    // 模拟 WAF 403 响应 (带有人机挑战特征)
    const mockFetcherWaf = vi.fn().mockImplementation(async () => new Response('<html><title>Just a moment...</title></html>', {
      status: 403,
      headers: { 'Content-Type': 'text/html' }
    }));

    const res = await fetchWithCache(request, mockFetcherWaf, { cache, config, activeCacheWrites });
    
    expect(res.status).toBe(403);
    expect(res.headers.get('x-proxy-cache')).toBe('MISS_EXCLUDED_WAF_CHALLENGE');
  });

  it('当回源返回 403 且被识别为 WAF 挑战时，若有旧缓存应返回 STALE_RESCUE_WAF_CHALLENGE', async () => {
    const { cache, activeCacheWrites } = await createTestCache('stale-waf-403');
    const config: ProxySiteConfig = {};
    const request = new Request('https://api.example.com/waf-403-stale');

    // 1. 存入初始缓存
    await fetchWithCache(request, async () => new Response('valid data', {
      headers: { 'Cache-Control': 'public, max-age=1' }
    }), { cache, config, activeCacheWrites });
    await Promise.all(activeCacheWrites.values());
    await new Promise(r => setTimeout(r, 1100)); // 等待过期

    // 2. 回源返回 WAF 403 (带有 Cloudflare 特征)
    const mockFetcherWaf = vi.fn().mockImplementation(async () => new Response('WAF Blocked', {
      status: 403,
      headers: { 
        'Content-Type': 'text/plain',
        'cf-mitigated': 'challenge' // 触发 Cloudflare 预设
      }
    }));

    const res = await fetchWithCache(request, mockFetcherWaf, {
      cache, config, activeCacheWrites, backgroundUpdate: false
    });

    expect(res.headers.get('x-proxy-cache')).toBe('STALE_RESCUE_WAF_CHALLENGE');
    expect(await res.text()).toBe('valid data');
  });

  it('纯粹的 403 (无 WAF 特征) 应该返回 MISS_EXCLUDED_STATUS_MISMATCH:403 (或类似)', async () => {
    const { cache, activeCacheWrites } = await createTestCache('normal-403');
    const config: ProxySiteConfig = {};
    const request = new Request('https://api.example.com/normal-403');

    const mockFetcherNormal403 = vi.fn().mockImplementation(async () => new Response('Forbidden', {
      status: 403,
      headers: { 'Content-Type': 'text/plain' }
    }));

    const res = await fetchWithCache(request, mockFetcherNormal403, { cache, config, activeCacheWrites });
    // 现在由于 GENERAL_WAF_PRESET 包含了 !403，所有 403 默认都会被识别为 WAF_CHALLENGE
    expect(res.headers.get('x-proxy-cache')).toBe('MISS_EXCLUDED_WAF_CHALLENGE');
  });
});
