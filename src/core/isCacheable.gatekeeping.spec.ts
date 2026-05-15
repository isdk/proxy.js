import { describe, it, expect } from 'vitest';
import { isCacheable } from './isCacheable';
import { generateCacheKey } from './generateCacheKey';
import { ProxySiteConfig } from '../types';

describe('Gating vs Extraction Semantics', () => {
  const siteConfig: ProxySiteConfig = {
    storagePath: './test-cache',
  };

  describe('Single Negation Pattern (Gatekeeping: Strict Exclusion)', () => {
    it('should NOT match when forbidden key is present', async () => {
      const rule = { query: '!id' };
      const config = { ...siteConfig, rules: [rule] };
      const req = new Request('https://example.com/api?id=123&foo=bar');
      
      const analysis = await isCacheable(req, config);
      expect(analysis).toBeUndefined(); // Should be blocked by gatekeeping because id exists
    });

    it('should NOT match when any unexpected key is present (Strict Mode)', async () => {
      const rule = { query: 'id' };
      const config = { ...siteConfig, rules: [rule] };
      const req = new Request('https://example.com/api?id=123&foo=bar');
      
      const analysis = await isCacheable(req, config);
      expect(analysis).toBeUndefined(); // Should be blocked because 'foo' is not 'id'
    });

    it('should match when the ONLY key matches (Strict Mode)', async () => {
      const rule = { query: 'id' };
      const config = { ...siteConfig, rules: [rule] };
      const req = new Request('https://example.com/api?id=123');
      
      const analysis = await isCacheable(req, config);
      expect(analysis).toBeDefined();
    });

    it('should match when forbidden key is absent', async () => {
      const rule = { query: '!id' };
      const config = { ...siteConfig, rules: [rule] };
      const req = new Request('https://example.com/api?foo=bar');
      
      const analysis = await isCacheable(req, config);
      expect(analysis).toBeDefined();
      expect(analysis?.matchedRule).toBe(rule);
    });
  });

  describe('Array Pattern (Extraction: Projection/Filter)', () => {
    it('should match even if "excluded" key is present (Negative is ignored in Match phase)', async () => {
      const rule = { query: ['*', '!id'] };
      const config = { ...siteConfig, rules: [rule] };
      const req = new Request('https://example.com/api?id=123&foo=bar');
      
      const analysis = await isCacheable(req, config);
      expect(analysis).toBeDefined(); // Match phase should ignore !id
      expect(analysis?.matchedRule).toBe(rule);

      // Verify Extraction phase (Fingerprinting)
      const key = await generateCacheKey(req, config, analysis?.bodyState, analysis?.matchedRule || undefined);
      
      // Generate a key for a request WITHOUT id to compare
      const reqNoId = new Request('https://example.com/api?foo=bar');
      const keyNoId = await generateCacheKey(reqNoId, config);
      
      expect(key).toBe(keyNoId); // Fingerprints should be identical because id is excluded
    });
  });

  describe('Scalar Regex (Strict Mode)', () => {
    it('should only match if ALL keys satisfy the regex', async () => {
      const rule = { query: /^v_/ };
      const config = { ...siteConfig, rules: [rule] };
      
      const reqFail = new Request('https://example.com/api?v_1=a&other=b');
      expect(await isCacheable(reqFail, config)).toBeUndefined();

      const reqPass = new Request('https://example.com/api?v_1=a&v_2=b');
      expect(await isCacheable(reqPass, config)).toBeDefined();
    });
  });
});
