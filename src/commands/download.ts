import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import type { Arguments, CommandBuilder } from 'yargs';
import { CLI_PACKAGE, getPluginsByCategory } from '../plugins.js';
import { ensureWorkspace, resolveDir } from '../workspace.js';
import { downloadPackage, getPackageVersion, formatBytes } from '../downloader.js';
import { loadConfig, parsePluginSpec } from '../config.js';

const CONFIG_FILES = ['salesforce-cli.yaml', 'salesforce-cli.yml'];

function resolveConfigFile(): string | null {
  for (const f of CONFIG_FILES) {
    if (fs.existsSync(f)) return path.resolve(f);
  }
  return null;
}

function formatExecError(err: any): string {
  const stderr = err.stderr?.toString()?.trim();
  if (stderr) return stderr;
  return err.message;
}

function printFailed(failed: string[]): void {
  if (failed.length > 0) {
    console.error(chalk.yellow(`\n${failed.length} download(s) failed:`));
    for (const name of failed) {
      console.error(chalk.red(`  ${name}`));
    }
  }
}

export const command = 'download [plugins..]';
export const describe = 'Download Salesforce CLI and plugins';

export const builder: CommandBuilder = (yargs) =>
  yargs
    .positional('plugins', {
      describe: 'Specific plugins to download (default: all core)',
      type: 'string',
      array: true,
    })
    .option('config', {
      alias: 'f',
      describe: 'YAML config file with versions',
      type: 'string',
    })
    .option('category', {
      describe: 'Plugin category to download',
      type: 'string',
      choices: ['core', 'jit', 'community', 'all'],
      default: 'core',
    })
    .option('skip-cli', {
      describe: 'Skip downloading the Salesforce CLI itself',
      type: 'boolean',
      default: false,
    })
    .option('cli-version', {
      alias: 'v',
      describe: 'Specific CLI version to download (e.g. 2.70.7)',
      type: 'string',
    });

export const handler = async (argv: Arguments & {
  plugins?: string[];
  config?: string;
  category?: string;
  skipCli?: boolean;
  cliVersion?: string;
  workspace: string;
}): Promise<void> => {
  const workspace = argv.workspace;
  ensureWorkspace(workspace);

  const cliDir = resolveDir(workspace, 'cli');
  const pluginDir = resolveDir(workspace, 'plugins');
  const failed: string[] = [];

  let configArg = argv.config;
  if (!configArg && (!argv.plugins || argv.plugins.length === 0)) {
    const detected = resolveConfigFile();
    if (detected) {
      configArg = detected;
      console.log(chalk.gray(`Detected config: ${detected}`));
    }
  }

  if (configArg) {
    const configPath = path.resolve(configArg);
    if (!fs.existsSync(configPath)) {
      console.error(chalk.red(`Config file not found: ${configPath}`));
      process.exit(1);
    }

    const config = loadConfig(configPath);
    const cliVersion = config['cli-version'] || getPackageVersion(CLI_PACKAGE);

    if (!argv.skipCli) {
      console.log(chalk.blue('Downloading Salesforce CLI...'));
      console.log(chalk.gray(`  ${CLI_PACKAGE}@${cliVersion}`));
      const tarball = downloadPackage(`${CLI_PACKAGE}@${cliVersion}`, cliDir);
      const stats = fs.statSync(tarball);
      console.log(chalk.green(`  Saved: ${path.basename(tarball)} (${formatBytes(stats.size)})`));
    }

    if (config.plugins && config.plugins.length > 0) {
      console.log(chalk.blue(`Downloading ${config.plugins.length} plugin(s) from config...`));
      for (const spec of config.plugins) {
        const { name, version } = parsePluginSpec(spec);
        const pkgSpec = version === 'latest' ? name : `${name}@${version}`;
        console.log(chalk.gray(`  ${pkgSpec}`));
        try {
          const tarball = downloadPackage(pkgSpec, pluginDir);
          const stats = fs.statSync(tarball);
          console.log(chalk.green(`  Saved: ${path.basename(tarball)} (${formatBytes(stats.size)})`));
        } catch (err: any) {
          console.error(chalk.red(`  Failed: ${name}`));
          console.error(chalk.gray(`    ${formatExecError(err)}`));
          failed.push(name);
        }
      }
    }

    console.log(chalk.green('\nDownload complete!'));
    printFailed(failed);
    return;
  }

  if (!argv.skipCli) {
    console.log(chalk.blue('Downloading Salesforce CLI...'));
    const cliVersion = argv.cliVersion || getPackageVersion(CLI_PACKAGE);
    console.log(chalk.gray(`  ${CLI_PACKAGE}@${cliVersion}`));
    const tarball = downloadPackage(`${CLI_PACKAGE}@${cliVersion}`, cliDir);
    const stats = fs.statSync(tarball);
    console.log(chalk.green(`  Saved: ${path.basename(tarball)} (${formatBytes(stats.size)})`));
  }

  let pluginsToDownload: string[];

  if (argv.plugins && argv.plugins.length > 0) {
    pluginsToDownload = argv.plugins;
  } else {
    pluginsToDownload = [...getPluginsByCategory((argv.category as any) || 'core')];
  }

  if (pluginsToDownload.length > 0) {
    console.log(chalk.blue(`Downloading ${pluginsToDownload.length} plugin(s)...`));

    for (const plugin of pluginsToDownload) {
      console.log(chalk.gray(`  ${plugin}`));
      try {
        const tarball = downloadPackage(plugin, pluginDir);
        const stats = fs.statSync(tarball);
        console.log(chalk.green(`  Saved: ${path.basename(tarball)} (${formatBytes(stats.size)})`));
      } catch (err: any) {
        console.error(chalk.red(`  Failed: ${plugin}`));
        console.error(chalk.gray(`    ${formatExecError(err)}`));
        failed.push(plugin);
      }
    }
  }

  console.log(chalk.green('\nDownload complete!'));
  printFailed(failed);
};
