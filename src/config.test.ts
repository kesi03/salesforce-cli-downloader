import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import yaml from 'js-yaml';

vi.mock('node:fs');

const { loadConfig, parsePluginSpec } = await import('./config.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('parsePluginSpec', () => {
  it('parses name@version', () => {
    expect(parsePluginSpec('@salesforce/plugin-org@5.11.10')).toEqual({
      name: '@salesforce/plugin-org',
      version: '5.11.10',
    });
  });

  it('parses scoped package without version', () => {
    expect(parsePluginSpec('@salesforce/plugin-org')).toEqual({
      name: '@salesforce/plugin-org',
      version: 'latest',
    });
  });

  it('parses unscoped package with version', () => {
    expect(parsePluginSpec('sfdx-git-delta@1.2.3')).toEqual({
      name: 'sfdx-git-delta',
      version: '1.2.3',
    });
  });

  it('parses unscoped package without version', () => {
    expect(parsePluginSpec('some-package')).toEqual({
      name: 'some-package',
      version: 'latest',
    });
  });

  it('handles version with prerelease tag', () => {
    expect(parsePluginSpec('pkg@1.0.0-beta.1')).toEqual({
      name: 'pkg',
      version: '1.0.0-beta.1',
    });
  });

  it('returns name with trailing @ for empty version after @', () => {
    expect(parsePluginSpec('pkg@')).toEqual({
      name: 'pkg@',
      version: 'latest',
    });
  });
});

describe('loadConfig', () => {
  it('loads config with cli-version and plugins', () => {
    const data = {
      'cli-version': '2.70.7',
      plugins: ['@salesforce/plugin-org@5.11.10', '@salesforce/plugin-data'],
    };
    vi.mocked(fs.readFileSync).mockReturnValue(yaml.dump(data));

    const result = loadConfig('/path/to/config.yaml');
    expect(result).toEqual({
      'cli-version': '2.70.7',
      plugins: ['@salesforce/plugin-org@5.11.10', '@salesforce/plugin-data'],
    });
  });

  it('loads config with nested cli.version', () => {
    const data = {
      cli: { version: '2.80.0' },
      plugins: ['@salesforce/plugin-apex'],
    };
    vi.mocked(fs.readFileSync).mockReturnValue(yaml.dump(data));

    const result = loadConfig('/path/to/config.yaml');
    expect(result).toEqual({
      'cli-version': '2.80.0',
      plugins: ['@salesforce/plugin-apex'],
    });
  });

  it('nested cli.version overrides top-level cli-version', () => {
    const data = {
      'cli-version': '2.70.0',
      cli: { version: '2.80.0' },
      plugins: [],
    };
    vi.mocked(fs.readFileSync).mockReturnValue(yaml.dump(data));

    const result = loadConfig('/path/to/config.yaml');
    expect(result['cli-version']).toBe('2.80.0');
  });

  it('returns empty config for minimal YAML', () => {
    vi.mocked(fs.readFileSync).mockReturnValue('{}\n');

    const result = loadConfig('/path/to/config.yaml');
    expect(result).toEqual({});
  });

  it('throws for non-object YAML', () => {
    vi.mocked(fs.readFileSync).mockReturnValue('"just a string"\n');

    expect(() => loadConfig('/path/to/config.yaml')).toThrow(
      'Invalid config file: must be a YAML object',
    );
  });

  it('throws if cli-version is not a string', () => {
    vi.mocked(fs.readFileSync).mockReturnValue('cli-version: 123\n');

    expect(() => loadConfig('/path/to/config.yaml')).toThrow(
      'Invalid config: cli-version must be a string',
    );
  });

  it('throws if plugins is not an array', () => {
    vi.mocked(fs.readFileSync).mockReturnValue('plugins: "not-an-array"\n');

    expect(() => loadConfig('/path/to/config.yaml')).toThrow(
      'Invalid config: plugins must be an array of strings',
    );
  });

  it('coerces plugin values to strings', () => {
    vi.mocked(fs.readFileSync).mockReturnValue(yaml.dump({
      plugins: [42, true],
    }));

    const result = loadConfig('/path/to/config.yaml');
    expect(result.plugins).toEqual(['42', 'true']);
  });
});
