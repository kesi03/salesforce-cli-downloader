import chalk from 'chalk';
import type { Arguments, CommandBuilder } from 'yargs';
import {
  CORE_PLUGINS, JIT_PLUGINS, COMMUNITY_PLUGINS,
  ALL_PLUGINS, CLI_PACKAGE,
} from '../plugins.js';
import { proxyFetch } from '../proxy.js';

const COMMUNITY_PLUGINS_URL = 'https://raw.githubusercontent.com/salesforcecli/plugin-marketplace/main/src/shared/plugins.ts';

interface NpmSearchResult {
  name: string;
  scope: string;
  version: string;
  description: string;
  keywords?: string[];
  date: string;
}

interface NpmSearchResponse {
  objects: { package: NpmSearchResult }[];
  total: number;
}

interface NpmPackageInfo {
  name: string;
  version: string;
  description: string;
}

type Source = 'official' | 'community';
type Tag = 'core' | 'jit' | 'community' | 'unknown';

const KNOWN: Set<string> = new Set(ALL_PLUGINS);
const CORE: Set<string> = new Set(CORE_PLUGINS);
const JIT: Set<string> = new Set(JIT_PLUGINS);

const TAG_ORDER: Tag[] = ['core', 'jit', 'community', 'unknown'];

export const command = 'list';
export const describe = 'List available Salesforce CLI plugins';

export const builder: CommandBuilder = (yargs) =>
  yargs
    .option('all', {
      alias: 'a',
      describe: 'Show all plugins including community',
      type: 'boolean',
      default: false,
    })
    .option('online', {
      alias: 'o',
      describe: 'Fetch live plugin list from npm registry and Salesforce plugin marketplace',
      type: 'boolean',
      default: false,
    })
    .option('source', {
      alias: 's',
      describe: 'Filter by source (when --online is used)',
      type: 'string',
      choices: ['npm', 'marketplace', 'both'] as const,
      default: 'both',
    })
    .option('tag', {
      alias: 't',
      describe: 'Filter by tag(s) (when --online is used)',
      type: 'string',
      array: true,
      choices: ['core', 'jit', 'community', 'unknown'] as const,
      default: [] as string[],
    });

function resolveTag(pkg: string, source: Source): Tag {
  if (source === 'community') return 'community';
  if (CORE.has(pkg)) return 'core';
  if (JIT.has(pkg)) return 'jit';
  return 'unknown';
}

function tagLabel(tag: Tag): string {
  switch (tag) {
    case 'core': return chalk.blue('[core]');
    case 'jit': return chalk.magenta('[jit]');
    case 'community': return chalk.gray('[community]');
    case 'unknown': return chalk.red('[unknown]');
  }
}

async function fetchNpmPluginResults(): Promise<[string, string][]> {
  const results: [string, string][] = [];
  const url = 'https://registry.npmjs.org/-/v1/search?text=scope:@salesforce+plugin&size=250';
  const res = await proxyFetch(url);
  const data = await res.json() as NpmSearchResponse;
  for (const o of data.objects) {
    const pkg = o.package;
    if (pkg.name.startsWith('@babel/') || pkg.name.startsWith('@types/') ||
        pkg.name.startsWith('@typescript-eslint/') || pkg.name === '@salesforce/cli' ||
        pkg.name === '@salesforce/plugin-api') {
      continue;
    }
    if (pkg.name.startsWith('@salesforce/plugin-')) {
      results.push([pkg.name, pkg.version]);
    }
  }
  return results;
}

async function fetchCommunityPluginNames(): Promise<string[]> {
  const res = await proxyFetch(COMMUNITY_PLUGINS_URL);
  const raw = await res.text();
  const match = raw.match(/export\s+const\s+packages\s*=\s*\[([\s\S]*?)\];/);
  if (!match) return [];
  const lines = match[1].split('\n').map(l => l.trim()).filter(Boolean);
  return lines.map(l => l.replace(/^['"]|['"],?$/g, '').trim()).filter(Boolean);
}

async function fetchPackageVersion(name: string): Promise<string> {
  const res = await proxyFetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`);
  const data = await res.json() as NpmPackageInfo;
  return data.version;
}

function printStaticList(argv: Arguments & { all?: boolean }): void {
  console.log(chalk.blue('Salesforce CLI Package:'));
  console.log(`  ${CLI_PACKAGE}\n`);

  console.log(chalk.blue('Core Plugins (bundled with CLI):'));
  for (const p of CORE_PLUGINS) {
    console.log(`  ${p}`);
  }

  console.log(chalk.blue('\nJIT Plugins (auto-downloaded on first use):'));
  for (const p of JIT_PLUGINS) {
    console.log(`  ${p}`);
  }

  if (argv.all) {
    console.log(chalk.blue('\nCommunity Plugins:'));
    for (const p of COMMUNITY_PLUGINS) {
      console.log(`  ${p}`);
    }
  }

  console.log(chalk.gray(`\nTotal: ${ALL_PLUGINS.length} plugins (static list)`));
  console.log(chalk.gray('Use --online to fetch live data from npm registry + plugin marketplace'));
}

export const handler = async (argv: Arguments & {
  all?: boolean;
  online?: boolean;
  source?: string;
  tag?: string[];
}): Promise<void> => {
  if (!argv.online) {
    printStaticList(argv);
    return;
  }

  const sourceFilter = argv.source || 'both';
  const tagFilter = argv.tag || [];
  const results: { name: string; version: string; source: Source; tag: Tag }[] = [];

  try {
    const [npmPlugins, communityNames] = await Promise.all([
      sourceFilter === 'marketplace' ? Promise.resolve([]) : fetchNpmPluginResults(),
      sourceFilter === 'npm' ? Promise.resolve([]) : fetchCommunityPluginNames(),
    ]);

    for (const [name, version] of npmPlugins) {
      results.push({ name, version, source: 'official', tag: resolveTag(name, 'official') });
    }

    const communityVersions = await Promise.all(
      communityNames.map(async (name) => {
        try {
          const version = await fetchPackageVersion(name);
          return { name, version, source: 'community' as Source, tag: 'community' as Tag };
        } catch {
          return { name, version: 'unknown', source: 'community' as Source, tag: 'community' as Tag };
        }
      })
    );
    results.push(...communityVersions);
  } catch {
    console.error(chalk.red('Failed to fetch plugin list.'));
    return;
  }

  if (results.length === 0) {
    console.error(chalk.red('No plugins found.'));
    return;
  }

  const filtered = tagFilter.length > 0
    ? results.filter(r => tagFilter.includes(r.tag))
    : results;

  if (filtered.length === 0) {
    const tags = tagFilter.join(', ');
    console.error(chalk.red(`No plugins match the filter tag(s): ${tags}`));
    return;
  }

  filtered.sort((a, b) => {
    const ta = TAG_ORDER.indexOf(a.tag);
    const tb = TAG_ORDER.indexOf(b.tag);
    if (ta !== tb) return ta - tb;
    return a.name.localeCompare(b.name);
  });

  let lastTag: Tag | null = null;
  for (const { name, version, tag } of filtered) {
    if (tag !== lastTag) {
      console.log();
      lastTag = tag;
    }
    console.log(`  ${name}@${chalk.gray(version)} ${tagLabel(tag)}`);
  }

  const npmCount = filtered.filter(r => r.source === 'official').length;
  const communityCount = filtered.filter(r => r.source === 'community').length;
  console.log(chalk.gray(`\nTotal: ${filtered.length} plugins (${npmCount} official, ${communityCount} community)`));
  if (sourceFilter !== 'both' || tagFilter.length > 0) {
    const parts: string[] = [];
    if (sourceFilter !== 'both') parts.push(`source: ${sourceFilter}`);
    if (tagFilter.length > 0) parts.push(`tags: ${tagFilter.join(', ')}`);
    console.log(chalk.gray(`Filtered by ${parts.join(', ')}`));
  }
};
