import type { Arguments, CommandBuilder } from 'yargs';
import * as packCmd from './pack';
import * as unpackCmd from './unpack';
import * as setupCmd from './setup';
import * as configureCmd from './configure';

export const command = 'offline';
export const describe = 'Manage offline cache';

export const builder: CommandBuilder = (yargs) =>
  yargs
    .command(packCmd)
    .command(unpackCmd)
    .command(setupCmd)
    .command(configureCmd)
    .demandCommand(1, 'Specify a subcommand: pack, unpack, setup, or configure');

export const handler = async (argv: Arguments): Promise<void> => {
  // no-op; subcommands handle everything
};
