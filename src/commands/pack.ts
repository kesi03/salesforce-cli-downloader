import * as fs from 'node:fs';
import * as path from 'node:path';
import * as tar from 'tar';
import chalk from 'chalk';
import type { Arguments, CommandBuilder } from 'yargs';
import { ensureWorkspace } from '../workspace.js';
import { formatBytes } from '../downloader.js';

export const command = 'pack';
export const describe = 'Package downloaded CLI and plugins into a tar archive';

export const builder: CommandBuilder = (yargs) =>
  yargs
    .option('output', {
      alias: 'o',
      describe: 'Output tar archive path',
      type: 'string',
      default: 'sf-cli-bundle.tar',
    })
    .option('gzip', {
      alias: 'z',
      describe: 'Compress with gzip',
      type: 'boolean',
      default: false,
    });

export const handler = async (argv: Arguments & {
  output?: string;
  gzip?: boolean;
  workspace: string;
}): Promise<void> => {
  const workspace = argv.workspace;
  ensureWorkspace(workspace);

  const cliDir = path.join(workspace, 'cli');
  const pluginsDir = path.join(workspace, 'plugins');

  if (!fs.existsSync(cliDir) && !fs.existsSync(pluginsDir)) {
    console.error(chalk.red('Nothing to package. Run "salesforce-cli-downloader download" first.'));
    process.exit(1);
  }

  let outputName = argv.output || 'sf-cli-bundle.tar';

  const outputDir = path.dirname(outputName);
  if (outputDir && outputDir !== '.' && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(chalk.blue('Creating package...'));
  const entries: string[] = [];
  if (fs.existsSync(cliDir)) entries.push('cli');
  if (fs.existsSync(pluginsDir)) entries.push('plugins');

  await tar.create(
    {
      file: outputName,
      cwd: workspace,
      portable: true,
      gzip: argv.gzip,
    },
    entries
  );

  const stats = fs.statSync(outputName);
  console.log(chalk.green(`Package created: ${outputName} (${formatBytes(stats.size)})`));
};
