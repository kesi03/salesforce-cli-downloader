import * as fs from 'node:fs';
import chalk from 'chalk';
import type { Arguments, CommandBuilder } from 'yargs';
import { CORE_PLUGINS, JIT_PLUGINS, ALL_PLUGINS, CLI_PACKAGE } from '../plugins.js';
import { getPackageVersion } from '../downloader.js';

export const command = 'generate-config';
export const describe = 'Generate a YAML config file with current package versions';

export const builder: CommandBuilder = (yargs) =>
  yargs
    .option('output', {
      alias: 'o',
      describe: 'Output config file path',
      type: 'string',
      default: 'salesforce-cli.yaml',
    })
    .option('category', {
      alias: 'c',
      describe: 'Plugin category to include',
      type: 'string',
      choices: ['core', 'jit', 'all'],
      default: 'core',
    })
    .option('resolve', {
      alias: 'r',
      describe: 'Resolve latest versions from npm',
      type: 'boolean',
      default: false,
    });

export const handler = async (argv: Arguments & {
  output?: string;
  category?: string;
  resolve?: boolean;
}): Promise<void> => {
  let outputName = argv.output || 'salesforce-cli.yaml';
  if (!outputName.endsWith('.yaml') && !outputName.endsWith('.yml')) {
    outputName += '.yaml';
  }

  const categoryMap: Record<string, readonly string[]> = {
    core: CORE_PLUGINS,
    jit: JIT_PLUGINS,
    all: ALL_PLUGINS,
  };

  const pluginList = categoryMap[argv.category || 'core'] || CORE_PLUGINS;

  let cliVersion: string;
  try {
    cliVersion = argv.resolve ? getPackageVersion(CLI_PACKAGE) : 'latest';
  } catch {
    cliVersion = 'latest';
  }

  const lines: string[] = [];
  lines.push(`# Salesforce CLI version (omit or set to 'latest' for latest)`);
  lines.push(`cli-version: ${cliVersion}`);
  lines.push('');
  lines.push(`# List of plugins to download`);
  lines.push(`# Append @version to pin a specific version`);
  lines.push('plugins:');

  for (const plugin of pluginList) {
    let version = 'latest';
    if (argv.resolve) {
      try {
        version = getPackageVersion(plugin);
      } catch {}
    }
    lines.push(`  - "${plugin}@${version}"`);
  }

  if (argv.resolve) {
    console.log(chalk.gray('Resolved versions from npm.'));
  }

  fs.writeFileSync(outputName, lines.join('\n') + '\n', 'utf-8');
  console.log(chalk.green(`Config file created: ${outputName}`));
};
