import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as tar from 'tar';

vi.mock('node:fs');
vi.mock('tar');

const { command, describe: desc, builder, handler } = await import('./unpack');

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fs.existsSync).mockReturnValue(true);
  vi.mocked(fs.mkdirSync).mockReturnValue(undefined as any);
  vi.mocked(tar.extract).mockResolvedValue(undefined as any);
});

describe('offline unpack subcommand', () => {
  it('has correct command name', () => {
    expect(command).toBe('unpack');
  });

  it('has a description', () => {
    expect(desc).toBeTruthy();
  });

  it('builder defines input and store-dir options', () => {
    const options: Record<string, any> = {};
    const mockYargs = {
      option(key: string, opts: any) {
        options[key] = opts;
        return mockYargs;
      },
    };

    (builder as Function)(mockYargs);

    expect(options).toHaveProperty('input');
    expect(options).toHaveProperty('store-dir');
  });

  it('extracts tar to store directory', async () => {
    await handler({
      input: 'offline-cache.tar',
      storeDir: './offline-cache',
    } as any);

    expect(tar.extract).toHaveBeenCalled();
  });

  it('exits when archive not found', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await handler({
      input: 'nonexistent.tar',
      storeDir: './offline-cache',
    } as any);

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
