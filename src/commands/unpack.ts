import * as fs from 'node:fs';
import * as path from 'node:path';
import * as tar from 'tar';
import chalk from 'chalk';
import type { Arguments, CommandBuilder } from 'yargs';

export const command = 'unpack';
export const describe = 'Unpack a Salesforce CLI bundle tar archive';

export const builder: CommandBuilder = (yargs) =>
  yargs
    .option('input', {
      alias: 'i',
      describe: 'Path to the tar bundle',
      type: 'string',
      demandOption: true,
    })
    .option('output', {
      alias: 'o',
      describe: 'Output directory for extraction',
      type: 'string',
    })
    .option('install', {
      alias: 'n',
      describe: 'Install CLI globally after unpack',
      type: 'boolean',
      default: false,
    });

export const handler = async (argv: Arguments & {
  input: string;
  output?: string;
  install?: boolean;
}): Promise<void> => {
  const inputPath = argv.input;

  if (!fs.existsSync(inputPath)) {
    console.error(chalk.red(`Package not found: ${inputPath}`));
    process.exit(1);
  }

  let outputDir = argv.output;
  if (!outputDir) {
    outputDir = path.basename(inputPath, path.extname(inputPath));
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(chalk.blue(`Unpacking ${inputPath} to ${outputDir}...`));

  await tar.extract({
    file: inputPath,
    cwd: outputDir,
  });

  const cliDir = path.join(outputDir, 'cli');
  const pluginsDir = path.join(outputDir, 'plugins');

  if (fs.existsSync(cliDir)) {
    const cliTarballs = fs.readdirSync(cliDir).filter(f => f.endsWith('.tgz'));
    console.log(chalk.green(`  CLI tarballs: ${cliTarballs.length}`));
    for (const f of cliTarballs) {
      console.log(chalk.gray(`    ${f}`));
    }
  }

  if (fs.existsSync(pluginsDir)) {
    const pluginTarballs = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.tgz'));
    console.log(chalk.green(`  Plugin tarballs: ${pluginTarballs.length}`));
    for (const f of pluginTarballs) {
      console.log(chalk.gray(`    ${f}`));
    }
  }

  console.log(chalk.green(`Unpack complete: ${outputDir}`));

  if (argv.install) {
    const cliTarballs = fs.existsSync(cliDir)
      ? fs.readdirSync(cliDir).filter(f => f.endsWith('.tgz'))
      : [];
    if (cliTarballs.length > 0) {
      const { execSync } = await import('node:child_process');
      const cliTarball = path.resolve(cliDir, cliTarballs[0]);
      console.log(chalk.blue(`Installing CLI from ${cliTarballs[0]}...`));
      execSync(`npm install -g "${cliTarball}"`, { stdio: 'inherit' });
      console.log(chalk.green('CLI installed globally.'));
    }
  }
};
