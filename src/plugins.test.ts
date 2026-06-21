import { describe, it, expect } from 'vitest';

const {
  CORE_PLUGINS, JIT_PLUGINS, COMMUNITY_PLUGINS,
  ALL_PLUGINS, CLI_PACKAGE, getPluginsByCategory,
} = await import('./plugins.js');

describe('CLI_PACKAGE', () => {
  it('is the Salesforce CLI package name', () => {
    expect(CLI_PACKAGE).toBe('@salesforce/cli');
  });
});

describe('CORE_PLUGINS', () => {
  it('has 14 core plugins', () => {
    expect(CORE_PLUGINS.length).toBe(14);
  });

  it('includes plugin-org', () => {
    expect(CORE_PLUGINS).toContain('@salesforce/plugin-org');
  });

  it('has unique names', () => {
    const names = new Set(CORE_PLUGINS);
    expect(names.size).toBe(CORE_PLUGINS.length);
  });
});

describe('JIT_PLUGINS', () => {
  it('has 23 JIT plugins', () => {
    expect(JIT_PLUGINS.length).toBe(23);
  });

  it('includes plugin-dev', () => {
    expect(JIT_PLUGINS).toContain('@salesforce/plugin-dev');
  });
});

describe('COMMUNITY_PLUGINS', () => {
  it('has 4 community plugins', () => {
    expect(COMMUNITY_PLUGINS.length).toBe(4);
  });

  it('includes sfdx-git-delta', () => {
    expect(COMMUNITY_PLUGINS).toContain('sfdx-git-delta');
  });
});

describe('ALL_PLUGINS', () => {
  it('contains all plugins combined', () => {
    expect(ALL_PLUGINS.length).toBe(
      CORE_PLUGINS.length + JIT_PLUGINS.length + COMMUNITY_PLUGINS.length,
    );
  });

  it('contains plugins from all categories', () => {
    expect(ALL_PLUGINS).toEqual([...CORE_PLUGINS, ...JIT_PLUGINS, ...COMMUNITY_PLUGINS]);
  });
});

describe('getPluginsByCategory', () => {
  it('returns core plugins', () => {
    expect(getPluginsByCategory('core')).toBe(CORE_PLUGINS);
  });

  it('returns JIT plugins', () => {
    expect(getPluginsByCategory('jit')).toBe(JIT_PLUGINS);
  });

  it('returns community plugins', () => {
    expect(getPluginsByCategory('community')).toBe(COMMUNITY_PLUGINS);
  });

  it('returns all plugins for "all"', () => {
    expect(getPluginsByCategory('all')).toBe(ALL_PLUGINS);
  });

  it('defaults to all for unknown category', () => {
    expect(getPluginsByCategory('unknown' as any)).toBe(ALL_PLUGINS);
  });

  it('plugin lists have no duplicates across categories', () => {
    const core = new Set<string>(CORE_PLUGINS);
    const jit = new Set<string>(JIT_PLUGINS);
    const community = new Set<string>(COMMUNITY_PLUGINS);

    for (const p of core) {
      expect(jit.has(p) || community.has(p)).toBe(false);
    }
    for (const p of jit) {
      expect(core.has(p) || community.has(p)).toBe(false);
    }
    for (const p of community) {
      expect(core.has(p) || jit.has(p)).toBe(false);
    }
  });
});
