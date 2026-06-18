import chalk from 'chalk';
import type { Arguments, CommandBuilder } from 'yargs';
import {
  CORE_PLUGINS, JIT_PLUGINS, COMMUNITY_PLUGINS,
  ALL_PLUGINS, CLI_PACKAGE,
} from '../plugins.js';
import { proxyFetch } from '../proxy.js';

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

const KNOWN: Set<string> = new Set(ALL_PLUGINS);
const CORE: Set<string> = new Set(CORE_PLUGINS);
const JIT: Set<string> = new Set(JIT_PLUGINS);

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
      describe: 'Fetch live plugin list from npm registry',
      type: 'boolean',
      default: false,
    });

function tag(pkg: string): string {
  if (CORE.has(pkg)) return chalk.blue('[core]');
  if (JIT.has(pkg)) return chalk.magenta('[jit]');
  return chalk.gray('[community]');
}

export const handler = async (argv: Arguments & {
  all?: boolean;
  online?: boolean;
}): Promise<void> => {
  if (argv.online) {
    console.log(chalk.blue('Fetching plugin list from npm registry...\n'));

    const results: [string, string][] = [];

    try {
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
    } catch {
      console.error(chalk.red('Failed to fetch plugin list from npm registry.'));
      return;
    }

    if (results.length === 0) {
      console.error(chalk.red('No plugins found.'));
      return;
    }

    results.sort((a, b) => a[0].localeCompare(b[0]));

    for (const [name, version] of results) {
      const known = KNOWN.has(name) ? tag(name) : chalk.red('[unknown]');
      console.log(`  ${name}@${chalk.gray(version)} ${known}`);
    }
    return;
  }

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
  console.log(chalk.gray('Use --online to fetch live data from npm registry'));
};
