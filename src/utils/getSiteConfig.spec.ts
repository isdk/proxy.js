import { describe, it, expect } from 'vitest';
import { getSiteConfig } from './getSiteConfig';
import { ProxyConfig } from '../types';

describe('getSiteConfig URL Matching', () => {
  const mockConfig: ProxyConfig = {
    methods: ['GET'],
    sites: {
      'https://api.example.com/v1/*': { methods: ['POST'] }, // Glob
      '/^https:\\/\\/api\\.example\\.com\\/v2\\//': { methods: ['PUT'] }, // Regex String
      'https://github.com/': { methods: ['HEAD'] }, // Prefix match
    }
  };

  it('应该支持 Glob 模式匹配站点', () => {
    const config = getSiteConfig('https://api.example.com/v1/user', mockConfig);
    expect(config.methods).toContain('POST');
  });

  it('应该支持正则字符串匹配站点', () => {
    const config = getSiteConfig('https://api.example.com/v2/login', mockConfig);
    expect(config.methods).toContain('PUT');
  });

  it('应该支持普通字符串前缀匹配站点', () => {
    const config = getSiteConfig('https://github.com/isdk/proxy', mockConfig);
    expect(config.methods).toContain('HEAD');
  });

  it('未匹配时应该返回默认配置', () => {
    const config = getSiteConfig('https://other.com/api', mockConfig);
    expect(config.methods).toEqual(['GET']);
  });
});
