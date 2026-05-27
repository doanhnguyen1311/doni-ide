import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { AiSettings } from '../shared/types';

const SETTINGS_FILE = 'ai-settings.json';

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), SETTINGS_FILE);
}

export async function getAiSettings(): Promise<AiSettings> {
  try {
    const raw = await fs.readFile(getSettingsPath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    return {
      apiBase: parsed.apiBase ?? '',
      apiKey: parsed.apiKey ?? '',
      model: parsed.model ?? '',
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return { apiBase: '', apiKey: '', model: '' };
    }
    throw error;
  }
}

export async function saveAiSettings(settings: AiSettings): Promise<AiSettings> {
  const normalized: AiSettings = {
    apiBase: settings.apiBase.trim().replace(/\/$/, ''),
    apiKey: settings.apiKey.trim(),
    model: settings.model.trim(),
  };

  await fs.mkdir(app.getPath('userData'), { recursive: true });
  await fs.writeFile(getSettingsPath(), JSON.stringify(normalized, null, 2), 'utf8');
  return normalized;
}

export function validateAiSettings(settings: AiSettings): void {
  if (!settings.apiBase.trim() || !settings.apiKey.trim() || !settings.model.trim()) {
    throw new Error('Missing API settings. Please fill API Base URL, API Key, and Model name.');
  }
}
