import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('getProxyEnv', () => {
  it('returns empty object when no proxy env vars set', async () => {
    const { getProxyEnv } = await import('./proxy.js');
    expect(getProxyEnv()).toEqual({});
  });

  it('includes HTTP_PROXY when set', async () => {
    vi.stubEnv('HTTP_PROXY', 'http://proxy:8080');
    const { getProxyEnv } = await import('./proxy.js');
    expect(getProxyEnv()).toHaveProperty('HTTP_PROXY', 'http://proxy:8080');
  });

  it('includes HTTPS_PROXY when set', async () => {
    vi.stubEnv('HTTPS_PROXY', 'https://proxy:8443');
    const { getProxyEnv } = await import('./proxy.js');
    expect(getProxyEnv()).toHaveProperty('HTTPS_PROXY', 'https://proxy:8443');
  });

  it('includes lowercase proxy vars when set', async () => {
    vi.stubEnv('http_proxy', 'http://proxy:8080');
    vi.stubEnv('no_proxy', 'localhost');
    const { getProxyEnv } = await import('./proxy.js');
    expect(getProxyEnv()).toHaveProperty('http_proxy', 'http://proxy:8080');
    expect(getProxyEnv()).toHaveProperty('no_proxy', 'localhost');
  });

  it('includes NO_PROXY when set', async () => {
    vi.stubEnv('NO_PROXY', 'localhost,127.0.0.1');
    const { getProxyEnv } = await import('./proxy.js');
    expect(getProxyEnv()).toHaveProperty('NO_PROXY', 'localhost,127.0.0.1');
  });
});

describe('proxyFetch', () => {
  it('uses native fetch when no proxy is configured', async () => {
    vi.stubEnv('HTTP_PROXY', '');
    vi.stubEnv('HTTPS_PROXY', '');
    const { proxyFetch } = await import('./proxy.js');
    const mockResponse = new Response('{"ok":true}');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const result = await proxyFetch('https://example.com/data');
    expect(result).toBe(mockResponse);
  });

  it('passes through to native fetch when HTTPS_PROXY is not set for https', async () => {
    vi.stubEnv('HTTP_PROXY', 'http://proxy:8080');
    vi.stubEnv('HTTPS_PROXY', '');
    const { proxyFetch } = await import('./proxy.js');
    const mockResponse = new Response('{"ok":true}');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const result = await proxyFetch('https://example.com/data');
    expect(result).toBe(mockResponse);
  });
});
