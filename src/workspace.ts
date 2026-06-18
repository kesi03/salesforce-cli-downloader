import * as fs from 'node:fs';
import * as path from 'node:path';

export function getWorkspace(): string {
  return process.env.SALESFORCE_CLI_WORKSPACE || path.join(process.cwd(), 'sf-cli-workspace');
}

export function ensureWorkspace(workspace: string): void {
  if (!fs.existsSync(workspace)) {
    fs.mkdirSync(workspace, { recursive: true });
  }
}

export function resolveDir(workspace: string, sub: string): string {
  const dir = path.join(workspace, sub);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
