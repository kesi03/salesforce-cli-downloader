import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as downloader from '../downloader.js';

vi.mock('node:fs');
vi.mock('../downloader.js');

const { command, describe: desc, builder, handler } = await import('./generate-config.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('generate-config command', () => {
  it('has correct command name', () => {
    expect(command).toBe('generate-config');
  });

  it('has a description', () => {
    expect(desc).toBeTruthy();
  });

  it('builder defines --output, --category, --resolve options', () => {
    let built: any = null;
    const mockYargs = {
      option(key: string, opts: any) {
        if (!built) built = {};
        built[key] = opts;
        return mockYargs;
      },
    };

    (builder as Function)(mockYargs);

    expect(built).toHaveProperty('output');
    expect(built).toHaveProperty('category');
    expect(built).toHaveProperty('resolve');
    expect(built.category.default).toBe('core');
    expect(built.resolve.default).toBe(false);
  });

  it('generates core config without resolve', async () => {
    vi.mocked(fs.writeFileSync).mockReturnValue();

    await handler({
      output: 'test-config.yaml',
      category: 'core',
      resolve: false,
    } as any);

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    const written = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;

    expect(written).toContain('cli-version: latest');
    expect(written).toContain('plugins:');
    expect(written).toContain('@salesforce/plugin-org@latest');
    expect(written).not.toContain('@salesforce/plugin-dev');
    expect(downloader.getPackageVersion).not.toHaveBeenCalled();
  });

  it('generates all-category config with resolve', async () => {
    vi.mocked(downloader.getPackageVersion).mockReturnValue('1.2.3');
    vi.mocked(fs.writeFileSync).mockReturnValue();

    await handler({
      output: 'test-config.yaml',
      category: 'all',
      resolve: true,
    } as any);

    expect(downloader.getPackageVersion).toHaveBeenCalled();
    const written = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;

    expect(written).toContain('cli-version: 1.2.3');
    expect(written).toContain('@salesforce/plugin-org@1.2.3');
    expect(written).toContain('sfdx-git-delta@1.2.3');
  });

  it('appends .yaml extension if missing', async () => {
    vi.mocked(fs.writeFileSync).mockReturnValue();

    await handler({
      output: 'myconfig',
      category: 'core',
      resolve: false,
    } as any);

    const outputPath = vi.mocked(fs.writeFileSync).mock.calls[0][0];
    expect(outputPath).toBe('myconfig.yaml');
  });
});
