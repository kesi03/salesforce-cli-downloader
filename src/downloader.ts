import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getProxyEnv } from './proxy.js';

export function downloadPackage(packageName: string, destDir: string): string {
  const result = execSync(`npm pack ${packageName}`, {
    cwd: destDir,
    encoding: 'utf-8',
    env: { ...process.env, ...getProxyEnv() },
  });
  const tarballName = result.trim();
  const tarballPath = path.join(destDir, tarballName);

  if (!fs.existsSync(tarballPath)) {
    throw new Error(`Expected tarball not found: ${tarballPath}`);
  }

  return tarballPath;
}

export function getPackageVersion(packageName: string): string {
  try {
    const result = execSync(`npm view ${packageName} version`, {
      encoding: 'utf-8',
      timeout: 30000,
      env: { ...process.env, ...getProxyEnv() },
    });
    return result.trim();
  } catch {
    return 'unknown';
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}
