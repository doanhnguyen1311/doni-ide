import { useEffect, useState } from 'react';
import type { AiNetworkEvent, AiSettings } from '../../shared/types';

const emptySettings: AiSettings = { apiBase: '', apiKey: '', model: '' };

export function SettingsPanel(): JSX.Element {
  const [settings, setSettings] = useState<AiSettings>(emptySettings);
  const [status, setStatus] = useState<string | null>(null);
  const [isBusy, setBusy] = useState(false);
  const [networkEvents, setNetworkEvents] = useState<AiNetworkEvent[]>([]);

  useEffect(() => {
    if (typeof window.doni.getSettings !== 'function') {
      setStatus('Electron preload API is outdated. Please fully restart the app, not just React refresh.');
      return;
    }

    void window.doni.getSettings().then(setSettings).catch(() => setStatus('Unable to load AI settings.'));
    void window.doni.getAiNetworkEvents?.().then(setNetworkEvents).catch(() => undefined);

    if (typeof window.doni.onAiNetworkEvent !== 'function') return;
    return window.doni.onAiNetworkEvent((event) => {
      setNetworkEvents((current) => [event, ...current.filter((item) => item.id !== event.id)].slice(0, 100));
    });
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

  const refreshNetworkEvents = async (): Promise<void> => {
    if (typeof window.doni.getAiNetworkEvents !== 'function') return;
    setNetworkEvents(await window.doni.getAiNetworkEvents());
  };

  const clearNetworkEvents = async (): Promise<void> => {
    if (typeof window.doni.clearAiNetworkEvents !== 'function') return;
    await window.doni.clearAiNetworkEvents();
    setNetworkEvents([]);
  };

  return (
    <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
      <h3 className="font-display text-xl font-semibold text-white">Custom AI Settings</h3>
      <p className="mt-2 text-sm text-slate-500">Stored in Electron userData as ai-settings.json, not localStorage. Session history is stored locally on this computer.</p>
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

      <div className="mt-6 rounded-3xl border border-white/10 bg-ink/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="font-display text-lg font-semibold text-white">AI Network Debug</h4>
            <p className="mt-1 text-sm text-slate-500">Requests are made from Electron main process, so they do not appear in renderer DevTools Network.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={refreshNetworkEvents} className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-white hover:border-mint/50">
              Refresh
            </button>
            <button type="button" onClick={clearNetworkEvents} disabled={!networkEvents.length} className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-white hover:border-ember/50 hover:text-ember disabled:opacity-40">
              Clear
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          {networkEvents.length ? (
            networkEvents.slice(0, 8).map((event) => (
              <div key={event.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-400">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-slate-200">{event.method} {event.url}</span>
                  <span className={event.ok ? 'font-bold text-mint' : 'font-bold text-ember'}>
                    {event.status ?? 'network'}{typeof event.durationMs === 'number' ? ` · ${event.durationMs}ms` : ''}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3">
                  <span>model: {event.model}</span>
                  <span>request: {(event.requestBytes / 1024).toFixed(1)}KB</span>
                  {typeof event.responseBytes === 'number' ? <span>response: {(event.responseBytes / 1024).toFixed(1)}KB</span> : null}
                  <span>{new Date(event.startedAt).toLocaleTimeString()}</span>
                </div>
                {event.error ? <div className="mt-2 text-ember">{event.error}</div> : null}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">
              No AI requests recorded yet. Run Test Connection or Optimize Prompt.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
