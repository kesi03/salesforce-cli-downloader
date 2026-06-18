#!/usr/bin/env node
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { getWorkspace } from './workspace.js';
import * as download from './commands/download.js';
import * as list from './commands/list.js';
import * as pack from './commands/pack.js';
import * as unpack from './commands/unpack.js';
import * as generateConfig from './commands/generate-config.js';
import * as configure from './commands/configure.js';

const argv = yargs(hideBin(process.argv))
  .scriptName('salesforce-cli-downloader')
  .usage('$0 <command> [options]')
  .option('workspace', {
    alias: 'w',
    describe: 'Workspace directory (default: sf-cli-workspace, or SALESFORCE_CLI_WORKSPACE env)',
    type: 'string',
    default: getWorkspace(),
    global: true,
  })
  .command(download as any)
  .command(list as any)
  .command(pack as any)
  .command(unpack as any)
  .command(generateConfig as any)
  .command(configure as any)
  .demandCommand(1, 'Please specify a command')
  .help()
  .alias('help', 'h')
  .version('1.0.0')
  .alias('version', 'V')
  .parse();
