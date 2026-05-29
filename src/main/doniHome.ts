import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export function getDoniHomePath(): string {
  return path.join(os.homedir(), '.doni');
}

export function getCodexHomePath(): string {
  return path.join(os.homedir(), '.mani');
}

export async function ensureDoniHome(): Promise<string> {
  const doniHome = getDoniHomePath();
  await fs.mkdir(doniHome, { recursive: true });
  if (process.platform === 'win32') {
    await execFileAsync('attrib', ['+h', doniHome]).catch(() => undefined);
  }
  await Promise.all(
    ['auth', 'cache', 'logs', 'settings', 'patch-backups'].map((dir) =>
      fs.mkdir(path.join(doniHome, dir), { recursive: true }),
    ),
  );
  return doniHome;
}

export async function ensureManiHome(): Promise<string> {
  const codexHome = getCodexHomePath();
  await fs.mkdir(codexHome, { recursive: true });
  if (process.platform === 'win32') {
    await execFileAsync('attrib', ['+h', codexHome]).catch(() => undefined);
  }
  await Promise.all(
    ['auth', 'cache', 'logs', 'settings', 'patch-backups'].map((dir) =>
      fs.mkdir(path.join(codexHome, dir), { recursive: true }),
    ),
  );
  return codexHome;
}

export async function getDoniHomeFile(...parts: string[]): Promise<string> {
  return path.join(await ensureDoniHome(), ...parts);
}

export async function getCodexHomeFile(...parts: string[]): Promise<string> {
  return path.join(await ensureManiHome(), ...parts);
}
