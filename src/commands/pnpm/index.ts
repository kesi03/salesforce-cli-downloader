import type { Arguments, CommandBuilder } from 'yargs';
import * as packCmd from './pack';
import * as unpackCmd from './unpack';
import * as useCmd from './use';

export const command = 'pnpm';
export const describe = 'Manage pnpm offline cache';

export const builder: CommandBuilder = (yargs) =>
  yargs
    .command(packCmd)
    .command(unpackCmd)
    .command(useCmd)
    .demandCommand(1, 'Specify a subcommand: pack, unpack, or use');

export const handler = async (argv: Arguments): Promise<void> => {
  // no-op; subcommands handle everything
};
