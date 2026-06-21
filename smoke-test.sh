#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
SMOKE_DIR="$ROOT_DIR/smoke-test-tmp"

cleanup() {
  echo "Cleaning up..."
  rm -rf "$SMOKE_DIR" "$ROOT_DIR/smoke-test.tar" "$ROOT_DIR/smoke-out" "$ROOT_DIR/sf-install"
}
trap cleanup EXIT

cd "$ROOT_DIR"

echo "=== Listing plugins (online) ==="
pnpm exec tsx src/index.ts list --online

echo ""
echo "=== Downloading plugins ==="
pnpm exec tsx src/index.ts download

echo ""
echo "=== Packing into tar ==="
pnpm exec tsx src/index.ts pack -o smoke-test.tar

echo ""
echo "=== Unpacking tar ==="
pnpm exec tsx src/index.ts unpack -i smoke-test.tar -o ./smoke-out

echo ""
echo "=== Unpacked plugins ==="
ls smoke-out/plugins/

echo ""
echo "=== Installing CLI from tarball ==="
npm install --prefix ./sf-install ./smoke-out/cli/salesforce-cli-*.tgz

echo ""
echo "=== sf version ==="
./sf-install/node_modules/.bin/sf --version

echo ""
echo "=== sf core plugins ==="
./sf-install/node_modules/.bin/sf plugins --core

echo ""
echo "=== Smoke test passed! ==="
