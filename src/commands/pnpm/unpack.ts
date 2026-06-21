import * as fs from 'node:fs';
import * as path from 'node:path';
import * as tar from 'tar';
import chalk from 'chalk';
import type { Arguments, CommandBuilder } from 'yargs';

export const command = 'unpack';
export const describe = 'Unpack the pnpm offline cache tarball';

export const builder: CommandBuilder = (yargs) =>
  yargs
    .option('input', {
      alias: 'i',
      describe: 'Offline cache tar archive path',
      type: 'string',
      default: 'offline-cache.tar',
    })
    .option('store-dir', {
      alias: 's',
      describe: 'Target directory for the pnpm store',
      type: 'string',
      default: './offline-cache',
    });

export const handler = async (argv: Arguments & {
  input?: string;
  storeDir?: string;
}): Promise<void> => {
  const inputTar = path.resolve(argv.input || 'offline-cache.tar');
  const storeDir = path.resolve(argv.storeDir || './offline-cache');

  if (!fs.existsSync(inputTar)) {
    console.error(chalk.red(`Archive not found: ${inputTar}`));
    process.exit(1);
  }

  const storeParent = path.dirname(storeDir);
  if (!fs.existsSync(storeParent)) {
    fs.mkdirSync(storeParent, { recursive: true });
  }

  console.log(chalk.blue(`Unpacking ${inputTar} to ${storeDir}...`));
  await tar.extract({
    file: inputTar,
    cwd: storeParent,
    portable: true,
  });
  console.log(chalk.green(`Unpack complete: ${storeDir}`));
};
