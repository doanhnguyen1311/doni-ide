import { useEffect, useState } from 'react';
import type { AiSettings } from '../../shared/types';

const emptySettings: AiSettings = { apiBase: '', apiKey: '', model: '' };

export function SettingsPanel(): JSX.Element {
  const [settings, setSettings] = useState<AiSettings>(emptySettings);
  const [status, setStatus] = useState<string | null>(null);
  const [isBusy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window.doni.getSettings !== 'function') {
      setStatus('Electron preload API is outdated. Please fully restart the app, not just React refresh.');
      return;
    }

    void window.doni.getSettings().then(setSettings).catch(() => setStatus('Unable to load AI settings.'));
  }, []);

  const update = (key: keyof AiSettings, value: string): void => setSettings((current) => ({ ...current, [key]: value }));

  const save = async (): Promise<void> => {
    if (typeof window.doni.saveSettings !== 'function') {
      setStatus('Electron preload API is outdated. Please fully restart the app.');
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const saved = await window.doni.saveSettings(settings);
      setSettings(saved);
      setStatus('Settings saved locally.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to save settings.');
    } finally {
      setBusy(false);
    }
  };

  const test = async (): Promise<void> => {
    if (typeof window.doni.testConnection !== 'function') {
      setStatus('Electron preload API is outdated. Please fully restart the app.');
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const result = await window.doni.testConnection(settings);
      setStatus(result.ok ? 'Connection OK.' : result.error ?? 'Connection test failed.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Connection test failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
      <h3 className="font-display text-xl font-semibold text-white">Custom AI Settings</h3>
      <p className="mt-2 text-sm text-slate-500">Stored in Electron userData as ai-settings.json, not localStorage.</p>
      <div className="mt-4 grid gap-3">
        <input className="rounded-2xl border border-white/10 bg-ink/70 px-4 py-3 text-sm outline-none focus:border-mint/60" value={settings.apiBase} onChange={(e) => update('apiBase', e.target.value)} placeholder="API Base URL, e.g. http://localhost:20128/v1" />
        <input className="rounded-2xl border border-white/10 bg-ink/70 px-4 py-3 text-sm outline-none focus:border-mint/60" value={settings.apiKey} onChange={(e) => update('apiKey', e.target.value)} placeholder="API Key" type="password" />
        <input className="rounded-2xl border border-white/10 bg-ink/70 px-4 py-3 text-sm outline-none focus:border-mint/60" value={settings.model} onChange={(e) => update('model', e.target.value)} placeholder="Model name, e.g. gpt-5.5" />
      </div>
      <div className="mt-4 flex gap-3">
        <button disabled={isBusy} onClick={save} className="rounded-full bg-mint px-4 py-2 text-sm font-bold text-ink disabled:opacity-60">Save Settings</button>
        <button disabled={isBusy} onClick={test} className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white hover:border-mint/50 disabled:opacity-60">Test Connection</button>
      </div>
      {status ? <div className="mt-3 text-sm text-skyglass">{status}</div> : null}
    </div>
  );
}
