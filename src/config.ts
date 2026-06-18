import * as fs from 'node:fs';
import * as yaml from 'js-yaml';

export interface DownloadConfig {
  'cli-version'?: string;
  plugins?: string[];
}

export function loadConfig(filePath: string): DownloadConfig {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = yaml.load(raw) as any;

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid config file: must be a YAML object');
  }

  const config: DownloadConfig = {};

  if (parsed['cli-version'] !== undefined) {
    if (typeof parsed['cli-version'] !== 'string') {
      throw new Error('Invalid config: cli-version must be a string');
    }
    config['cli-version'] = parsed['cli-version'];
  }

  if (parsed['cli'] !== undefined) {
    if (typeof parsed.cli === 'object' && parsed.cli !== null) {
      if (parsed.cli.version) {
        config['cli-version'] = String(parsed.cli.version);
      }
    }
  }

  if (parsed.plugins !== undefined) {
    if (!Array.isArray(parsed.plugins)) {
      throw new Error('Invalid config: plugins must be an array of strings');
    }
    config.plugins = parsed.plugins.map((p: any) => String(p));
  }

  return config;
}

export interface ParsedSpec {
  name: string;
  version: string;
}

export function parsePluginSpec(spec: string): ParsedSpec {
  const atIdx = spec.lastIndexOf('@');
  if (atIdx <= 0 || atIdx === spec.length - 1) {
    return { name: spec, version: 'latest' };
  }
  return {
    name: spec.slice(0, atIdx),
    version: spec.slice(atIdx + 1),
  };
}
