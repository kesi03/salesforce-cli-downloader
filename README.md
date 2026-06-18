# Salesforce CLI Downloader

Download the Salesforce CLI (`sf`) and plugins into offline tar bundles. Every plugin is an npm package — this tool downloads their tarballs via `npm pack`, pins versions deterministically, and packages everything into a portable archive.

---

## Quick start

```bash
# Install dependencies
pnpm install && pnpm run build

# List all known plugins
tsx src/index.ts list

# Download the CLI + all core plugins
tsx src/index.ts download

# Package into a tar archive
tsx src/index.ts pack -o sf-cli-bundle.tar

# Unpack somewhere else
tsx src/index.ts unpack -i sf-cli-bundle.tar -o ./offline-sf
```

---

## Commands

### `list`

Show known Salesforce CLI plugins grouped by category.

```bash
# Show core + JIT plugins
tsx src/index.ts list

# Include community plugins (sfdx-git-delta, sfdmu, etc.)
tsx src/index.ts list --all

# Fetch live data from npm registry (shows real-time versions)
tsx src/index.ts list --online
```

The `--online` flag queries `registry.npmjs.org` for all `@salesforce/plugin-*` packages and tags each as `[core]`, `[jit]`, or `[unknown]` so you can discover new plugins.

---

### `download`

Download the Salesforce CLI and/or plugins via `npm pack`.

```bash
# Download CLI + all core plugins (default)
tsx src/index.ts download

# Download a specific CLI version
tsx src/index.ts download --cli-version 2.70.7

# Download a plugin category
tsx src/index.ts download --category jit
tsx src/index.ts download --category all

# Download specific plugins by name
tsx src/index.ts download @salesforce/plugin-org sfdx-git-delta

# Skip downloading the CLI (plugins only)
tsx src/index.ts download --skip-cli

# Download from a YAML config file (pins exact versions)
tsx src/index.ts download --config salesforce-cli.yaml
```

All tarballs land in `<workspace>/cli/` and `<workspace>/plugins/`. Default workspace is `./sf-cli-workspace` (override with `-w` or `SALESFORCE_CLI_WORKSPACE` env var).

---

### `generate-config`

Scaffold a YAML config file with pinned versions.

```bash
# Generate with latest version markers
tsx src/index.ts generate-config -o salesforce-cli.yaml

# Resolve and pin current versions from npm
tsx src/index.ts generate-config -o salesforce-cli.yaml --resolve

# Include a different plugin category
tsx src/index.ts generate-config --category all -o my-config.yaml
```

Example output (`salesforce-cli.yaml`):
```yaml
cli-version: 2.139.6
plugins:
  - "@salesforce/plugin-org@5.11.10"
  - "@salesforce/plugin-data@4.0.108"
  - "@salesforce/plugin-apex@3.9.36"
```

---

### `configure`

Interactive wizard to build a config file. Steps through:

1. Set CLI version
2. Checkbox-select plugins from Core / JIT / Community lists
3. Optionally pin versions from npm
4. View current config at any time
5. Save to `salesforce-cli.yaml`

```bash
tsx src/index.ts configure -o salesforce-cli.yaml
```

The saved YAML works directly with `download --config`.

---

### `pack`

Package downloaded tarballs into a tar archive.

```bash
# Default output: sf-cli-bundle.tar
tsx src/index.ts pack

# Custom output path
tsx src/index.ts pack -o ~/bundles/sf-offline.tar

# Compress with gzip
tsx src/index.ts pack -o sf-cli-bundle.tar.gz --gzip
```

The archive preserves the `cli/` and `plugins/` directory structure from the workspace.

---

### `unpack`

Extract a tar bundle and optionally install the CLI globally.

```bash
# Extract to a directory (named after the archive)
tsx src/index.ts unpack -i sf-cli-bundle.tar

# Extract to a specific path
tsx src/index.ts unpack -i sf-cli-bundle.tar -o /opt/salesforce-cli

# Extract and install the CLI globally
tsx src/index.ts unpack -i sf-cli-bundle.tar -o ./out --install
```

---

## Workspace

The default workspace is `./sf-cli-workspace`. Override with:

```bash
tsx src/index.ts <command> -w /path/to/workspace
# or
export SALESFORCE_CLI_WORKSPACE=/path/to/workspace
```

Layout:
```
sf-cli-workspace/
├── cli/
│   └── salesforce-cli-<version>.tgz
└── plugins/
    ├── salesforce-plugin-org-<version>.tgz
    ├── salesforce-plugin-data-<version>.tgz
    └── ...
```

---

## End-to-end workflow

```bash
# 1. Build the tool
pnpm install && pnpm run build

# 2. Configure what to download (interactive)
tsx src/index.ts configure -o my-config.yaml

# 3. Download everything with pinned versions
tsx src/index.ts download --config my-config.yaml

# 4. Package for offline distribution
tsx src/index.ts pack -o sf-offline.tar

# 5. On the target machine, unpack
tsx src/index.ts unpack -i sf-offline.tar -o /opt/sf --install
```

---

## Plugin inventory

| Category | Count | Source |
|---|---|---|
| Core (bundled) | 14 | `src/plugins.ts` — `CORE_PLUGINS` |
| JIT (auto-downloaded) | 23 | `src/plugins.ts` — `JIT_PLUGINS` |
| Community | 4 | `src/plugins.ts` — `COMMUNITY_PLUGINS` |
| Total known | 41 | |
| Discoverable via `--online` | ~30+ | Queries `@salesforce/plugin-*` from npm |
