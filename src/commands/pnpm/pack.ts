import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import * as tar from 'tar';
import chalk from 'chalk';
import type { Arguments, CommandBuilder } from 'yargs';
import { CORE_PLUGINS, JIT_PLUGINS, ALL_PLUGINS, CLI_PACKAGE } from '../../plugins';
import { getPackageVersion, formatBytes } from '../../downloader';
import { loadConfig, parsePluginSpec } from '../../config';

export const command = 'pack';
export const describe = 'Pack a pnpm offline cache: generate package.json, install, prune, fetch, pack';

export const builder: CommandBuilder = (yargs) =>
  yargs
    .option('dir', {
      alias: 'd',
      describe: 'Output directory for package.json and .npmrc',
      type: 'string',
      default: './pnpm-bundle',
    })
    .option('store-dir', {
      alias: 's',
      describe: 'pnpm store directory for the cache',
      type: 'string',
      default: './offline-cache',
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
    .option('output', {
      alias: 'o',
      describe: 'Output tar archive path for the cache',
      type: 'string',
      default: 'offline-cache.tar',
    });

export const handler = async (argv: Arguments & {
  dir?: string;
  storeDir?: string;
  category?: string;
  config?: string;
  resolve?: boolean;
  output?: string;
}): Promise<void> => {
  const bundleDir = path.resolve(argv.dir || './pnpm-bundle');
  const storeDir = path.resolve(argv.storeDir || './offline-cache');
  const outputTar = argv.output || 'offline-cache.tar';

  // ── Step 1: generate package.json ──
  console.log(chalk.blue('Generating package.json...'));

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

  if (!fs.existsSync(bundleDir)) {
    fs.mkdirSync(bundleDir, { recursive: true });
  }

  const pkgPath = path.join(bundleDir, 'package.json');
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
  console.log(chalk.green(`  Package file: ${pkgPath}`));

  const npmrcPath = path.join(bundleDir, '.npmrc');
  fs.writeFileSync(npmrcPath, `store-dir=${storeDir}\n`, 'utf-8');
  console.log(chalk.green(`  npmrc: ${npmrcPath}`));

  // ── Step 2: pnpm install ──
  console.log(chalk.blue('\nInstalling packages into store...'));
  execSync(`pnpm install --prefix "${bundleDir}" --store-dir "${storeDir}"`, { stdio: 'inherit' });
  console.log(chalk.green('  Install complete.'));

  // ── Step 3: pnpm store prune ──
  console.log(chalk.blue('\nPruning store for portability...'));
  execSync(`pnpm store prune --store-dir "${storeDir}"`, { stdio: 'inherit' });
  console.log(chalk.green('  Prune complete.'));

  // ── Step 4: pnpm fetch ──
  console.log(chalk.blue('\nPre-downloading all deps to store...'));
  execSync(`pnpm fetch --prefix "${bundleDir}" --store-dir "${storeDir}"`, { stdio: 'inherit' });
  console.log(chalk.green('  Fetch complete.'));

  // ── Step 5: tar the store ──
  console.log(chalk.blue('\nPacking offline cache...'));
  const tarDir = path.dirname(storeDir);
  const storeBase = path.basename(storeDir);
  const outputDir = path.dirname(path.resolve(outputTar));
  if (outputDir && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  await tar.create(
    { file: outputTar, cwd: tarDir, portable: true, gzip: false },
    [storeBase],
  );
  const stats = fs.statSync(outputTar);
  console.log(chalk.green(`  Archive: ${outputTar} (${formatBytes(stats.size)})`));
  console.log(chalk.green('\npnpm offline cache built successfully.'));
};
