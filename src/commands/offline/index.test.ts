import { describe, it, expect, vi, beforeEach } from 'vitest';

const { command, describe: desc, builder } = await import('./index');

describe('offline parent command', () => {
  it('has correct command name', () => {
    expect(command).toBe('offline');
  });

  it('has a description', () => {
    expect(desc).toBeTruthy();
  });

  it('builder registers pack, unpack, setup, configure subcommands', () => {
    const commands: string[] = [];
    const mockYargs = {
      command(cmd: any) {
        commands.push(cmd.command);
        return mockYargs;
      },
      demandCommand(n: number, msg: string) {
        return mockYargs;
      },
    };

    (builder as Function)(mockYargs);

    expect(commands).toContain('pack');
    expect(commands).toContain('unpack');
    expect(commands).toContain('setup');
    expect(commands).toContain('configure');
  });
});
