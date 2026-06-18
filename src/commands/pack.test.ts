import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as tar from 'tar';

vi.mock('node:fs');
vi.mock('tar');

const { command, describe: desc, builder, handler } = await import('./pack.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('pack command', () => {
  it('has correct command name', () => {
    expect(command).toBe('pack');
  });

  it('has a description', () => {
    expect(desc).toBeTruthy();
  });

  it('builder defines --output and --gzip options', () => {
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
    expect(built).toHaveProperty('gzip');
    expect(built.output.default).toBe('sf-cli-bundle.tar');
    expect(built.gzip.default).toBe(false);
  });

  it('handler creates tar archive with cli and plugins dirs', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      const pStr = p.toString();
      return pStr.includes('cli') || pStr.includes('plugins');
    });
    vi.mocked(fs.statSync).mockReturnValue({ size: 12345 } as any);
    vi.mocked(tar.create as any).mockResolvedValue(undefined);

    await handler({
      workspace: '/tmp/ws',
      output: 'bundle.tar',
      gzip: false,
    } as any);

    expect(tar.create).toHaveBeenCalledWith(
      expect.objectContaining({
        file: 'bundle.tar',
        cwd: '/tmp/ws',
        gzip: false,
      }),
      ['cli', 'plugins'],
    );
  });

  it('exits when nothing to package', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await handler({
      workspace: '/tmp/ws',
      output: 'bundle.tar',
      gzip: false,
    } as any);

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
