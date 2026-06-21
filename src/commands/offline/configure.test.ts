import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as downloader from '../../downloader';

vi.mock('node:fs');
vi.mock('../../downloader');

const { command, describe: desc, builder, handler } = await import('./configure');

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fs.existsSync).mockReturnValue(true);
  vi.mocked(fs.mkdirSync).mockReturnValue(undefined as any);
  vi.mocked(fs.writeFileSync).mockReturnValue();
});

describe('offline configure command', () => {
  it('has correct command name', () => {
    expect(command).toBe('configure');
  });

  it('has a description', () => {
    expect(desc).toBeTruthy();
  });

  it('builder defines dir, category, config, resolve, store-dir options', () => {
    let built: any = null;
    const mockYargs = {
      option(key: string, opts: any) {
        if (!built) built = {};
        built[key] = opts;
        return mockYargs;
      },
    };

    (builder as Function)(mockYargs);

    expect(built).toHaveProperty('dir');
    expect(built).toHaveProperty('category');
    expect(built).toHaveProperty('config');
    expect(built).toHaveProperty('resolve');
    expect(built).toHaveProperty('store-dir');
    expect(built.category.default).toBe('all');
    expect(built['store-dir'].default).toBe('./offline-cache');
    expect(built.dir.default).toBe('./pnpm-bundle');
  });

  it('generates package.json with all plugins by default', async () => {
    await handler({
      dir: './pnpm-bundle',
      category: 'all',
      resolve: false,
      storeDir: './offline-cache',
    } as any);

    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
    const pkgJson = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
    const pkg = JSON.parse(pkgJson);

    expect(pkg.name).toBe('salesforce-cli-offline-bundle');
    expect(pkg.private).toBe(true);
    expect(pkg.dependencies['@salesforce/cli']).toBe('*');
    expect(pkg.dependencies['@salesforce/plugin-org']).toBe('*');
    expect(downloader.getPackageVersion).not.toHaveBeenCalled();
  });

  it('generates core-only plugin list', async () => {
    await handler({
      dir: './pnpm-bundle',
      category: 'core',
      resolve: false,
      storeDir: './offline-cache',
    } as any);

    const pkgJson = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
    const pkg = JSON.parse(pkgJson);

    expect(pkg.dependencies['@salesforce/plugin-org']).toBe('*');
    expect(pkg.dependencies['@salesforce/plugin-dev']).toBeUndefined();
  });

  it('resolves versions from npm when --resolve is set', async () => {
    vi.mocked(downloader.getPackageVersion).mockReturnValue('1.2.3');

    await handler({
      dir: './pnpm-bundle',
      category: 'core',
      resolve: true,
      storeDir: './offline-cache',
    } as any);

    const pkgJson = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
    const pkg = JSON.parse(pkgJson);

    expect(pkg.dependencies['@salesforce/plugin-org']).toBe('1.2.3');
    expect(downloader.getPackageVersion).toHaveBeenCalled();
  });

  it('writes .npmrc with store-dir', async () => {
    await handler({
      dir: './pnpm-bundle',
      category: 'core',
      resolve: false,
      storeDir: '/custom/cache/path',
    } as any);

    const npmrc = vi.mocked(fs.writeFileSync).mock.calls[1][1] as string;
    expect(npmrc).toContain('store-dir=');
  });

  it('generates JIT plugins when category is jit', async () => {
    await handler({
      dir: './pnpm-bundle',
      category: 'jit',
      resolve: false,
      storeDir: './offline-cache',
    } as any);

    const pkgJson = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
    const pkg = JSON.parse(pkgJson);

    expect(pkg.dependencies['@salesforce/plugin-dev']).toBe('*');
    expect(pkg.dependencies['@salesforce/plugin-org']).toBeUndefined();
  });

  it('creates output directory if it does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    await handler({
      dir: './new-dir',
      category: 'core',
      resolve: false,
      storeDir: './offline-cache',
    } as any);

    expect(fs.mkdirSync).toHaveBeenCalled();
  });
});
