export const CORE_PLUGINS = [
  '@salesforce/plugin-org',
  '@salesforce/plugin-data',
  '@salesforce/plugin-apex',
  '@salesforce/plugin-deploy-retrieve',
  '@salesforce/plugin-functions',
  '@salesforce/plugin-packaging',
  '@salesforce/plugin-custom-metadata',
  '@salesforce/plugin-schema',
  '@salesforce/plugin-settings',
  '@salesforce/plugin-telemetry',
  '@salesforce/plugin-trust',
  '@salesforce/plugin-auth',
  '@salesforce/plugin-alias',
  '@salesforce/plugin-config',
] as const;

export const JIT_PLUGINS = [
  '@salesforce/plugin-dev',
  '@salesforce/plugin-templates',
  '@salesforce/plugin-release-management',
  '@salesforce/plugin-code-analyzer',
  '@salesforce/plugin-lightning',
  '@salesforce/plugin-limits',
  '@salesforce/plugin-community',
  '@salesforce/plugin-user',
  '@salesforce/plugin-source',
  '@salesforce/plugin-env',
  '@salesforce/plugin-sobject',
  '@salesforce/plugin-signups',
  '@salesforce/plugin-agent',
  '@salesforce/plugin-explorer',
  '@salesforce/plugin-info',
  '@salesforce/plugin-notifications',
  '@salesforce/plugin-flow',
  '@salesforce/plugin-login',
  '@salesforce/plugin-marketplace',
  '@salesforce/plugin-command-reference',
  '@salesforce/plugin-data-seeding',
  '@salesforce/plugin-lightning-dev',
  '@salesforce/plugin-license-management',
  '@salesforce/plugin-devops-center',
  '@salesforce/plugin-ui-bundle-dev',
  '@salesforce/sfdx-plugin-lwc-test',
] as const;

export const COMMUNITY_PLUGINS = [
  'sfdx-git-delta',
  'sfpowerkit',
  'sfdmu',
  'texei-sfdx-plugin',
] as const;

export const ALL_PLUGINS = [
  ...CORE_PLUGINS,
  ...JIT_PLUGINS,
  ...COMMUNITY_PLUGINS,
] as const;

export const CLI_PACKAGE = '@salesforce/cli';

export type PluginCategory = 'core' | 'jit' | 'community' | 'all';

export function getPluginsByCategory(category: PluginCategory): readonly string[] {
  switch (category) {
    case 'core':
      return CORE_PLUGINS;
    case 'jit':
      return JIT_PLUGINS;
    case 'community':
      return COMMUNITY_PLUGINS;
    case 'all':
    default:
      return ALL_PLUGINS;
  }
}
