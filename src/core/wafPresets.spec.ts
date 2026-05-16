import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  isWAFChallenge, 
  registerWAFPreset, 
  unregisterWAFPreset, 
  getWAFPresets, 
  clearWAFPresets,
  CLOUDFLARE_WAF_PRESET,
  AWS_WAF_PRESET,
  GENERAL_WAF_PRESET
} from './wafPresets';
import { ProxyCacheRule } from '../types';

describe('WAF Presets Unit Tests', () => {
  let defaultPresets: ProxyCacheRule[];

  beforeEach(() => {
    // 备份默认预设
    defaultPresets = getWAFPresets();
  });

  afterEach(() => {
    // 恢复默认预设，防止干扰其他测试
    clearWAFPresets();
    defaultPresets.forEach(p => registerWAFPreset(p));
  });

  describe('Registration APIs', () => {
    it('getWAFPresets 应该返回当前所有已注册的预设', () => {
      const presets = getWAFPresets();
      expect(presets).toContain(CLOUDFLARE_WAF_PRESET);
      expect(presets).toContain(AWS_WAF_PRESET);
      expect(presets).toContain(GENERAL_WAF_PRESET);
    });

    it('registerWAFPreset 应该能添加新的预设', async () => {
      const customRule: ProxyCacheRule = {
        response: {
          statuses: ['418'],
          body: ['*I am a teapot*']
        }
      };
      
      registerWAFPreset(customRule);
      const presets = getWAFPresets();
      expect(presets).toContain(customRule);

      const res = new Response('I am a teapot', { status: 418 });
      expect(await isWAFChallenge(res)).toBe(true);
    });

    it('unregisterWAFPreset 应该能删除指定的预设', async () => {
      const customRule: ProxyCacheRule = {
        response: { body: ['*DELETE_ME*'] }
      };
      
      registerWAFPreset(customRule);
      expect(await isWAFChallenge(new Response('DELETE_ME'))).toBe(true);
      
      unregisterWAFPreset(customRule);
      expect(await isWAFChallenge(new Response('DELETE_ME'))).toBe(false);
    });

    it('clearWAFPresets 应该能清空所有预设', async () => {
      clearWAFPresets();
      expect(getWAFPresets().length).toBe(0);
      
      // 即使是标准的 Cloudflare 响应，清空后也不应识别为 WAF
      const res = new Response('Just a moment...', { status: 403 });
      expect(await isWAFChallenge(res)).toBe(false);
    });
  });

  describe('isWAFChallenge Matching Logic', () => {
    it('应该能通过状态码识别 WAF (Positive Match)', async () => {
      // 403 命中 GENERAL_WAF_PRESET
      const res = new Response('Forbidden', { status: 403 });
      expect(await isWAFChallenge(res)).toBe(true);
    });

    it('应该能通过响应头识别 WAF (Positive Match)', async () => {
      // cf-mitigated 命中 CLOUDFLARE_WAF_PRESET
      const res = new Response('Blocked', { 
        headers: { 'cf-mitigated': 'challenge' } 
      });
      expect(await isWAFChallenge(res)).toBe(true);
    });

    it('应该能通过响应体关键字识别 WAF (即使状态码为 200)', async () => {
      // 命中 GENERAL_WAF_PRESET 中的关键字
      const res = new Response('Please verify you are human to access', { status: 200 });
      expect(await isWAFChallenge(res)).toBe(true);
    });

    it('不应将正常的 200 响应识别为 WAF', async () => {
      const res = new Response('{"data": "ok"}', { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      expect(await isWAFChallenge(res)).toBe(false);
    });

    it('不应将普通的 404 响应识别为 WAF', async () => {
      const res = new Response('Not Found', { status: 404 });
      expect(await isWAFChallenge(res)).toBe(false);
    });

    it('应该支持复杂的 Glob 模式匹配 Body', async () => {
      const customRule: ProxyCacheRule = {
        response: { body: ['*security*check*access*'] }
      };
      registerWAFPreset(customRule);
      
      const res = new Response('This is a security important check to access our site');
      expect(await isWAFChallenge(res)).toBe(true);
    });
  });

  describe('Resilience & Side Effects', () => {
    it('读取 Body 进行匹配时不应消耗原始 Response 的 body 流', async () => {
      const res = new Response('sensitive data content');
      const isWaf = await isWAFChallenge(res);
      
      expect(isWaf).toBe(false);
      // 如果没有使用 clone()，下面的 text() 调用会抛出 "body used" 错误
      const text = await res.text();
      expect(text).toBe('sensitive data content');
    });

    it('当 Body 为空或不可读取时应能优雅处理', async () => {
      const res = new Response(null, { status: 200 });
      expect(await isWAFChallenge(res)).toBe(false);
    });
  });
});
