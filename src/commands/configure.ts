import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import type { Arguments, CommandBuilder } from 'yargs';
import { CORE_PLUGINS, JIT_PLUGINS, COMMUNITY_PLUGINS, CLI_PACKAGE } from '../plugins.js';
import { DownloadConfig, loadConfig, parsePluginSpec } from '../config.js';
import { getPackageVersion } from '../downloader.js';

const CONFIG_FILES = ['salesforce-cli.yaml', 'salesforce-cli.yml'];

function resolveConfigFile(): string | null {
  for (const f of CONFIG_FILES) {
    if (fs.existsSync(f)) return path.resolve(f);
  }
  return null;
}

export const command = 'configure';
export const describe = 'Interactively configure CLI version and plugins';

export const builder: CommandBuilder = (yargs) =>
  yargs.option('output', {
    alias: 'o',
    describe: 'Output config file path',
    type: 'string',
    default: 'salesforce-cli.yaml',
  });

export const handler = async (argv: Arguments & {
  output?: string;
}): Promise<void> => {
  const { select, Separator, checkbox, input, confirm } = await import('@inquirer/prompts');

  let config: DownloadConfig = {};
  let loadedFrom: string | null = resolveConfigFile();
  if (loadedFrom) {
    try {
      config = loadConfig(loadedFrom);
      console.log(chalk.gray(`Loaded existing config: ${loadedFrom}`));
    } catch {}
  }

  let running = true;

  while (running) {
    const action = await select({
      message: 'Configure Salesforce CLI download:',
      choices: [
        { name: 'Set CLI version', value: 'cli' },
        { name: 'Add plugins', value: 'add' },
        { name: 'Remove plugins', value: 'remove' },
        { name: 'View current config', value: 'view' },
        { name: 'Save and exit', value: 'save' },
        { name: 'Exit without saving', value: 'exit' },
      ],
      pageSize: 10,
    });

    switch (action) {
      case 'cli': {
        const current = config['cli-version'] || 'latest';
        const version = await input({
          message: `CLI version (current: ${current}):`,
          default: current,
          validate: (v: string) => v.trim().length > 0 || 'Version cannot be empty',
        });
        config['cli-version'] = version.trim();
        console.log(chalk.green(`CLI version set to: ${config['cli-version']}`));
        break;
      }

      case 'add': {
        const existing = new Set(config.plugins?.map(p => parsePluginSpec(p).name) || []);

        const coreChoices = CORE_PLUGINS.filter(p => !existing.has(p));
        const jitChoices = JIT_PLUGINS.filter(p => !existing.has(p));
        const communityChoices = COMMUNITY_PLUGINS.filter(p => !existing.has(p));

        if (coreChoices.length === 0 && jitChoices.length === 0 && communityChoices.length === 0) {
          console.log(chalk.yellow('All known plugins are already added.'));
          break;
        }

        const selection = await checkbox({
          message: 'Select plugins to add:',
          choices: [
            ...(coreChoices.length > 0
              ? [new Separator('--- Core ---'), ...coreChoices.map(p => ({ name: p, value: p }))]
              : []),
            ...(jitChoices.length > 0
              ? [new Separator('--- JIT ---'), ...jitChoices.map(p => ({ name: p, value: p }))]
              : []),
            ...(communityChoices.length > 0
              ? [new Separator('--- Community ---'), ...communityChoices.map(p => ({ name: p, value: p }))]
              : []),
          ],
          pageSize: 20,
        });

        if (!config.plugins) config.plugins = [];
        for (const sel of selection) {
          config.plugins.push(sel);
        }

        if (selection.length > 0) {
          const pin = await confirm({
            message: 'Pin specific versions? (resolve from npm)',
            default: false,
          });

          if (pin) {
            for (let i = 0; i < config.plugins.length; i++) {
              const { name } = parsePluginSpec(config.plugins[i]);
              try {
                const version = getPackageVersion(name);
                config.plugins[i] = `${name}@${version}`;
              } catch {}
            }
          }
        }

        console.log(chalk.green(`Added ${selection.length} plugin(s).`));
        break;
      }

      case 'remove': {
        if (!config.plugins || config.plugins.length === 0) {
          console.log(chalk.yellow('No plugins to remove.'));
          break;
        }

        const selection = await checkbox({
          message: 'Select plugins to remove:',
          choices: config.plugins.map(p => {
            const { name, version } = parsePluginSpec(p);
            const label = version === 'latest' ? name : `${name}@${version}`;
            return { name: label, value: p };
          }),
          pageSize: 20,
        });

        config.plugins = config.plugins.filter(p => !selection.includes(p));
        console.log(chalk.green(`Removed ${selection.length} plugin(s).`));
        break;
      }

      case 'view': {
        console.log(chalk.blue('\nCurrent config:'));
        console.log(`  CLI: ${CLI_PACKAGE}@${chalk.gray(config['cli-version'] || 'latest')}`);
        console.log(chalk.blue('  Plugins:'));

        if (!config.plugins || config.plugins.length === 0) {
          console.log(`    ${chalk.gray('(none)')}`);
        } else {
          for (const p of config.plugins) {
            const { name, version } = parsePluginSpec(p);
            const label = version === 'latest' ? name : `${name}@${chalk.gray(version)}`;
            console.log(`    ${label}`);
          }
        }
        console.log('');
        break;
      }

      case 'save': {
        let outputName = argv.output || 'salesforce-cli.yaml';
        if (!outputName.endsWith('.yaml') && !outputName.endsWith('.yml')) {
          outputName += '.yaml';
        }

        const lines: string[] = [];
        lines.push(`cli-version: ${config['cli-version'] || 'latest'}`);
        lines.push('');
        lines.push('plugins:');
        const pluginList = config.plugins || [];
        if (pluginList.length === 0) {
          lines.push('  []');
        } else {
          for (const p of pluginList) {
            const { name, version } = parsePluginSpec(p);
            lines.push(`  - "${name}@${version}"`);
          }
        }

        fs.writeFileSync(outputName, lines.join('\n') + '\n', 'utf-8');
        console.log(chalk.green(`Config saved: ${outputName}`));
        running = false;
        break;
      }

      case 'exit': {
        running = false;
        console.log(chalk.yellow('Exiting without saving.'));
        break;
      }
    }
  }
};
