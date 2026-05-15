import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { SmartCache, fetchWithCache, isResponseCacheable } from './index';
import { ProxySiteConfig } from '../types';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

describe('fetchWithCache Response Validation & DR', () => {
  const testDirs: string[] = [];

  // 辅助函数：在系统临时目录下创建一个唯一的测试缓存
  async function createTestCache(name: string) {
    const storagePath = path.join(os.tmpdir(), `isdk-proxy-test-resp-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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

  describe('isResponseCacheable Unit Tests', () => {
    it('应该默认拒绝 5xx 状态码', async () => {
      const res = new Response('error', { status: 500 });
      const result = await isResponseCacheable(res, {}, { useWafPresets: false });
      expect(result.cacheable).toBe(false);
      expect(result.reason).toContain('status_mismatch');
    });

    it('应该支持自定义允许的状态码', async () => {
      const res = new Response('error', { status: 500 });
      const result = await isResponseCacheable(res, {
        response: { statuses: ['500'] }
      }, { useWafPresets: false });
      expect(result.cacheable).toBe(true);
    });

    it('应该根据 minLength 拦截过短的内容', async () => {
      const res = new Response('short', {
        headers: { 'Content-Length': '5' }
      });
      const result = await isResponseCacheable(res, {
        response: { minLength: 10 }
      }, { useWafPresets: false });
      expect(result.cacheable).toBe(false);
      expect(result.reason).toBe('too_short');
      expect(result.keepOldCache).toBe(true);
    });

    it('应该支持 Body 正向匹配 (Glob 与正则)', async () => {
      const res = new Response('<html>Success</html>', {
        headers: { 'Content-Type': 'text/html' }
      });
      // 测试 Glob
      const resultGlob = await isResponseCacheable(res, {
        response: { body: '*Success*' }
      }, { useWafPresets: false });
      expect(resultGlob.cacheable).toBe(true);

      // 测试正则 (用户要求的恢复)
      const resultRegex = await isResponseCacheable(res, {
        response: { body: /Success/ }
      }, { useWafPresets: false });
      expect(resultRegex.cacheable).toBe(true);

      const resFail = new Response('<html>Failure</html>', {
        headers: { 'Content-Type': 'text/html' }
      });
      const resultFail = await isResponseCacheable(resFail, {
        response: { body: '*Success*' }
      }, { useWafPresets: false });
      expect(resultFail.cacheable).toBe(false);
    });

    it('当状态码为 403/429 时，应自动触发容灾保护', async () => {
      const res403 = new Response('WAF block', { status: 403 });
      const result403 = await isResponseCacheable(res403, {}, { useWafPresets: false });
      expect(result403.cacheable).toBe(false);
      expect(result403.keepOldCache).toBe(true); // 403 默认触发保护

      const res429 = new Response('Too many requests', { status: 429 });
      const result429 = await isResponseCacheable(res429, {}, { useWafPresets: false });
      expect(result429.cacheable).toBe(false);
      expect(result429.keepOldCache).toBe(true); // 429 默认触发保护
    });

    it('应该支持 Body 否定匹配 (WAF 场景)', async () => {
      const res = new Response('<html>Access Denied by WAF</html>', {
        headers: { 'Content-Type': 'text/html' }
      });
      const result = await isResponseCacheable(res, {
        response: { body: ['!*Access Denied*'] }
      }, { useWafPresets: false });
      expect(result.cacheable).toBe(false);
      expect(result.reason).toBe('body_match_failed');
      expect(result.keepOldCache).toBe(true);
    });

    it('应该支持 Headers 与 Body 的复合匹配', async () => {
      const res = new Response('<html>Success</html>', {
        headers: {
          'Content-Type': 'text/html',
          'X-Verification': 'verified'
        }
      });
      const result = await isResponseCacheable(res, {
        response: {
          headers: { 'X-Verification': 'verified' },
          body: '*Success*'
        }
      }, { useWafPresets: false });
      expect(result.cacheable).toBe(true);

      const resBadHeader = new Response('<html>Success</html>', {
        headers: { 'X-Verification': 'unverified' }
      });
      const resultBadHeader = await isResponseCacheable(resBadHeader, {
        response: {
          headers: { 'X-Verification': 'verified' },
          body: '*Success*'
        }
      }, { useWafPresets: false });
      expect(resultBadHeader.cacheable).toBe(false);
      expect(resultBadHeader.reason).toBe('headers_mismatch');
    });

    it('当 useWafPresets 为 true 时，应应用内置 WAF 规则', async () => {
      const res = new Response('<html><title>Just a moment...</title></html>', {
        headers: { 'Content-Type': 'text/html' }
      });
      // 不提供自定义规则，仅靠预设
      const result = await isResponseCacheable(res, {}, { useWafPresets: true });
      expect(result.cacheable).toBe(false);
      expect(result.reason).toBe('waf_challenge');
    });

    it('isWAFChallenge 应该能准确识别各种 WAF 响应', async () => {
      const { isWAFChallenge } = await import('./wafPresets');
      
      const cfRes = new Response('<html><title>Just a moment...</title></html>', { headers: { 'Content-Type': 'text/html' } });
      expect(await isWAFChallenge(cfRes)).toBe(true);

      const awsRes = new Response('CAPTCHA', { status: 405, headers: { 'x-amzn-waf-action': 'captcha' } });
      expect(await isWAFChallenge(awsRes)).toBe(true);

      const generalRes = new Response('bot detection', { headers: { 'Content-Type': 'text/plain' } });
      expect(await isWAFChallenge(generalRes)).toBe(true);

      const normalRes = new Response('Hello World', { status: 200, headers: { 'Content-Type': 'text/plain' } });
      expect(await isWAFChallenge(normalRes)).toBe(false);
    });
  });

  describe('fetchWithCache Integration (DR Protection)', () => {
    it('在 SWR 过程中，如果后台更新返回脏数据，不应污染缓存', async () => {
      const { cache, activeCacheWrites } = await createTestCache('swr-dr');
      const config: ProxySiteConfig = {
        response: { body: '!*DIRTY*' }
      };
      const request = new Request('https://api.example.com/swr-dr');

      // 1. 存入有效初始缓存
      await fetchWithCache(request, async () => new Response('clean data', {
        headers: { 'Cache-Control': 'public, max-age=1' }
      }), { cache, config, activeCacheWrites });
      await Promise.all(activeCacheWrites.values());

      // 等待过期
      await new Promise(r => setTimeout(r, 1100));

      // 2. 后台更新返回脏数据
      const mockFetcherDirty = vi.fn().mockImplementation(async () => new Response('DIRTY DATA', {
        headers: { 'Cache-Control': 'public, max-age=3600' }
      }));

      // 触发 SWR
      const res = await fetchWithCache(request, mockFetcherDirty, {
        cache, config, backgroundUpdate: true, activeCacheWrites
      });
      expect(await res.text()).toBe('clean data'); // 返回旧数据
      expect(res.headers.get('x-proxy-cache')).toBe('STALE');

      // 等待后台更新完成
      await new Promise(r => setTimeout(r, 200));
      await Promise.all(activeCacheWrites.values());

      // 3. 再次请求，验证缓存仍为旧数据（没被 DIRTY 覆盖）
      const resFinal = await fetchWithCache(request, mockFetcherDirty, { cache, config, activeCacheWrites });
      expect(await resFinal.text()).toBe('clean data');
      expect(resFinal.headers.get('x-proxy-cache')).toBe('STALE'); // 因为后台尝试更新失败（脏数据），依然是 STALE
    });

    it('当缺失 Content-Length 时，minLength 校验应通过 (保守策略)', async () => {
      const res = new Response('abc', {
        headers: { 'Content-Type': 'text/plain' } // 故意不给 Content-Length
      });
      const result = await isResponseCacheable(res, {
        response: { minLength: 100 }
      }, { useWafPresets: false });
      // 如果没有 Content-Length 且没读 Body，无法判定长度，默认放行
      expect(result.cacheable).toBe(true);
    });

    it('当后端返回脏数据时，应该触发 STALE_RESCUE 返回旧缓存', async () => {
      const { cache, activeCacheWrites } = await createTestCache('dr-rescue');
      const config: ProxySiteConfig = {
        response: { body: '!*Challenge*' }
      };
      const request = new Request('https://api.example.com/data');

      // 1. 先存入一个正常的初始缓存 (200 OK)
      const mockFetcherOK = vi.fn().mockImplementation(async () => new Response('valid data', {
        headers: { 'Cache-Control': 'public, max-age=1' }
      }));
      const res1 = await fetchWithCache(request, mockFetcherOK, { cache, config, activeCacheWrites });
      await res1.text();
      await Promise.all(activeCacheWrites.values());

      // 等待缓存过期
      await new Promise(r => setTimeout(r, 1100));

      // 2. 后端返回“脏数据”(人机挑战)
      const mockFetcherDirty = vi.fn().mockImplementation(async () => new Response('WAF Challenge Page', {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }));

      // 执行请求，禁用后台更新以同步获取重验证结果
      const res2 = await fetchWithCache(request, mockFetcherDirty, {
        cache, config, activeCacheWrites, backgroundUpdate: false
      });

      // 验证：虽然后端返回了 200，但因为命中 body 排除项，应该返回旧的有效缓存
      expect(res2.headers.get('x-proxy-cache')).toBe('STALE_RESCUE_BODY_MATCH_FAILED');
      expect(await res2.text()).toBe('valid data');

      // 验证：缓存没有被覆盖（再次读取应还是旧数据）
      const res3 = await fetchWithCache(request, mockFetcherDirty, {
        cache, config, activeCacheWrites, backgroundUpdate: false
      });
      expect(await res3.text()).toBe('valid data');
    });

    it('当 forceCache 开启时，仍应遵守 isResponseCacheable 的基本约束', async () => {
      const { cache, activeCacheWrites } = await createTestCache('force-cache-validation');
      const config: ProxySiteConfig = {
        forceCache: true,
        response: { minLength: 100 }
      };
      const request = new Request('https://api.example.com/force');

      // 后端返回一个不满足 minLength 的响应，且带有 no-store
      const mockFetcher = vi.fn().mockImplementation(async () => new Response('too short', {
        headers: { 'Cache-Control': 'no-store', 'Content-Length': '9' }
      }));

      const res = await fetchWithCache(request, mockFetcher, { cache, config, activeCacheWrites });
      expect(res.headers.get('x-proxy-cache')).toBe('MISS_EXCLUDED_TOO_SHORT');

      await Promise.all(activeCacheWrites.values());

      // 验证：不应该存入缓存
      const cached = await cache.get(request.url);
      expect(cached).toBeNull();
    });

    it('当命中 WAF 预设时，应返回 STALE_RESCUE_WAF_CHALLENGE', async () => {
      const { cache, activeCacheWrites } = await createTestCache('dr-waf-rescue');
      const config: ProxySiteConfig = {}; // 仅依赖预设
      const request = new Request('https://api.example.com/waf-dr');

      // 1. 存入初始缓存
      await fetchWithCache(request, async () => new Response('valid data', {
        headers: { 'Cache-Control': 'public, max-age=1' }
      }), { cache, config, activeCacheWrites });
      await Promise.all(activeCacheWrites.values());
      await new Promise(r => setTimeout(r, 1100)); // 等待过期

      // 2. 回源返回 CF 挑战页
      const mockFetcherWaf = vi.fn().mockImplementation(async () => new Response('<html><title>Just a moment...</title></html>', {
        headers: { 'Content-Type': 'text/html' }
      }));

      const res = await fetchWithCache(request, mockFetcherWaf, {
        cache, config, activeCacheWrites, backgroundUpdate: false
      });

      expect(res.headers.get('x-proxy-cache')).toBe('STALE_RESCUE_WAF_CHALLENGE');
      expect(await res.text()).toBe('valid data');
    });

    it('支持 refresh: true 强制刷新并“愈合”缓存', async () => {
      const { cache, activeCacheWrites } = await createTestCache('refresh-healing');
      const config: ProxySiteConfig = {};
      const request = new Request('https://api.example.com/refresh');

      // 1. 存入一个新鲜的缓存
      await fetchWithCache(request, async () => new Response('old data', {
        headers: { 'Cache-Control': 'public, max-age=3600' }
      }), { cache, config, activeCacheWrites });
      await Promise.all(activeCacheWrites.values());

      // 2. 正常请求应 HIT
      const resHit = await fetchWithCache(request, async () => new Response('should not hit'), { cache, config, activeCacheWrites });
      expect(resHit.headers.get('x-proxy-cache')).toBe('HIT');
      expect(await resHit.text()).toBe('old data');

      // 3. 开启 refresh: true 强制刷新
      const mockFetcherNew = vi.fn().mockImplementation(async () => new Response('NEW DATA', {
        headers: { 'Cache-Control': 'public, max-age=3600' }
      }));
      const resRefresh = await fetchWithCache(request, mockFetcherNew, { 
        cache, config, activeCacheWrites, refresh: true 
      });

      expect(resRefresh.headers.get('x-proxy-cache')).toBe('MISS'); // 强制刷新表现为 MISS
      expect(await resRefresh.text()).toBe('NEW DATA');
      await Promise.all(activeCacheWrites.values());

      // 4. 验证缓存已被愈合为新数据
      const resFinal = await fetchWithCache(request, async () => new Response('should hit'), { cache, config, activeCacheWrites });
      expect(resFinal.headers.get('x-proxy-cache')).toBe('HIT');
      expect(await resFinal.text()).toBe('NEW DATA');
    });

    it('当 refresh: true 且回源依然拿到脏数据时，应维持旧缓存救助', async () => {
      const { cache, activeCacheWrites } = await createTestCache('refresh-dirty');
      const config: ProxySiteConfig = { response: { body: '!*DIRTY*' } };
      const request = new Request('https://api.example.com/refresh-dirty');

      // 1. 存入初始缓存
      await fetchWithCache(request, async () => new Response('valid data', {
        headers: { 'Cache-Control': 'public, max-age=3600' }
      }), { cache, config, activeCacheWrites });
      await Promise.all(activeCacheWrites.values());

      // 2. 强制刷新但回源拿到脏数据
      const mockFetcherDirty = vi.fn().mockImplementation(async () => new Response('DIRTY RESPONSE'));
      const res = await fetchWithCache(request, mockFetcherDirty, { 
        cache, config, activeCacheWrites, refresh: true 
      });

      // 验证：即使要求 refresh，但因为新数据不合法，系统仍应通过旧数据进行救助
      expect(res.headers.get('x-proxy-cache')).toBe('STALE_RESCUE_BODY_MATCH_FAILED');
      expect(await res.text()).toBe('valid data');
    });

    it('无缓存时 refresh: true 应表现为常规 MISS', async () => {
      const { cache, activeCacheWrites } = await createTestCache('refresh-no-cache');
      const request = new Request('https://api.example.com/refresh-none');

      const res = await fetchWithCache(request, async () => new Response('new data'), { 
        cache, config: {}, activeCacheWrites, refresh: true 
      });

      expect(res.headers.get('x-proxy-cache')).toBe('MISS');
      expect(await res.text()).toBe('new data');
    });

    it('并发 refresh 请求应被正确合并为单个回源请求', async () => {
      const { cache, activeCacheWrites } = await createTestCache('refresh-coalesce');
      const request = new Request('https://api.example.com/refresh-coalesce');

      const mockFetcher = vi.fn().mockImplementation(async () => {
        await new Promise(r => setTimeout(r, 100)); // 模拟网络延迟
        return new Response('coalesced data');
      });

      // 同时发起两个带有 refresh: true 的请求
      const [res1, res2] = await Promise.all([
        fetchWithCache(request, mockFetcher, { cache, config: {}, activeCacheWrites, refresh: true }),
        fetchWithCache(request, mockFetcher, { cache, config: {}, activeCacheWrites, refresh: true })
      ]);

      expect(mockFetcher).toHaveBeenCalledTimes(1); // 关键：只调用了一次
      expect(await res1.text()).toBe('coalesced data');
      expect(await res2.text()).toBe('coalesced data');
      expect(res1.headers.get('x-proxy-cache')).toBe('MISS');
      expect(res2.headers.get('x-proxy-cache')).toBe('MISS');
    });

    it('离线模式应优先于 refresh (无法在离线时刷新)', async () => {
      const { cache, activeCacheWrites } = await createTestCache('offline-refresh');
      const request = new Request('https://api.example.com/offline-refresh');

      // 1. 先存入初始数据
      await fetchWithCache(request, async () => new Response('old data'), { cache, config: {}, activeCacheWrites });
      await Promise.all(activeCacheWrites.values());

      // 2. 同时开启 offline 和 refresh
      const res = await fetchWithCache(request, async () => new Response('new data'), { 
        cache, 
        config: { offline: true }, 
        activeCacheWrites, 
        refresh: true 
      });

      // 验证：离线优先级更高，返回 OFFLINE_HIT 而不是尝试刷新
      expect(res.headers.get('x-proxy-cache')).toBe('OFFLINE_HIT');
      expect(await res.text()).toBe('old data');
    });

    it('多步愈合链条：救助 -> 愈合 -> 命中', async () => {
      const { cache, activeCacheWrites } = await createTestCache('healing-chain');
      const config: ProxySiteConfig = { response: { minLength: 10 } };
      const request = new Request('https://api.example.com/chain');

      // 1. 存入初始缓存
      await fetchWithCache(request, async () => new Response('valid-data'), { cache, config, activeCacheWrites });
      await Promise.all(activeCacheWrites.values());

      // 2. 第一次 refresh：回源数据过短，触发救助
      const res1 = await fetchWithCache(request, async () => new Response('short', {
        headers: { 'Content-Length': '5' }
      }), { 
        cache, config, activeCacheWrites, refresh: true 
      });
      expect(res1.headers.get('x-proxy-cache')).toBe('STALE_RESCUE_TOO_SHORT');
      expect(await res1.text()).toBe('valid-data');

      // 3. 第二次 refresh：回源数据合法，触发愈合
      const res2 = await fetchWithCache(request, async () => new Response('new-valid-data', {
        headers: { 
          'Content-Length': '14',
          'Cache-Control': 'public, max-age=3600' 
        }
      }), { 
        cache, config, activeCacheWrites, refresh: true 
      });
      expect(res2.headers.get('x-proxy-cache')).toBe('MISS');
      expect(await res2.text()).toBe('new-valid-data');
      await Promise.all(activeCacheWrites.values());

      // 4. 最终验证：命中最新缓存
      const res3 = await fetchWithCache(request, async () => new Response('ignore'), { cache, config, activeCacheWrites });
      expect(res3.headers.get('x-proxy-cache')).toBe('HIT');
      expect(await res3.text()).toBe('new-valid-data');
    });
  });
});
