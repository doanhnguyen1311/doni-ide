import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { CommandExitEvent, CommandOutputEvent } from '../shared/types';

const COMMAND_TIMEOUT_MS = 2 * 60 * 1000;
let runningProcess: ChildProcessWithoutNullStreams | null = null;
let timeoutHandle: NodeJS.Timeout | null = null;
let activeStartedAt = 0;

function tokenize(command: string): string[] {
  return command
    .toLowerCase()
    .split(/[\s;&|]+/)
    .filter(Boolean);
}

export function validateCommand(command: string): void {
  const trimmed = command.trim();
  if (!trimmed) {
    throw new Error('Enter a command before running verification.');
  }

  const lowerCommand = trimmed.toLowerCase();
  const tokens = tokenize(trimmed);
  const blockedTokens = new Set(['rm', 'del', 'rmdir', 'format', 'shutdown', 'reboot', 'sudo']);
  const blockedToken = tokens.find((token) => blockedTokens.has(token));

  if (blockedToken) {
    throw new Error(`Blocked unsafe command: ${blockedToken}`);
  }
  if (lowerCommand.includes('encodedcommand') || lowerCommand.includes('-encodedcommand')) {
    throw new Error('Blocked unsafe PowerShell encoded command.');
  }
  if (/\bchmod\s+-r\b/i.test(trimmed) || /\bchown\s+-r\b/i.test(trimmed)) {
    throw new Error('Blocked unsafe recursive permission command.');
  }
  if (/\bcurl\b[\s\S]*\|[\s\S]*\bsh\b/i.test(trimmed)) {
    throw new Error('Blocked unsafe curl pipe-to-shell command.');
  }
  if (/\bwget\b[\s\S]*\|[\s\S]*\bsh\b/i.test(trimmed)) {
    throw new Error('Blocked unsafe wget pipe-to-shell command.');
  }
}

async function validateFolder(folderPath: string): Promise<string> {
  const projectRoot = path.resolve(folderPath);
  let stat;
  try {
    stat = await fs.stat(projectRoot);
  } catch {
    throw new Error('Selected project folder does not exist.');
  }
  if (!stat.isDirectory()) {
    throw new Error('Selected project path is not a folder.');
  }
  return projectRoot;
}

function clearRunningState(): void {
  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
  }
  runningProcess = null;
}

export async function runProjectCommand(
  folderPath: string,
  command: string,
  callbacks: {
    onOutput: (event: CommandOutputEvent) => void;
    onError: (message: string) => void;
    onExit: (event: CommandExitEvent) => void;
  },
): Promise<{ startedAt: string }> {
  if (runningProcess) {
    throw new Error('A verification command is already running.');
  }

  validateCommand(command);
  const cwd = await validateFolder(folderPath);
  const startedAt = new Date().toISOString();
  activeStartedAt = Date.now();

  const child = spawn(command, {
    cwd,
    shell: true,
    windowsHide: true,
    env: process.env,
  });
  runningProcess = child;

  child.stdout.on('data', (chunk: Buffer) => callbacks.onOutput({ type: 'stdout', data: chunk.toString(), timestamp: new Date().toISOString() }));
  child.stderr.on('data', (chunk: Buffer) => callbacks.onOutput({ type: 'stderr', data: chunk.toString(), timestamp: new Date().toISOString() }));

  child.on('error', (error) => {
    callbacks.onError(error.message);
  });

  child.on('close', (exitCode, signal) => {
    const durationMs = activeStartedAt ? Date.now() - activeStartedAt : 0;
    clearRunningState();
    callbacks.onExit({
      exitCode,
      signal: signal ?? undefined,
      durationMs,
    });
  });

  timeoutHandle = setTimeout(() => {
    if (!runningProcess) return;
    callbacks.onError('Command timed out after 2 minutes.');
    stopProjectCommand();
  }, COMMAND_TIMEOUT_MS);

  return { startedAt };
}

export function stopProjectCommand(): void {
  if (!runningProcess) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(runningProcess.pid), '/T', '/F'], { windowsHide: true });
    return;
  }
  runningProcess.kill('SIGTERM');
}
