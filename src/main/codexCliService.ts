import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import type { CodexCliStatus, RunCodexCliRequest, RunCodexCliResponse } from '../shared/types';

const execFileAsync = promisify(execFile);
const CODEX_TIMEOUT_MS = 10 * 60 * 1000;
const activeCodexChildren = new Set<ReturnType<typeof spawn>>();
let lastCodexUsage: Pick<
  CodexCliStatus,
  | 'remainingPercent'
  | 'remainingSource'
  | 'weeklyRemainingPercent'
  | 'weeklyRemainingSource'
  | 'fiveHourResetAt'
  | 'weeklyResetAt'
  | 'usedPercent'
  | 'usedSource'
  | 'inputTokens'
  | 'outputTokens'
  | 'cachedInputTokens'
  | 'reasoningOutputTokens'
  | 'totalTokens'
  | 'contextWindowTokens'
  | 'lastModel'
  | 'lastRunAt'
  | 'lastExitCode'
  | 'lastDurationMs'
  | 'promptCount'
  | 'authenticated'
  | 'lastProbeAt'
  | 'usageSummary'
> = {
  remainingPercent: null,
  weeklyRemainingPercent: null,
  usedPercent: null,
  promptCount: 0,
};

async function validateFolder(folderPath: string): Promise<string> {
  const projectRoot = path.resolve(folderPath);
  const stat = await fs.stat(projectRoot).catch(() => null);
  if (!stat?.isDirectory()) {
    throw new Error('Selected project folder does not exist.');
  }
  return projectRoot;
}

interface CodexCommand {
  command: string;
  prefixArgs: string[];
  source: string;
}

interface CodexRunCallbacks {
  onOutput?: (type: 'stdout' | 'stderr', data: string) => void;
}

async function resolveCodexCommand(): Promise<CodexCommand> {
  const command = process.platform === 'win32' ? 'where' : 'which';
  const { stdout } = await execFileAsync(command, ['codex']);
  const candidates = stdout.trim().split(/\r?\n/).filter(Boolean);
  if (process.platform === 'win32') {
    const cmdPath = candidates.find((candidate) => candidate.toLowerCase().endsWith('.cmd')) ?? candidates[0];
    if (cmdPath) {
      const codexRoot = path.dirname(cmdPath);
      const nodePath = path.join(codexRoot, 'node.exe');
      const scriptPath = path.join(codexRoot, 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
      const nodeStat = await fs.stat(nodePath).catch(() => null);
      const scriptStat = await fs.stat(scriptPath).catch(() => null);
      if (nodeStat?.isFile() && scriptStat?.isFile()) {
        return { command: nodePath, prefixArgs: [scriptPath], source: cmdPath };
      }
      return { command: cmdPath, prefixArgs: [], source: cmdPath };
    }
    return { command: 'codex.cmd', prefixArgs: [], source: 'codex.cmd' };
  }
  return { command: candidates[0] ?? 'codex', prefixArgs: [], source: candidates[0] ?? 'codex' };
}

async function execCodex(args: string[]): Promise<{ stdout: string; stderr: string }> {
  const resolved = await resolveCodexCommand();
  return execFileAsync(resolved.command, [...resolved.prefixArgs, ...args]);
}

export async function getCodexCliStatus(): Promise<CodexCliStatus> {
  try {
    const resolved = await resolveCodexCommand();
    const { stdout: versionStdout } = await execCodex(['--version']);
    const latestRateLimits = await readLatestCodexRateLimits();
    return {
      available: true,
      source: resolved.source,
      version: versionStdout.trim(),
      ...lastCodexUsage,
      ...latestRateLimits,
    };
  } catch (error) {
    return {
      available: false,
      ...lastCodexUsage,
      error: error instanceof Error ? error.message : 'Codex CLI was not found.',
    };
  }
}

function findRemainingPercent(text: string): { percent: number; source: string } | null {
  const patterns = [
    /(?:remaining|left|quota)[^\d]{0,30}(\d{1,3}(?:\.\d+)?)\s*%/i,
    /(\d{1,3}(?:\.\d+)?)\s*%[^\n]{0,40}(?:remaining|left|quota)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const percent = Number(match[1]);
    if (Number.isFinite(percent) && percent >= 0 && percent <= 100) {
      return { percent, source: match[0].trim() };
    }
  }
  return null;
}

function findUsedPercent(text: string): { percent: number; source: string } | null {
  const patterns = [
    /(?:used|usage|utilized)[^\d]{0,30}(\d{1,3}(?:\.\d+)?)\s*%/i,
    /(\d{1,3}(?:\.\d+)?)\s*%[^\n]{0,40}(?:used|usage|utilized)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const percent = Number(match[1]);
    if (Number.isFinite(percent) && percent >= 0 && percent <= 100) {
      return { percent, source: match[0].trim() };
    }
  }
  return null;
}

function readNumericField(value: unknown, key: string): number | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const child = (value as Record<string, unknown>)[key];
  return typeof child === 'number' && Number.isFinite(child) ? child : undefined;
}

function unixSecondsToIso(value: unknown): string | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? new Date(value * 1000).toISOString() : undefined;
}

function extractRateLimitsFromObject(value: unknown): Partial<CodexCliStatus> | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const rateLimits = record.rate_limits ?? (record.payload && typeof record.payload === 'object' ? (record.payload as Record<string, unknown>).rate_limits : undefined);
  if (!rateLimits || typeof rateLimits !== 'object') return null;

  const limits = rateLimits as Record<string, unknown>;
  const primary = limits.primary && typeof limits.primary === 'object' ? (limits.primary as Record<string, unknown>) : null;
  const secondary = limits.secondary && typeof limits.secondary === 'object' ? (limits.secondary as Record<string, unknown>) : null;
  const primaryUsed = typeof primary?.used_percent === 'number' ? primary.used_percent : undefined;
  const secondaryUsed = typeof secondary?.used_percent === 'number' ? secondary.used_percent : undefined;

  if (typeof primaryUsed !== 'number' && typeof secondaryUsed !== 'number') return null;

  return {
    remainingPercent: typeof primaryUsed === 'number' ? Math.max(0, Math.min(100, 100 - primaryUsed)) : undefined,
    remainingSource: typeof primaryUsed === 'number' ? `5h limit: ${(100 - primaryUsed).toFixed(0)}% left` : undefined,
    weeklyRemainingPercent: typeof secondaryUsed === 'number' ? Math.max(0, Math.min(100, 100 - secondaryUsed)) : undefined,
    weeklyRemainingSource: typeof secondaryUsed === 'number' ? `Weekly limit: ${(100 - secondaryUsed).toFixed(0)}% left` : undefined,
    fiveHourResetAt: unixSecondsToIso(primary?.resets_at),
    weeklyResetAt: unixSecondsToIso(secondary?.resets_at),
  };
}

function extractRateLimits(text: string): Partial<CodexCliStatus> | null {
  let latest: Partial<CodexCliStatus> | null = null;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    try {
      latest = extractRateLimitsFromObject(JSON.parse(trimmed)) ?? latest;
    } catch {
      // Ignore non-event lines.
    }
  }
  return latest;
}

async function collectSessionFiles(folderPath: string, maxFiles = 80): Promise<Array<{ path: string; mtimeMs: number }>> {
  const entries = await fs.readdir(folderPath, { withFileTypes: true }).catch(() => []);
  const files: Array<{ path: string; mtimeMs: number }> = [];
  for (const entry of entries) {
    const entryPath = path.join(folderPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSessionFiles(entryPath, maxFiles)));
      files.sort((a, b) => b.mtimeMs - a.mtimeMs);
      files.splice(maxFiles);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue;
    const stat = await fs.stat(entryPath).catch(() => null);
    if (stat) files.push({ path: entryPath, mtimeMs: stat.mtimeMs });
  }
  return files.sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, maxFiles);
}

async function readLatestCodexRateLimits(): Promise<Partial<CodexCliStatus> | null> {
  const sessionsDir = path.join(os.homedir(), '.codex', 'sessions');
  const files = await collectSessionFiles(sessionsDir);
  for (const file of files) {
    const content = await fs.readFile(file.path, 'utf8').catch(() => '');
    const lines = content.trimEnd().split(/\r?\n/).slice(-300).reverse();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('{') || !trimmed.includes('"rate_limits"')) continue;
      try {
        const status = extractRateLimitsFromObject(JSON.parse(trimmed));
        if (status) return status;
      } catch {
        // Keep scanning older lines/files.
      }
    }
  }
  return null;
}

function extractTokenUsage(text: string): Pick<
  CodexCliStatus,
  'inputTokens' | 'outputTokens' | 'cachedInputTokens' | 'reasoningOutputTokens' | 'totalTokens'
> {
  const usage: Pick<CodexCliStatus, 'inputTokens' | 'outputTokens' | 'cachedInputTokens' | 'reasoningOutputTokens' | 'totalTokens'> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    try {
      const parsed = JSON.parse(trimmed) as { usage?: unknown };
      if (!parsed.usage) continue;
      usage.inputTokens = readNumericField(parsed.usage, 'input_tokens') ?? usage.inputTokens;
      usage.outputTokens = readNumericField(parsed.usage, 'output_tokens') ?? usage.outputTokens;
      usage.cachedInputTokens = readNumericField(parsed.usage, 'cached_input_tokens') ?? usage.cachedInputTokens;
      usage.reasoningOutputTokens = readNumericField(parsed.usage, 'reasoning_output_tokens') ?? usage.reasoningOutputTokens;
      usage.totalTokens =
        readNumericField(parsed.usage, 'total_tokens') ??
        ((usage.inputTokens ?? 0) + (usage.outputTokens ?? 0) + (usage.reasoningOutputTokens ?? 0));
    } catch {
      // Ignore non-event lines.
    }
  }
  return usage;
}

function estimateContextWindowTokens(model?: string): number | undefined {
  const normalized = model?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized.includes('gpt-4.1')) return 1_047_576;
  if (normalized.includes('gpt-5')) return 400_000;
  if (normalized.includes('o3') || normalized.includes('o4')) return 200_000;
  if (normalized.includes('gpt-4o') || normalized.includes('gpt-4-turbo')) return 128_000;
  return undefined;
}

function collectUsageSignals(text: string): string | undefined {
  const signals: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      const visit = (value: unknown, pathParts: string[] = []): void => {
        if (!value || typeof value !== 'object') return;
        for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
          const pathName = [...pathParts, key].join('.');
          if (/(usage|token|quota|rate|limit|remaining)/i.test(pathName) && (typeof child === 'string' || typeof child === 'number' || typeof child === 'boolean')) {
            signals.push(`${pathName}: ${String(child)}`);
          }
          visit(child, [...pathParts, key]);
        }
      };
      visit(parsed);
    } catch {
      // Ignore non-event lines.
    }
  }
  return signals.length ? Array.from(new Set(signals)).slice(0, 8).join(' | ') : undefined;
}

function cleanCodexStderr(stderr: string): string {
  return stderr
    .split(/\r?\n/)
    .filter((line) => line.trim() !== 'Reading additional input from stdin...')
    .join('\n')
    .trim();
}

export async function runCodexCli(request: RunCodexCliRequest, callbacks: CodexRunCallbacks = {}): Promise<RunCodexCliResponse> {
  const cwd = await validateFolder(request.folderPath);
  const prompt = request.prompt.trim();
  if (!prompt) {
    throw new Error('Codex prompt is empty.');
  }

  const startedAt = new Date().toISOString();
  const startedAtMs = Date.now();
  const outputFile = path.join(os.tmpdir(), `doni-codex-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
  const args = [
    'exec',
    '-C',
    cwd,
    '--skip-git-repo-check',
    '-s',
    request.sandbox ?? 'read-only',
    '-o',
    outputFile,
    '--json',
  ];

  if (request.model?.trim()) {
    args.push('-m', request.model.trim());
  }

  args.push('-');
  const resolvedCommand = await resolveCodexCommand();

  return await new Promise<RunCodexCliResponse>((resolve, reject) => {
    const child = spawn(resolvedCommand.command, [...resolvedCommand.prefixArgs, ...args], {
      cwd,
      windowsHide: true,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    activeCodexChildren.add(child);
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      activeCodexChildren.delete(child);
      reject(new Error('Codex CLI timed out after 10 minutes.'));
    }, CODEX_TIMEOUT_MS);

    child.stdout.on('data', (chunk: Buffer) => {
      const data = chunk.toString();
      stdout += data;
      callbacks.onOutput?.('stdout', data);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      const data = chunk.toString();
      stderr += data;
      callbacks.onOutput?.('stderr', data);
    });
    child.stdin.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      activeCodexChildren.delete(child);
      child.kill();
      reject(error);
    });
    child.stdin.end(prompt);
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      activeCodexChildren.delete(child);
      reject(error);
    });
    child.on('close', async (exitCode) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      activeCodexChildren.delete(child);
      const finishedAt = new Date().toISOString();
      const content = await fs.readFile(outputFile, 'utf8').catch(() => stdout || stderr);
      await fs.unlink(outputFile).catch(() => undefined);
      const combinedOutput = `${stdout}\n${stderr}\n${content}`;
      const remaining = findRemainingPercent(combinedOutput);
      const explicitUsed = findUsedPercent(combinedOutput);
      const tokenUsage = extractTokenUsage(stdout);
      const rateLimits = extractRateLimits(stdout);
      const contextWindowTokens = estimateContextWindowTokens(request.model);
      const calculatedUsedPercent =
        typeof tokenUsage.totalTokens === 'number' && typeof contextWindowTokens === 'number'
          ? Math.min(100, Math.max(0, (tokenUsage.totalTokens / contextWindowTokens) * 100))
          : null;
      const usedPercent = explicitUsed?.percent ?? calculatedUsedPercent ?? (typeof remaining?.percent === 'number' ? 100 - remaining.percent : null);
      const usageSummary = collectUsageSignals(stdout);
      lastCodexUsage = {
        remainingPercent: rateLimits?.remainingPercent ?? remaining?.percent ?? lastCodexUsage.remainingPercent ?? null,
        remainingSource: rateLimits?.remainingSource ?? remaining?.source ?? lastCodexUsage.remainingSource,
        weeklyRemainingPercent: rateLimits?.weeklyRemainingPercent ?? lastCodexUsage.weeklyRemainingPercent ?? null,
        weeklyRemainingSource: rateLimits?.weeklyRemainingSource ?? lastCodexUsage.weeklyRemainingSource,
        fiveHourResetAt: rateLimits?.fiveHourResetAt ?? lastCodexUsage.fiveHourResetAt,
        weeklyResetAt: rateLimits?.weeklyResetAt ?? lastCodexUsage.weeklyResetAt,
        usedPercent,
        usedSource:
          explicitUsed?.source ??
          (typeof calculatedUsedPercent === 'number' ? `last run tokens: ${tokenUsage.totalTokens}/${contextWindowTokens}` : undefined),
        ...tokenUsage,
        contextWindowTokens,
        lastModel: request.model?.trim() || undefined,
        lastRunAt: finishedAt,
        lastExitCode: exitCode,
        lastDurationMs: Date.now() - startedAtMs,
        promptCount: (lastCodexUsage.promptCount ?? 0) + 1,
        authenticated: exitCode === 0,
        usageSummary,
      };
      if (exitCode !== 0) {
        reject(new Error(cleanCodexStderr(stderr) || stdout.trim() || `Codex CLI exited with code ${exitCode}.`));
        return;
      }
      resolve({
        content: content.trim(),
        stdout,
        stderr: cleanCodexStderr(stderr),
        exitCode,
        startedAt,
        finishedAt,
      });
    });
  });
}

export function stopCodexCli(): void {
  for (const child of activeCodexChildren) {
    child.kill();
  }
  activeCodexChildren.clear();
}

export async function probeCodexCliStatus(folderPath?: string): Promise<CodexCliStatus> {
  const status = await getCodexCliStatus();
  if (!status.available) return status;

  const cwd = folderPath ? await validateFolder(folderPath) : process.cwd();
  try {
    await runCodexCli({
      folderPath: cwd,
      sandbox: 'read-only',
      prompt: 'Reply with exactly: OK',
    });
    lastCodexUsage = {
      ...lastCodexUsage,
      authenticated: true,
      lastProbeAt: new Date().toISOString(),
    };
  } catch (error) {
    lastCodexUsage = {
      ...lastCodexUsage,
      authenticated: false,
      lastProbeAt: new Date().toISOString(),
    };
    return {
      ...(await getCodexCliStatus()),
      authenticated: false,
      error: error instanceof Error ? error.message : 'Codex probe failed.',
    };
  }

  return getCodexCliStatus();
}
