import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

vi.mock('node:fs');
vi.mock('../downloader.js');
vi.mock('../workspace.js');

const { command, describe: desc, builder } = await import('./download.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('download command', () => {
  it('has correct command name', () => {
    expect(command).toBe('download [plugins..]');
  });

  it('has a description', () => {
    expect(desc).toBeTruthy();
  });

  it('builder defines config, category, skip-cli, cli-version options', () => {
    let built: Record<string, any> = {};
    const mockYargs = {
      option(key: string, opts: any) {
        built[key] = opts;
        return mockYargs;
      },
      positional(key: string, opts: any) {
        return mockYargs;
      },
    };

    builder(mockYargs as any);

    expect(built).toHaveProperty('config');
    expect(built).toHaveProperty('category');
    expect(built).toHaveProperty('skip-cli');
    expect(built).toHaveProperty('cli-version');
    expect(built.category.default).toBe('core');
    expect(built['skip-cli'].default).toBe(false);
  });
});
