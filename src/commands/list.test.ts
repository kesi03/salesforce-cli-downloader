import { describe, it, expect } from 'vitest';

const { command, describe: desc, builder } = await import('./list.js');

describe('list command', () => {
  it('has correct command name', () => {
    expect(command).toBe('list');
  });

  it('has a description', () => {
    expect(desc).toBeTruthy();
  });

  it('builder defines --all and --online options', () => {
    let built: any = null;
    const mockYargs = {
      option(key: string, opts: any) {
        if (!built) built = {};
        built[key] = opts;
        return mockYargs;
      },
    };

    (builder as Function)(mockYargs);

    expect(built).toHaveProperty('all');
    expect(built).toHaveProperty('online');
    expect(built).toHaveProperty('source');
    expect(built).toHaveProperty('tag');
    expect(built.all.default).toBe(false);
    expect(built.online.default).toBe(false);
    expect(built.source.default).toBe('both');
    expect(built.source.choices).toEqual(['npm', 'marketplace', 'both']);
    expect(built.tag.default).toEqual([]);
    expect(built.tag.choices).toEqual(['core', 'jit', 'community', 'unknown']);
  });
});
