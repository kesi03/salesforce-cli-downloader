import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer, type RequestListener } from 'node:http';
import { join } from 'node:path';
import type { Arguments, CommandBuilder } from 'yargs';

interface ServeArgs {
  port: number;
  sfPath: string;
}

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: string;
}

function resolveSfPath(sfPath: string): string {
  if (sfPath !== 'sf') return sfPath;
  const candidates = [
    './sf-install/node_modules/.bin/sf',
    './pnpm-bundle/node_modules/.bin/sf',
    '/opt/sf-cli/node_modules/.bin/sf',
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      return p;
    }
  }
  return 'sf';
}

function runSf(args: string[], sfPath: string): ExecResult {
  const cmd = [sfPath, ...args].join(' ');
  try {
    const stdout = execSync(cmd, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout: stdout.trim(), stderr: '', exitCode: 0 };
  } catch (err: any) {
    const stderr = err.stderr?.toString() ?? '';
    const stdout = err.stdout?.toString() ?? '';
    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: err.status ?? 1,
    };
  }
}

function parseBody(req: import('node:http').IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function json(res: import('node:http').ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

export const command = 'serve';
export const describe = 'Start an HTTP API server that wraps the sf CLI';

export const builder: CommandBuilder = (yargs) =>
  yargs
    .option('port', {
      alias: 'p',
      describe: 'Port to listen on',
      type: 'number',
      default: 3000,
    })
    .option('sf-path', {
      describe: 'Path to the sf binary',
      type: 'string',
      default: 'sf',
    });

export const handler = async (argv: Arguments & ServeArgs): Promise<void> => {
  const { port } = argv;
  const sfPath = resolveSfPath(argv.sfPath);

  const listener: RequestListener = async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      json(res, 200, { status: 'ok' });
      return;
    }

    if (req.method === 'POST' && req.url === '/api/sf') {
      let body: any;
      try {
        body = await parseBody(req);
      } catch {
        json(res, 400, { error: 'Invalid JSON body' });
        return;
      }

      if (!Array.isArray(body?.args)) {
        json(res, 400, { error: 'Body must have an "args" array, e.g. { "args": ["org", "list", "--json"] }' });
        return;
      }

      const result = runSf(body.args, sfPath);
      json(res, result.exitCode === 0 ? 200 : 422, result);
      return;
    }

    json(res, 404, { error: 'Not found. Use POST /api/sf or GET /health' });
  };

  const server = createServer(listener);

  await new Promise<void>((resolve) => server.listen(port, resolve));

  console.log(JSON.stringify({ event: 'sf-api-server', status: 'listening', port, sfPath }));
};
