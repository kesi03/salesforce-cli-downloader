# Agents Notes

This file documents quirks, discoveries, and conventions for this project.

## pnpm run `--` passes literal `--` to the script

`pnpm run <script> -- <args>` passes the `--` as a literal argument to the script, which yargs interprets as "end of options". This breaks all option parsing. In CI, use `pnpm exec tsx src/index.ts <command> <args>` instead.

## `execSync` error messages

`execSync` errors from failed npm commands have the actual error output in `err.stderr` (a Buffer), not in `err.message`. Always use `err.stderr?.toString()` for debugging.

## `vi.stubEnv` with dynamic env reads

Vitest's `vi.stubEnv` modifies `process.env` at runtime. This works correctly with functions that read env dynamically (like `getProxyEnv()`), but won't affect values captured at import time.

## CLI tarball binary path

When installing the Salesforce CLI tarball via `npm install --prefix ./dir ./tarball.tgz`, the `sf` binary ends up at `./dir/node_modules/.bin/sf`.

## tsx in CI

`tsx` is in local `node_modules`, so CI must use `pnpm exec tsx` or `npx tsx` — bare `tsx` will not be found.

## npm transient failures

Some npm packages may fail transiently in CI (e.g., `@salesforce/plugin-apex`). The download command logs `err.stderr` for debugging these failures.
