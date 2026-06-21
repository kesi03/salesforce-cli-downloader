import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import * as tar from 'tar';
import chalk from 'chalk';
import type { Arguments, CommandBuilder } from 'yargs';

export const command = 'setup';
export const describe = 'Install CLI and plugins from an unpacked bundle';

export const builder: CommandBuilder = (yargs) =>
  yargs
    .option('input', {
      alias: 'i',
      describe: 'Path to the unpacked bundle directory',
      type: 'string',
      default: './smoke-out',
    })
    .option('install-dir', {
      alias: 'd',
      describe: 'Target installation directory',
      type: 'string',
      default: './sf-install',
    });

export const handler = async (argv: Arguments & {
  input: string;
  installDir: string;
}): Promise<void> => {
  const inputDir = path.resolve(argv.input);
  const installDir = path.resolve(argv.installDir);

  if (!fs.existsSync(inputDir)) {
    console.error(chalk.red(`Bundle directory not found: ${inputDir}`));
    process.exit(1);
  }

  const cliDir = path.join(inputDir, 'cli');
  const pluginsDir = path.join(inputDir, 'plugins');

  if (!fs.existsSync(cliDir)) {
    console.error(chalk.red(`CLI directory not found: ${cliDir}`));
    process.exit(1);
  }

  const cliTarballs = fs.readdirSync(cliDir).filter(f => f.endsWith('.tgz'));
  if (cliTarballs.length === 0) {
    console.error(chalk.red('No CLI tarballs found'));
    process.exit(1);
  }

  if (fs.existsSync(installDir)) {
    fs.rmSync(installDir, { recursive: true });
  }
  fs.mkdirSync(installDir, { recursive: true });

  console.log(chalk.blue(`Installing CLI from ${cliTarballs[0]}...`));
  const cliTarball = path.resolve(cliDir, cliTarballs[0]);
  execSync(`npm install --prefix "${installDir}" "${cliTarball}"`, { stdio: 'inherit' });
  console.log(chalk.green('CLI installed.\n'));

  const sfBin = path.join(installDir, 'node_modules', '.bin', process.platform === 'win32' ? 'sf.cmd' : 'sf');

  if (fs.existsSync(pluginsDir)) {
    const pluginTarballs = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.tgz'));
    if (pluginTarballs.length > 0) {
      console.log(chalk.blue(`Installing ${pluginTarballs.length} plugin(s)...`));
      for (const tarball of pluginTarballs) {
        const tarballPath = path.resolve(pluginsDir, tarball);
        console.log(chalk.gray(`  ${tarball}`));
        execSync(`npm install --prefix "${installDir}" "${tarballPath}"`, { stdio: 'inherit' });

        let tmpDir: string | undefined;
        try {
          tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-plugin-'));
          await tar.extract({
            file: tarballPath,
            cwd: tmpDir,
            filter: (p) => p === 'package/package.json',
          });
          const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package', 'package.json'), 'utf-8'));
          const pkgDir = path.join(installDir, 'node_modules', ...pkg.name.split('/'));
          if (fs.existsSync(pkgDir)) {
            execSync(`"${sfBin}" plugins link "${pkgDir}"`, { stdio: 'inherit' });
          }
        } catch {
          console.log(chalk.yellow(`  Warning: could not register plugin: ${tarball}`));
        } finally {
          if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      }
      console.log(chalk.green('All plugins installed.\n'));
    }
  }

  console.log(chalk.green('Setup complete.'));
};
