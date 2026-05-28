import { useEffect, useState } from 'react';
import type { AiNetworkEvent, AiSettings, CodexCliStatus } from '../../shared/types';

const emptySettings: AiSettings = {
  apiBase: '',
  apiKey: '',
  model: '',
  plannerModel: '',
  executorModel: '',
  maxContextFiles: 10,
  ignorePatterns: ['node_modules', 'dist', 'build', '.git', 'coverage', '.next', '.turbo', '.doni'],
  autoBackup: true,
  diffMode: 'inline',
  codexSandbox: 'read-only',
};

export function SettingsPanel(): JSX.Element {
  const [settings, setSettings] = useState<AiSettings>(emptySettings);
  const [status, setStatus] = useState<string | null>(null);
  const [isBusy, setBusy] = useState(false);
  const [networkEvents, setNetworkEvents] = useState<AiNetworkEvent[]>([]);
  const [codexStatus, setCodexStatus] = useState<CodexCliStatus | null>(null);

  useEffect(() => {
    if (typeof window.doni.getSettings !== 'function') {
      setStatus('Electron preload API đã cũ. Hãy khởi động lại toàn bộ app, không chỉ refresh React.');
      return;
    }

    void window.doni.getSettings().then(setSettings).catch(() => setStatus('Không thể tải cài đặt AI.'));
    void window.doni.getAiNetworkEvents?.().then(setNetworkEvents).catch(() => undefined);
    void window.doni.getCodexCliStatus?.().then(setCodexStatus).catch(() => undefined);

    if (typeof window.doni.onAiNetworkEvent !== 'function') return;
    return window.doni.onAiNetworkEvent((event) => {
      setNetworkEvents((current) => [event, ...current.filter((item) => item.id !== event.id)].slice(0, 100));
    });
  }, []);

  const update = (key: keyof AiSettings, value: string): void => setSettings((current) => ({ ...current, [key]: value }));
  const updateNumber = (key: keyof AiSettings, value: number): void => setSettings((current) => ({ ...current, [key]: value }));
  const updateBoolean = (key: keyof AiSettings, value: boolean): void => setSettings((current) => ({ ...current, [key]: value }));

  const save = async (): Promise<void> => {
    if (typeof window.doni.saveSettings !== 'function') {
      setStatus('Electron preload API đã cũ. Hãy khởi động lại toàn bộ app.');
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const saved = await window.doni.saveSettings(settings);
      setSettings(saved);
      setStatus('Đã lưu cài đặt cục bộ.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Không thể lưu cài đặt.');
    } finally {
      setBusy(false);
    }
  };

  const test = async (): Promise<void> => {
    if (typeof window.doni.testConnection !== 'function') {
      setStatus('Electron preload API đã cũ. Hãy khởi động lại toàn bộ app.');
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const result = await window.doni.testConnection(settings);
      setStatus(result.ok ? 'Kết nối OK.' : result.error ?? 'Kiểm tra kết nối thất bại.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Kiểm tra kết nối thất bại.');
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

  const refreshCodexStatus = async (): Promise<void> => {
    if (typeof window.doni.getCodexCliStatus !== 'function') return;
    setCodexStatus(await window.doni.getCodexCliStatus());
  };

  return (
    <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
      <h3 className="font-display text-xl font-semibold text-white">Điều phối model</h3>
      <p className="mt-2 text-sm text-slate-500">Dùng model lập kế hoạch nhanh, rẻ để phân tích và model executor mạnh hơn cho thay đổi code.</p>
      <div className="mt-4 grid gap-3">
        <input className="rounded-2xl border border-white/10 bg-ink/70 px-4 py-3 text-sm outline-none focus:border-mint/60" value={settings.apiBase} onChange={(e) => update('apiBase', e.target.value)} placeholder="URL API Base, ví dụ http://localhost:20128/v1" />
        <input className="rounded-2xl border border-white/10 bg-ink/70 px-4 py-3 text-sm outline-none focus:border-mint/60" value={settings.apiKey} onChange={(e) => update('apiKey', e.target.value)} placeholder="Khóa API" type="password" />
        <input className="rounded-2xl border border-white/10 bg-ink/70 px-4 py-3 text-sm outline-none focus:border-mint/60" value={settings.plannerModel} onChange={(e) => update('plannerModel', e.target.value)} placeholder="Model A lập kế hoạch, ví dụ gpt-5.4-mini, gemini-flash, claude-haiku" />
        <input className="rounded-2xl border border-white/10 bg-ink/70 px-4 py-3 text-sm outline-none focus:border-mint/60" value={settings.executorModel} onChange={(e) => update('executorModel', e.target.value)} placeholder="Model B executor, ví dụ gpt-5.5, claude-opus, gemini-pro" />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <label className="rounded-2xl border border-white/10 bg-ink/50 p-4 text-sm text-slate-300">
          <span className="font-semibold text-white">Số tệp ngữ cảnh tối đa</span>
          <input
            type="number"
            min={1}
            max={30}
            value={settings.maxContextFiles}
            onChange={(event) => updateNumber('maxContextFiles', Number(event.target.value))}
            className="mt-3 w-full rounded-xl border border-white/10 bg-ink/70 px-3 py-2 outline-none focus:border-mint/60"
          />
        </label>
        <label className="rounded-2xl border border-white/10 bg-ink/50 p-4 text-sm text-slate-300">
          <span className="font-semibold text-white">Kiểu diff</span>
          <select
            value={settings.diffMode}
            onChange={(event) => update('diffMode', event.target.value)}
            className="mt-3 w-full rounded-xl border border-white/10 bg-ink/70 px-3 py-2 outline-none focus:border-mint/60"
          >
            <option value="inline">Nội dòng</option>
            <option value="split">Chia đôi</option>
          </select>
        </label>
      </div>
      <label className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-ink/50 p-4 text-sm text-slate-300">
        <input type="checkbox" checked={settings.autoBackup} onChange={(event) => updateBoolean('autoBackup', event.target.checked)} className="h-4 w-4 accent-mint" />
        <span>Tự sao lưu trước khi áp dụng patch</span>
      </label>
      <label className="mt-3 block rounded-2xl border border-white/10 bg-ink/50 p-4 text-sm text-slate-300">
        <span className="font-semibold text-white">Mẫu bỏ qua</span>
        <textarea
          value={settings.ignorePatterns.join('\n')}
          onChange={(event) => setSettings((current) => ({ ...current, ignorePatterns: event.target.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) }))}
          className="mt-3 min-h-24 w-full resize-none rounded-xl border border-white/10 bg-ink/70 px-3 py-2 text-sm outline-none focus:border-mint/60"
        />
      </label>
      <div className="mt-4 flex gap-3">
        <button disabled={isBusy} onClick={save} className="rounded-full bg-mint px-4 py-2 text-sm font-bold text-ink disabled:opacity-60">Lưu cài đặt</button>
        <button disabled={isBusy} onClick={test} className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white hover:border-mint/50 disabled:opacity-60">Kiểm tra kết nối</button>
      </div>
      {status ? <div className="mt-3 text-sm text-skyglass">{status}</div> : null}

      <div className="mt-6 rounded-3xl border border-white/10 bg-ink/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="font-display text-lg font-semibold text-white">Codex CLI</h4>
            <p className="mt-1 text-sm text-slate-500">Dùng đăng nhập Codex cục bộ hiện có. Doni mặc định chạy Codex ở chế độ chỉ đọc.</p>
          </div>
          <button type="button" onClick={refreshCodexStatus} className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-white hover:border-mint/50">
            Phát hiện
          </button>
        </div>
        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${codexStatus?.available ? 'border-mint/30 bg-mint/10 text-mint' : 'border-ember/30 bg-ember/10 text-ember'}`}>
          {codexStatus?.available ? `${codexStatus.version ?? 'Codex CLI'} - ${codexStatus.source ?? 'khả dụng'}` : codexStatus?.error ?? 'Chưa kiểm tra Codex CLI.'}
        </div>
        <label className="mt-4 block text-sm text-slate-300">
          <span className="font-semibold text-white">Sandbox Codex</span>
          <select
            value={settings.codexSandbox}
            onChange={(event) => update('codexSandbox', event.target.value)}
            className="mt-3 w-full rounded-xl border border-white/10 bg-ink/70 px-3 py-2 outline-none focus:border-mint/60"
          >
            <option value="read-only">Chỉ đọc: chỉ phân tích và gợi ý</option>
            <option value="workspace-write">Cho phép ghi workspace: Codex được sửa tệp dự án</option>
          </select>
        </label>
        {settings.codexSandbox === 'workspace-write' ? (
          <div className="mt-3 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm leading-6 text-ember">
            Chế độ ghi workspace cho phép Codex CLI sửa tệp trực tiếp. Chỉ dùng khi bạn sẵn sàng kiểm tra thay đổi trong git hoặc VS Code sau đó.
          </div>
        ) : null}
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-ink/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="font-display text-lg font-semibold text-white">Gỡ lỗi mạng AI</h4>
            <p className="mt-1 text-sm text-slate-500">Request được gửi từ tiến trình Electron main nên không xuất hiện trong Network của DevTools renderer.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={refreshNetworkEvents} className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-white hover:border-mint/50">
              Làm mới
            </button>
            <button type="button" onClick={clearNetworkEvents} disabled={!networkEvents.length} className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-white hover:border-ember/50 hover:text-ember disabled:opacity-40">
              Xóa
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
                    {event.status ?? 'mạng'}{typeof event.durationMs === 'number' ? ` - ${event.durationMs}ms` : ''}
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
              Chưa ghi nhận request AI nào. Hãy chạy Kiểm tra kết nối hoặc Lập kế hoạch.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
