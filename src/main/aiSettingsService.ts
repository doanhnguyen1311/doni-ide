import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { AiSettings } from '../shared/types';
import { ensureDoniHome, getDoniHomeFile } from './doniHome';

const SETTINGS_FILE = 'ai-settings.json';
const DEFAULT_MAX_CONTEXT_FILES = 10;
const DEFAULT_IGNORE_PATTERNS = ['node_modules', 'dist', 'build', '.git', 'coverage', '.next', '.turbo', '.doni'];

function normalizeCustomModels(settings: Partial<AiSettings>): string[] {
  const modelCandidates = [
    ...(Array.isArray(settings.customModels) ? settings.customModels : []),
    settings.model,
    settings.plannerModel,
    settings.executorModel,
  ];
  return Array.from(new Set(modelCandidates.map((item) => item?.trim()).filter((item): item is string => Boolean(item))));
}

async function getSettingsPath(): Promise<string> {
  return getDoniHomeFile('settings', SETTINGS_FILE);
}

function getLegacySettingsPath(): string {
  return path.join(app.getPath('userData'), SETTINGS_FILE);
}

export async function getAiSettings(): Promise<AiSettings> {
  try {
    const raw = await fs.readFile(await getSettingsPath(), 'utf8').catch(async (error) => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      return fs.readFile(getLegacySettingsPath(), 'utf8');
    });
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    const model = parsed.model ?? '';
    return {
      apiBase: parsed.apiBase ?? '',
      apiKey: parsed.apiKey ?? '',
      model,
      plannerModel: parsed.plannerModel ?? model,
      executorModel: parsed.executorModel ?? model,
      customModels: normalizeCustomModels(parsed),
      executorProvider: parsed.executorProvider === 'codex' ? 'codex' : 'custom',
      maxContextFiles: parsed.maxContextFiles ?? DEFAULT_MAX_CONTEXT_FILES,
      ignorePatterns: Array.isArray(parsed.ignorePatterns) ? parsed.ignorePatterns : DEFAULT_IGNORE_PATTERNS,
      autoBackup: parsed.autoBackup ?? true,
      diffMode: parsed.diffMode === 'split' ? 'split' : 'inline',
      codexSandbox: parsed.codexSandbox === 'workspace-write' ? 'workspace-write' : 'read-only',
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return {
        apiBase: '',
        apiKey: '',
        model: '',
        plannerModel: '',
        executorModel: '',
        customModels: [],
        executorProvider: 'custom',
        maxContextFiles: DEFAULT_MAX_CONTEXT_FILES,
        ignorePatterns: DEFAULT_IGNORE_PATTERNS,
        autoBackup: true,
        diffMode: 'inline',
        codexSandbox: 'read-only',
      };
    }
    throw error;
  }
}

export async function saveAiSettings(settings: AiSettings): Promise<AiSettings> {
  const plannerModel = (settings.plannerModel || settings.model).trim();
  const executorModel = (settings.executorModel || settings.model).trim();
  const normalized: AiSettings = {
    apiBase: settings.apiBase.trim().replace(/\/$/, ''),
    apiKey: settings.apiKey.trim(),
    model: executorModel,
    plannerModel,
    executorModel,
    customModels: normalizeCustomModels({ ...settings, plannerModel, executorModel, model: executorModel }),
    executorProvider: settings.executorProvider === 'codex' ? 'codex' : 'custom',
    maxContextFiles: Math.max(1, Math.min(30, Math.round(settings.maxContextFiles || DEFAULT_MAX_CONTEXT_FILES))),
    ignorePatterns: settings.ignorePatterns?.map((item) => item.trim()).filter(Boolean) ?? DEFAULT_IGNORE_PATTERNS,
    autoBackup: settings.autoBackup !== false,
    diffMode: settings.diffMode === 'split' ? 'split' : 'inline',
    codexSandbox: settings.codexSandbox === 'workspace-write' ? 'workspace-write' : 'read-only',
  };

  await ensureDoniHome();
  await fs.writeFile(await getSettingsPath(), JSON.stringify(normalized, null, 2), 'utf8');
  return normalized;
}

export function validateAiSettings(settings: AiSettings): void {
  if (!settings.apiBase.trim() || !settings.apiKey.trim() || !(settings.model || settings.plannerModel || settings.executorModel).trim()) {
    throw new Error('Thiếu cài đặt AI. Hãy điền URL API Base, Khóa API và ít nhất một tên model.');
  }
}
