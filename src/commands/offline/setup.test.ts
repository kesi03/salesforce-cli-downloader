import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as childProcess from 'node:child_process';

vi.mock('node:fs');
vi.mock('node:child_process');

const { command, describe: desc, builder, handler } = await import('./setup');

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fs.existsSync).mockReturnValue(true);
  vi.mocked(childProcess.execSync).mockReturnValue(Buffer.from(''));
});

describe('offline setup subcommand', () => {
  it('has correct command name', () => {
    expect(command).toBe('setup');
  });

  it('has a description', () => {
    expect(desc).toBeTruthy();
  });

  it('builder defines dir and store-dir options', () => {
    const options: Record<string, any> = {};
    const mockYargs = {
      option(key: string, opts: any) {
        options[key] = opts;
        return mockYargs;
      },
    };

    (builder as Function)(mockYargs);

    expect(options).toHaveProperty('dir');
    expect(options).toHaveProperty('store-dir');
  });

  it('runs pnpm install --offline', async () => {
    await handler({
      dir: './pnpm-bundle',
      storeDir: './offline-cache',
    } as any);

    expect(childProcess.execSync).toHaveBeenCalledWith(
      expect.stringContaining('pnpm install --offline'),
      expect.anything(),
    );
  });

  it('exits when package.json not found', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await handler({
      dir: './nonexistent',
      storeDir: './offline-cache',
    } as any);

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
