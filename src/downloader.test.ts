import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

vi.mock('node:child_process');
vi.mock('node:fs');

const { downloadPackage, getPackageVersion, formatBytes } = await import('./downloader.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('formatBytes', () => {
  it('returns "0 B" for 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes correctly', () => {
    expect(formatBytes(500)).toBe('500.00 B');
  });

  it('formats KB correctly', () => {
    expect(formatBytes(2048)).toBe('2.00 KB');
  });

  it('formats MB correctly', () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.00 MB');
  });

  it('formats GB correctly', () => {
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe('3.00 GB');
  });

  it('uses two decimal places', () => {
    expect(formatBytes(1536)).toBe('1.50 KB');
  });
});

describe('downloadPackage', () => {
  it('calls npm pack and returns the tarball path', () => {
    const mockTarball = 'salesforce-plugin-org-1.0.0.tgz';
    vi.mocked(execSync).mockReturnValue(mockTarball);
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const result = downloadPackage('@salesforce/plugin-org', '/tmp/dest');

    expect(execSync).toHaveBeenCalledWith('npm pack @salesforce/plugin-org', expect.objectContaining({
      cwd: '/tmp/dest',
      encoding: 'utf-8',
    }));
    expect(result).toBe(path.join('/tmp/dest', mockTarball));
  });

  it('throws when tarball is not found', () => {
    vi.mocked(execSync).mockReturnValue('pkg.tgz');
    vi.mocked(fs.existsSync).mockReturnValue(false);

    expect(() => downloadPackage('some-pkg', '/tmp/dest')).toThrow(
      'Expected tarball not found',
    );
  });
});

describe('getPackageVersion', () => {
  it('returns the version string from npm view', () => {
    vi.mocked(execSync).mockReturnValue('2.70.7\n');

    const result = getPackageVersion('@salesforce/cli');

    expect(execSync).toHaveBeenCalledWith('npm view @salesforce/cli version', expect.objectContaining({
      encoding: 'utf-8',
      timeout: 30000,
    }));
    expect(result).toBe('2.70.7');
  });

  it('returns "unknown" when npm view fails', () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('command failed');
    });

    const result = getPackageVersion('@salesforce/cli');
    expect(result).toBe('unknown');
  });
});
