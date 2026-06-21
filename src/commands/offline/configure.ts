import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import type { Arguments, CommandBuilder } from 'yargs';
import { CORE_PLUGINS, JIT_PLUGINS, ALL_PLUGINS, CLI_PACKAGE } from '../../plugins';
import { getPackageVersion } from '../../downloader';
import { loadConfig, parsePluginSpec } from '../../config';

export const command = 'configure';
export const describe = 'Generate package.json for offline cache';

export const builder: CommandBuilder = (yargs) =>
  yargs
    .option('dir', {
      alias: 'd',
      describe: 'Output directory for package.json and .npmrc',
      type: 'string',
      default: './pnpm-bundle',
    })
    .option('category', {
      alias: 'c',
      describe: 'Plugin category to include (ignored if --config is used)',
      type: 'string',
      choices: ['core', 'jit', 'all'],
      default: 'all',
    })
    .option('config', {
      alias: 'f',
      describe: 'YAML config file to read plugins from',
      type: 'string',
    })
    .option('resolve', {
      alias: 'r',
      describe: 'Resolve latest versions from npm',
      type: 'boolean',
      default: false,
    })
    .option('store-dir', {
      alias: 's',
      describe: 'pnpm store directory for the cache',
      type: 'string',
      default: './offline-cache',
    });

export const handler = async (argv: Arguments & {
  dir?: string;
  category?: string;
  config?: string;
  resolve?: boolean;
  storeDir?: string;
}): Promise<void> => {
  const outputDir = path.resolve(argv.dir || './pnpm-bundle');
  const storeDir = path.resolve(argv.storeDir || './offline-cache');

  let plugins: string[];
  let cliVersion = 'latest';

  if (argv.config) {
    const configPath = path.resolve(argv.config);
    if (!fs.existsSync(configPath)) {
      console.error(chalk.red(`Config file not found: ${configPath}`));
      process.exit(1);
    }
    const config = loadConfig(configPath);
    plugins = config.plugins || [];
    cliVersion = config['cli-version'] || 'latest';
  } else {
    const categoryMap: Record<string, readonly string[]> = {
      core: CORE_PLUGINS,
      jit: JIT_PLUGINS,
      all: ALL_PLUGINS,
    };
    plugins = [...(categoryMap[argv.category || 'all'] || ALL_PLUGINS)];
  }

  if (argv.resolve) {
    try {
      cliVersion = getPackageVersion(CLI_PACKAGE);
    } catch {
      cliVersion = 'latest';
    }
    plugins = plugins.map(p => {
      const { name } = parsePluginSpec(p);
      try {
        return `${name}@${getPackageVersion(name)}`;
      } catch {
        return p;
      }
    });
  }

  const pkg: Record<string, any> = {
    name: 'salesforce-cli-offline-bundle',
    private: true,
    dependencies: {},
  };

  pkg.dependencies[CLI_PACKAGE] = cliVersion === 'latest' ? '*' : cliVersion;
  for (const spec of plugins) {
    const { name, version } = parsePluginSpec(spec);
    pkg.dependencies[name] = version === 'latest' ? '*' : version;
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const pkgPath = path.join(outputDir, 'package.json');
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
  console.log(chalk.green(`Package file created: ${pkgPath}`));

  const npmrcPath = path.join(outputDir, '.npmrc');
  fs.writeFileSync(npmrcPath, '', 'utf-8');
  console.log(chalk.green(`npmrc created: ${npmrcPath}`));
};
