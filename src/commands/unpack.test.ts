import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as tar from 'tar';

vi.mock('node:fs');
vi.mock('tar');

const { command, describe: desc, builder, handler } = await import('./unpack.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('unpack command', () => {
  it('has correct command name', () => {
    expect(command).toBe('unpack');
  });

  it('has a description', () => {
    expect(desc).toBeTruthy();
  });

  it('builder defines --input, --output, --install options', () => {
    let built: any = null;
    const mockYargs = {
      option(key: string, opts: any) {
        if (!built) built = {};
        built[key] = opts;
        return mockYargs;
      },
    };

    (builder as Function)(mockYargs);

    expect(built).toHaveProperty('input');
    expect(built).toHaveProperty('output');
    expect(built).toHaveProperty('install');
    expect(built.input.demandOption).toBe(true);
    expect(built.install.default).toBe(false);
  });

  it('extracts tar archive to output dir', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      const pStr = p.toString();
      return pStr === '/input/bundle.tar' || pStr === '/output/cli' || pStr === '/output/plugins';
    });
    vi.mocked(fs.readdirSync).mockReturnValue([] as any);
    vi.mocked(tar.extract as any).mockResolvedValue(undefined);

    await handler({
      input: '/input/bundle.tar',
      output: '/output',
      install: false,
    } as any);

    expect(tar.extract).toHaveBeenCalledWith({
      file: '/input/bundle.tar',
      cwd: '/output',
    });
  });

  it('exits when input file not found', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await handler({
      input: '/nonexistent.tar',
      install: false,
    } as any);

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('derives output dir from input filename when not provided', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      const pStr = p.toString();
      return pStr === '/some/path/bundle.tar';
    });
    vi.mocked(fs.readdirSync).mockReturnValue([] as any);
    vi.mocked(tar.extract as any).mockResolvedValue(undefined);

    await handler({
      input: '/some/path/bundle.tar',
      install: false,
    } as any);

    expect(tar.extract).toHaveBeenCalledWith(
      expect.objectContaining({ cwd: 'bundle' }),
    );
  });
});
