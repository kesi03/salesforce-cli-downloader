import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import chalk from 'chalk';
import type { Arguments, CommandBuilder } from 'yargs';

export const command = 'use';
export const describe = 'Install dependencies from the offline cache (no network)';

export const builder: CommandBuilder = (yargs) =>
  yargs
    .option('dir', {
      alias: 'd',
      describe: 'Directory containing package.json and .npmrc',
      type: 'string',
      default: './pnpm-bundle',
    })
    .option('store-dir', {
      alias: 's',
      describe: 'pnpm store directory for the cache',
      type: 'string',
      default: './offline-cache',
    });

export const handler = async (argv: Arguments & {
  dir?: string;
  storeDir?: string;
}): Promise<void> => {
  const bundleDir = path.resolve(argv.dir || './pnpm-bundle');
  const storeDir = path.resolve(argv.storeDir || './offline-cache');

  const pkgPath = path.join(bundleDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.error(chalk.red(`package.json not found in ${bundleDir}`));
    process.exit(1);
  }

  console.log(chalk.blue('Installing from offline cache...'));
  execSync(`pnpm install --offline --prefix "${bundleDir}" --store-dir "${storeDir}"`, { stdio: 'inherit' });
  console.log(chalk.green('Install complete.'));
};
