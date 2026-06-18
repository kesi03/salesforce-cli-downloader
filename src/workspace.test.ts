import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

vi.mock('node:fs');

const { getWorkspace, ensureWorkspace, resolveDir } = await import('./workspace.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getWorkspace', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    delete process.env.SALESFORCE_CLI_WORKSPACE;
  });

  it('returns default workspace when env var is not set', () => {
    const result = getWorkspace();
    expect(result).toBe(path.join(process.cwd(), 'sf-cli-workspace'));
  });

  it('returns SALESFORCE_CLI_WORKSPACE env var when set', () => {
    process.env.SALESFORCE_CLI_WORKSPACE = '/custom/workspace';
    expect(getWorkspace()).toBe('/custom/workspace');
  });
});

describe('ensureWorkspace', () => {
  it('creates directory if it does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    ensureWorkspace('/some/workspace');

    expect(fs.existsSync).toHaveBeenCalledWith('/some/workspace');
    expect(fs.mkdirSync).toHaveBeenCalledWith('/some/workspace', { recursive: true });
  });

  it('does nothing if directory exists', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);

    ensureWorkspace('/existing/workspace');

    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });
});

describe('resolveDir', () => {
  it('creates subdirectory and returns its path', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = resolveDir('/base', 'plugins');

    expect(fs.existsSync).toHaveBeenCalledWith(path.join('/base', 'plugins'));
    expect(fs.mkdirSync).toHaveBeenCalledWith(path.join('/base', 'plugins'), { recursive: true });
    expect(result).toBe(path.join('/base', 'plugins'));
  });

  it('does not create if subdirectory already exists', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const result = resolveDir('/base', 'cli');

    expect(fs.mkdirSync).not.toHaveBeenCalled();
    expect(result).toBe(path.join('/base', 'cli'));
  });
});
