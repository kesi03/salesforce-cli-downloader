# Salesforce CLI Downloader

Download the Salesforce CLI (`sf`) and plugins into offline tar bundles. Every plugin is an npm package — this tool downloads their tarballs via `npm pack`, pins versions deterministically, and packages everything into a portable archive.

---

## Quick start

```bash
# Install dependencies
pnpm install

# Download the CLI + all core and JIT plugins (uses salesforce-cli.yaml)
pnpm run download

# Package everything into a portable tar archive
pnpm run pack

# Unpack somewhere else
tsx src/index.ts unpack -i sf-cli-bundle.tar -o ./offline-sf
```

The project ships with a `salesforce-cli.yaml` that includes the CLI (`@salesforce/cli`) and
all 37 core + JIT plugins. Running `pnpm run download` with no arguments automatically
detects this file and downloads everything specified in it.

---

## Commands

### `list`

Show known Salesforce CLI plugins grouped by category.

```bash
# Show core + JIT plugins (static list)
tsx src/index.ts list

# Include community plugins (sfdx-git-delta, sfdmu, etc.)
tsx src/index.ts list --all

# Fetch live data from npm registry + plugin marketplace (shows real-time versions)
tsx src/index.ts list --online
```

The `--online` flag queries two sources:

- **npm registry** — searches for all `@salesforce/plugin-*` packages and tags each as `[core]`, `[jit]`, or `[unknown]`
- **Salesforce plugin marketplace** — fetches the curated community plugin list from `salesforcecli/plugin-marketplace` and resolves versions from npm

#### Filtering

When used with `--online`, results can be filtered by source and tag:

```bash
# Only show official Salesforce plugins from npm
tsx src/index.ts list --online --source npm

# Only show community plugins from the plugin marketplace
tsx src/index.ts list --online --source marketplace

# Only show core plugins
tsx src/index.ts list --online --tag core

# Only show JIT and community plugins
tsx src/index.ts list --online --tag jit --tag community

# Combine source and tag filters
tsx src/index.ts list --online --source npm --tag unknown
```

Available `--source` values: `npm`, `marketplace`, `both` (default)

Available `--tag` values: `core`, `jit`, `community`, `unknown` (can be specified multiple times)

---

### `download`

Download the Salesforce CLI and/or plugins via `npm pack`.

When run with no arguments, `download` auto-detects `salesforce-cli.yaml` (or
`salesforce-cli.yml`) in the current directory. The included `salesforce-cli.yaml`
contains all 14 core + 23 JIT plugins, so `pnpm run download` downloads
everything for a standard offline setup.

```bash
# Default download (auto-detects salesforce-cli.yaml)
pnpm run download

# Download from a specific YAML config file
tsx src/index.ts download --config my-plugins.yaml

# Download a specific CLI version
tsx src/index.ts download --cli-version 2.70.7

# Download a plugin category (ignores config file)
tsx src/index.ts download --category jit
tsx src/index.ts download --category all

# Download specific plugins by name
tsx src/index.ts download @salesforce/plugin-org sfdx-git-delta

# Skip downloading the CLI (plugins only)
tsx src/index.ts download --skip-cli
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

Extract a tar bundle and optionally install the CLI.

```bash
# Extract to a directory (named after the archive)
tsx src/index.ts unpack -i sf-cli-bundle.tar

# Extract to a specific path
tsx src/index.ts unpack -i sf-cli-bundle.tar -o /opt/salesforce-cli

# Extract and install the CLI
tsx src/index.ts unpack -i sf-cli-bundle.tar -o ./out --install
```

---

### `offline`

Manage a **pnpm store-based** offline cache. This is an alternative to the
`download`/`pack`/`unpack` approach: instead of downloading individual tarballs, it
uses pnpm to populate a store and ships the raw store directory as a tar archive.

#### `offline configure`

Generate `package.json` and `.npmrc` for the offline bundle. The `package.json` lists
`@salesforce/cli` and plugins as dependencies, ready for `pnpm install`.

```bash
# Generate with all core + JIT plugins
tsx src/index.ts offline configure -d ./pnpm-bundle

# Read plugins from a YAML config file
tsx src/index.ts offline configure -f salesforce-cli.yaml -d ./pnpm-bundle

# Resolve and pin latest versions from npm
tsx src/index.ts offline configure -c all -d ./pnpm-bundle --resolve
```

| Option | Alias | Default | Description |
|---|---|---|---|
| `--dir` | `-d` | `./pnpm-bundle` | Output directory for `package.json` and `.npmrc` |
| `--category` | `-c` | `all` | Plugin category: `core`, `jit`, `all` |
| `--config` | `-f` | — | YAML config file to read plugins from |
| `--resolve` | `-r` | `false` | Resolve latest versions from npm |
| `--store-dir` | `-s` | `./offline-cache` | pnpm store directory |

#### `offline pack`

Generate `package.json`, `.npmrc`, run `pnpm install` to populate the store, and
pack the store directory into a tar archive.

```bash
# Pack all core + JIT plugins into offline-cache.tar
tsx src/index.ts offline pack -c all -s ./offline-cache -o offline-cache.tar

# Use a YAML config file
tsx src/index.ts offline pack -f salesforce-cli.yaml -o offline-cache.tar

# Resolve and pin latest versions
tsx src/index.ts offline pack -c all --resolve -o offline-cache.tar
```

| Option | Alias | Default | Description |
|---|---|---|---|
| `--dir` | `-d` | `./pnpm-bundle` | Output directory for `package.json` and `.npmrc` |
| `--store-dir` | `-s` | `./offline-cache` | pnpm store directory |
| `--category` | `-c` | `all` | Plugin category: `core`, `jit`, `all` |
| `--config` | `-f` | — | YAML config file to read plugins from |
| `--resolve` | `-r` | `false` | Resolve latest versions from npm |
| `--output` | `-o` | `offline-cache.tar` | Output tar archive path |

#### `offline unpack`

Extract the offline cache tar archive to restore the pnpm store.

```bash
tsx src/index.ts offline unpack -i offline-cache.tar -s ./offline-cache
```

| Option | Alias | Default | Description |
|---|---|---|---|
| `--input` | `-i` | `offline-cache.tar` | Offline cache tar archive path |
| `--store-dir` | `-s` | `./offline-cache` | Target directory for the pnpm store |

#### `offline setup`

Install packages from the offline pnpm store (no network required). Reads
`package.json` and `.npmrc` from the bundle directory and runs
`pnpm install --offline` against the local store.

```bash
tsx src/index.ts offline setup -d ./pnpm-bundle -s ./offline-cache
```

| Option | Alias | Default | Description |
|---|---|---|---|
| `--dir` | `-d` | `./pnpm-bundle` | Directory containing `package.json` and `.npmrc` |
| `--store-dir` | `-s` | `./offline-cache` | pnpm store directory |

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

### Default (uses included config)

```bash
# 1. Install deps
pnpm install

# 2. Download CLI + all core/JIT plugins (auto-detects salesforce-cli.yaml)
pnpm run download

# 3. Package into a tar archive
pnpm run pack

# 4. On the target machine, unpack and install
tsx src/index.ts unpack -i sf-cli-bundle.tar -o /opt/sf --install
```

### Custom config

```bash
# 1. Build the tool
pnpm install

# 2. Generate or configure a custom plugin list
tsx src/index.ts generate-config --category all --resolve -o my-config.yaml

# 3. Download everything with pinned versions
tsx src/index.ts download --config my-config.yaml

# 4. Package for offline distribution
tsx src/index.ts pack -o sf-offline.tar

# 5. On the target machine, unpack
tsx src/index.ts unpack -i sf-offline.tar -o /opt/sf --install
```

### Offline cache (pnpm store)

```bash
# 1. Build the tool
pnpm install

# 2. Generate package.json and install into pnpm store, then pack the store
tsx src/index.ts offline pack -c all -s ./offline-cache -o offline-cache.tar

# 3. On the target machine, unpack the store
tsx src/index.ts offline unpack -i offline-cache.tar -s ./offline-cache

# 4. Install from the offline store (no network)
tsx src/index.ts offline setup -d ./pnpm-bundle -s ./offline-cache

# 5. Verify the CLI works
./pnpm-bundle/node_modules/.bin/sf --version
```

---

---

### `serve`

Start an HTTP API server that wraps the `sf` CLI. Each request runs `sf` as a child process and returns the result as JSON.

```bash
# Start on default port 3000
pnpm serve

# Custom port and sf binary path
tsx src/index.ts serve --port 4000 --sf-path /opt/sf-cli/node_modules/.bin/sf
```

#### Endpoints

**`POST /api/sf`**
```bash
curl -X POST http://localhost:3000/api/sf \
  -H "Content-Type: application/json" \
  -d '{"args": ["org", "list", "--json"]}'
```

Response (200):
```json
{
  "stdout": "[{\"attributes\":...}]",
  "stderr": "",
  "exitCode": 0
}
```

On failure (422):
```json
{
  "stdout": "",
  "stderr": "ERROR:...",
  "exitCode": 1
}
```

**`GET /health`**
```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

#### Run via Docker

```bash
# Start the API server on port 3000
pnpm docker:serve
task docker:serve
task docker:serve PORT=4000
```

---

## Docker

The project includes a `Dockerfile` that builds a minimal `node:22-alpine` image with the Salesforce CLI (`sf`) and all core + JIT plugins pre-installed.

### Build

```bash
pnpm docker:build
# or
task docker:build
```

### Run commands

```bash
pnpm docker:command sf --version
# or
task docker:command -- sf --version
```

Omit the command to see the default `sf --version` output:

```bash
pnpm docker:command
```

### Test

Build and verify the image in one step:

```bash
task docker:test
```

This runs the build, then checks `sf --version` and `sf plugins --core` inside the container.

### CI / CD

The `Publish - Docker` workflow (`.github/workflows/publish-docker.yml`) builds, tests, and pushes the image to Docker Hub on every push to `main` and on version tags (`v*`). Published images are tagged with:

| Tag | Example | When |
|---|---|---|
| `latest` | `mockholm/salesforce-cli:latest` | On `main` branch pushes |
| Package version | `mockholm/salesforce-cli:1.0.2` | From `package.json` |
| Build ID | `mockholm/salesforce-cli:build-12345` | GitHub Actions `run_id` |
| Git tag | `mockholm/salesforce-cli:v1.0.0` | On `v*` tags |
| Branch | `mockholm/salesforce-cli:main` | On `main` branch pushes |

The `DOCKER_USERNAME` and `DOCKER_PASSWORD` secrets must be configured in the GitHub repository for publishing to Docker Hub.

---

## Plugin inventory

| Category | Count | Source |
|---|---|---|
| Core (bundled) | 14 | `src/plugins.ts` — `CORE_PLUGINS` |
| JIT (auto-downloaded) | 23 | `src/plugins.ts` — `JIT_PLUGINS` |
| Community | 4 | `src/plugins.ts` — `COMMUNITY_PLUGINS` |
| Total known | 41 | |
| Discoverable via `--online` | ~30+ | npm registry (`@salesforce/plugin-*`) |
| Community via `--online --source marketplace` | ~21 | Salesforce plugin-marketplace repo |
