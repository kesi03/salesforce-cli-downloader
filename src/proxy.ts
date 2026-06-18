import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';
import * as https from 'node:https';
import * as http from 'node:http';

export function getProxyEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of ['HTTP_PROXY', 'http_proxy', 'HTTPS_PROXY', 'https_proxy', 'NO_PROXY', 'no_proxy']) {
    if (process.env[key]) env[key] = process.env[key]!;
  }
  return env;
}

function isProxyBypassed(hostname: string): boolean {
  const noProxy = process.env.NO_PROXY || process.env.no_proxy || '';
  return noProxy.split(',').map(s => s.trim()).filter(Boolean)
    .some(pattern => hostname === pattern || hostname.endsWith('.' + pattern));
}

export async function proxyFetch(url: string): Promise<Response> {
  const parsedUrl = new URL(url);
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;

  if (!httpsProxy && !httpProxy) {
    return fetch(url);
  }

  if (isProxyBypassed(parsedUrl.hostname)) {
    return fetch(url);
  }

  const proxyUrl = parsedUrl.protocol === 'https:' ? httpsProxy : httpProxy;
  if (!proxyUrl) {
    return fetch(url);
  }

  const agent = parsedUrl.protocol === 'https:'
    ? new HttpsProxyAgent(proxyUrl)
    : new HttpProxyAgent(proxyUrl);

  const mod = parsedUrl.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = mod.get(url, { agent }, (res) => {
      const body: Buffer[] = [];
      res.on('data', (chunk) => body.push(chunk));
      res.on('end', () => {
        resolve(new Response(Buffer.concat(body), {
          status: res.statusCode,
          statusText: res.statusMessage,
        }));
      });
    });
    req.on('error', reject);
    req.end();
  });
}
