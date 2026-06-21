import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as childProcess from 'node:child_process';
import * as tar from 'tar';
import * as downloader from '../../downloader';

vi.mock('node:fs');
vi.mock('node:child_process');
vi.mock('tar');
vi.mock('../../downloader');

const { command, describe: desc, builder, handler } = await import('./pack');

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fs.existsSync).mockReturnValue(true);
  vi.mocked(fs.mkdirSync).mockReturnValue(undefined as any);
  vi.mocked(fs.writeFileSync).mockReturnValue();
  vi.mocked(fs.statSync).mockReturnValue({ size: 1024 } as any);
  vi.mocked(childProcess.execSync).mockReturnValue(Buffer.from(''));
  vi.mocked(tar.create).mockResolvedValue(undefined as any);
});

describe('offline pack subcommand', () => {
  it('has correct command name', () => {
    expect(command).toBe('pack');
  });

  it('has a description', () => {
    expect(desc).toBeTruthy();
  });

  it('builder defines all options', () => {
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
    expect(options).toHaveProperty('category');
    expect(options).toHaveProperty('config');
    expect(options).toHaveProperty('resolve');
    expect(options).toHaveProperty('output');
    expect(options.dir.default).toBe('./pnpm-bundle');
    expect(options['store-dir'].default).toBe('./offline-cache');
    expect(options.category.default).toBe('all');
  });

  it('generates package.json and runs pnpm install/prune/fetch', async () => {
    await handler({
      dir: './pnpm-bundle',
      storeDir: './offline-cache',
      category: 'all',
      resolve: false,
      output: 'offline-cache.tar',
    } as any);

    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(childProcess.execSync).toHaveBeenCalledWith(
      expect.stringContaining('pnpm install'),
      expect.anything(),
    );
    expect(childProcess.execSync).toHaveBeenCalledWith(
      expect.stringContaining('pnpm store prune'),
      expect.anything(),
    );
    expect(childProcess.execSync).toHaveBeenCalledWith(
      expect.stringContaining('pnpm fetch'),
      expect.anything(),
    );
    expect(tar.create).toHaveBeenCalled();
  });

  it('resolves versions when --resolve is set', async () => {
    vi.mocked(downloader.getPackageVersion).mockReturnValue('2.0.0');

    await handler({
      dir: './pnpm-bundle',
      storeDir: './offline-cache',
      category: 'core',
      resolve: true,
      output: 'offline-cache.tar',
    } as any);

    const pkgJson = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
    const pkg = JSON.parse(pkgJson);

    expect(pkg.dependencies['@salesforce/cli']).toBe('2.0.0');
    expect(downloader.getPackageVersion).toHaveBeenCalled();
  });

  it('exits when config file not found', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      const pStr = p.toString();
      return pStr.includes('nonexistent') ? false : true;
    });

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('EXIT');
    });

    await expect(handler({
      config: 'nonexistent.yaml',
    } as any)).rejects.toThrow('EXIT');

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
