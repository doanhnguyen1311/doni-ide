import { useEffect, useState } from "react";
import type {
  AiNetworkEvent,
  AiSettings,
  CodexCliStatus,
} from "../../shared/types";

const emptySettings: AiSettings = {
  apiBase: "",
  apiKey: "",
  model: "",
  plannerModel: "",
  executorModel: "",
  customModels: [],
  executorProvider: "custom",
  maxContextFiles: 10,
  ignorePatterns: [
    "node_modules",
    "dist",
    "build",
    ".git",
    "coverage",
    ".next",
    ".turbo",
    ".doni",
  ],
  autoBackup: true,
  diffMode: "inline",
  codexSandbox: "read-only",
};

export function SettingsPanel(): JSX.Element {
  const [settings, setSettings] = useState<AiSettings>(emptySettings);
  const [status, setStatus] = useState<string | null>(null);
  const [isBusy, setBusy] = useState(false);
  const [networkEvents, setNetworkEvents] = useState<AiNetworkEvent[]>([]);
  const [codexStatus, setCodexStatus] = useState<CodexCliStatus | null>(null);
  const [newModelName, setNewModelName] = useState("");

  useEffect(() => {
    if (typeof window.doni.getSettings !== "function") {
      setStatus(
        "Electron preload API đã cũ. Hãy khởi động lại toàn bộ app, không chỉ refresh React.",
      );
      return;
    }

    void window.doni
      .getSettings()
      .then(setSettings)
      .catch(() => setStatus("Không thể tải cài đặt AI."));
    void window.doni
      .getAiNetworkEvents?.()
      .then(setNetworkEvents)
      .catch(() => undefined);
    void window.doni
      .getCodexCliStatus?.()
      .then(setCodexStatus)
      .catch(() => undefined);

    if (typeof window.doni.onAiNetworkEvent !== "function") return;
    return window.doni.onAiNetworkEvent((event) => {
      setNetworkEvents((current) =>
        [event, ...current.filter((item) => item.id !== event.id)].slice(
          0,
          100,
        ),
      );
    });
  }, []);

  const update = (key: keyof AiSettings, value: string): void =>
    setSettings((current) => ({ ...current, [key]: value }));
  const updateNumber = (key: keyof AiSettings, value: number): void =>
    setSettings((current) => ({ ...current, [key]: value }));
  const updateBoolean = (key: keyof AiSettings, value: boolean): void =>
    setSettings((current) => ({ ...current, [key]: value }));
  const modelOptions = Array.from(
    new Set(
      [
        ...settings.customModels,
        settings.model,
        settings.plannerModel,
        settings.executorModel,
      ]
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );

  const addCustomModel = (): void => {
    const modelName = newModelName.trim();
    if (!modelName) return;
    setSettings((current) => ({
      ...current,
      customModels: Array.from(new Set([...current.customModels, modelName])),
      plannerModel: current.plannerModel || modelName,
      executorModel: current.executorModel || modelName,
      model: current.model || modelName,
    }));
    setNewModelName("");
  };

  const removeCustomModel = (modelName: string): void => {
    setSettings((current) => ({
      ...current,
      customModels: current.customModels.filter((item) => item !== modelName),
      model: current.model === modelName ? "" : current.model,
      plannerModel:
        current.plannerModel === modelName ? "" : current.plannerModel,
      executorModel:
        current.executorModel === modelName ? "" : current.executorModel,
    }));
  };

  const save = async (): Promise<void> => {
    if (typeof window.doni.saveSettings !== "function") {
      setStatus("Electron preload API đã cũ. Hãy khởi động lại toàn bộ app.");
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const saved = await window.doni.saveSettings(settings);
      setSettings(saved);
      setStatus("Đã lưu cài đặt cục bộ.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Không thể lưu cài đặt.",
      );
    } finally {
      setBusy(false);
    }
  };

  const test = async (): Promise<void> => {
    if (typeof window.doni.testConnection !== "function") {
      setStatus("Electron preload API đã cũ. Hãy khởi động lại toàn bộ app.");
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const result = await window.doni.testConnection(settings);
      setStatus(
        result.ok
          ? "Kết nối OK."
          : (result.error ?? "Kiểm tra kết nối thất bại."),
      );
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Kiểm tra kết nối thất bại.",
      );
    } finally {
      setBusy(false);
    }
  };

  const refreshNetworkEvents = async (): Promise<void> => {
    if (typeof window.doni.getAiNetworkEvents !== "function") return;
    setNetworkEvents(await window.doni.getAiNetworkEvents());
  };

  const clearNetworkEvents = async (): Promise<void> => {
    if (typeof window.doni.clearAiNetworkEvents !== "function") return;
    await window.doni.clearAiNetworkEvents();
    setNetworkEvents([]);
  };

  const refreshCodexStatus = async (): Promise<void> => {
    if (typeof window.doni.getCodexCliStatus !== "function") return;
    setCodexStatus(await window.doni.getCodexCliStatus());
  };

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-glow backdrop-blur">
      <h3 className="font-display text-xl font-semibold text-white">
        Điều phối model
      </h3>
      <p className="mt-2 text-sm text-slate-500">
        Dùng model lập kế hoạch nhanh, rẻ để phân tích và model executor mạnh
        hơn cho thay đổi code.
      </p>
      <div className="mt-4 grid gap-3">
        <input
          className="rounded-2xl border border-white/10 bg-ink/70 px-4 py-3 text-sm outline-none focus:border-mint/60"
          value={settings.apiBase}
          onChange={(e) => update("apiBase", e.target.value)}
          placeholder="URL API Base, ví dụ http://localhost:20128/v1"
        />
        <input
          className="rounded-2xl border border-white/10 bg-ink/70 px-4 py-3 text-sm outline-none focus:border-mint/60"
          value={settings.apiKey}
          onChange={(e) => update("apiKey", e.target.value)}
          placeholder="Nhập API key"
          type="password"
        />
      </div>
      <div className="mt-4 rounded-3xl border border-white/10 bg-ink/40 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-0 flex-1 text-sm text-slate-300">
            <span className="font-semibold text-white">Thêm model custom</span>
            <input
              className="mt-3 w-full rounded-2xl border border-white/10 bg-ink/70 px-4 py-3 text-sm outline-none focus:border-mint/60"
              value={newModelName}
              onChange={(event) => setNewModelName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCustomModel();
                }
              }}
              placeholder="Ví dụ: gpt-5.4-mini, claude-sonnet, gemini-pro"
            />
          </label>
          <button
            type="button"
            onClick={addCustomModel}
            className="rounded-full border border-mint/30 px-4 py-3 text-sm font-bold text-mint hover:bg-mint/10"
          >
            Thêm model
          </button>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <label className="text-sm text-slate-300">
            <span className="font-semibold text-white">
              Model A lập kế hoạch
            </span>
            <select
              value={settings.plannerModel}
              onChange={(event) => update("plannerModel", event.target.value)}
              className="mt-3 w-full rounded-xl border border-white/10 bg-ink/70 px-3 py-2 outline-none focus:border-mint/60"
            >
              <option value="">Chọn model planner</option>
              {modelOptions.map((modelName) => (
                <option key={modelName} value={modelName}>
                  {modelName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-300">
            <span className="font-semibold text-white">Executor sử dụng</span>
            <select
              value={settings.executorProvider}
              onChange={(event) =>
                update("executorProvider", event.target.value)
              }
              className="mt-3 w-full rounded-xl border border-white/10 bg-ink/70 px-3 py-2 outline-none focus:border-mint/60"
            >
              <option value="custom">Custom model</option>
              <option value="codex">Codex CLI</option>
            </select>
          </label>
          {settings.executorProvider === "custom" ? (
            <label className="text-sm text-slate-300 lg:col-span-2">
              <span className="font-semibold text-white">Model B executor</span>
              <select
                value={settings.executorModel}
                onChange={(event) =>
                  update("executorModel", event.target.value)
                }
                className="mt-3 w-full rounded-xl border border-white/10 bg-ink/70 px-3 py-2 outline-none focus:border-mint/60"
              >
                <option value="">Chọn model executor</option>
                {modelOptions.map((modelName) => (
                  <option key={modelName} value={modelName}>
                    {modelName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        {modelOptions.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {modelOptions.map((modelName) => (
              <span
                key={modelName}
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-mono text-slate-300"
              >
                <span className="truncate">{modelName}</span>
                <button
                  type="button"
                  onClick={() => removeCustomModel(modelName)}
                  className="text-slate-500 hover:text-ember"
                  title="Xóa model"
                >
                  x
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <label className="rounded-2xl border border-white/10 bg-ink/50 p-4 text-sm text-slate-300">
          <span className="font-semibold text-white">
            Số tệp ngữ cảnh tối đa
          </span>
          <input
            type="number"
            min={1}
            max={30}
            value={settings.maxContextFiles}
            onChange={(event) =>
              updateNumber("maxContextFiles", Number(event.target.value))
            }
            className="mt-3 w-full rounded-xl border border-white/10 bg-ink/70 px-3 py-2 outline-none focus:border-mint/60"
          />
        </label>
        <label className="rounded-2xl border border-white/10 bg-ink/50 p-4 text-sm text-slate-300">
          <span className="font-semibold text-white">Kiểu diff</span>
          <select
            value={settings.diffMode}
            onChange={(event) => update("diffMode", event.target.value)}
            className="mt-3 w-full rounded-xl border border-white/10 bg-ink/70 px-3 py-2 outline-none focus:border-mint/60"
          >
            <option value="inline">Chỉnh sửa ngay trên dòng</option>
            <option value="split">Giữ và revert</option>
          </select>
        </label>
      </div>
      <label className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-ink/50 p-4 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={settings.autoBackup}
          onChange={(event) =>
            updateBoolean("autoBackup", event.target.checked)
          }
          className="h-4 w-4 accent-mint"
        />
        <span>Tự sao lưu trước khi áp dụng patch</span>
      </label>
      <label className="mt-3 block rounded-2xl border border-white/10 bg-ink/50 p-4 text-sm text-slate-300">
        <span className="font-semibold text-white">Mẫu bỏ qua</span>
        <textarea
          value={settings.ignorePatterns.join("\n")}
          onChange={(event) =>
            setSettings((current) => ({
              ...current,
              ignorePatterns: event.target.value
                .split(/\r?\n/)
                .map((item) => item.trim())
                .filter(Boolean),
            }))
          }
          className="mt-3 min-h-24 w-full resize-none rounded-xl border border-white/10 bg-ink/70 px-3 py-2 text-sm outline-none focus:border-mint/60"
        />
      </label>
      <div className="mt-4 flex gap-3">
        <button
          disabled={isBusy}
          onClick={save}
          className="rounded-full bg-mint px-4 py-2 text-sm font-bold text-ink disabled:opacity-60"
        >
          Lưu cài đặt
        </button>
        <button
          disabled={isBusy}
          onClick={test}
          className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white hover:border-mint/50 disabled:opacity-60"
        >
          Kiểm tra kết nối
        </button>
      </div>
      {status ? (
        <div className="mt-3 text-sm text-skyglass">{status}</div>
      ) : null}

      <div className="mt-6 rounded-3xl border border-white/10 bg-ink/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="font-display text-lg font-semibold text-white">
              Codex CLI
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              Dùng đăng nhập Codex cục bộ hiện có. Doni mặc định chạy Codex ở
              chế độ chỉ đọc.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshCodexStatus}
            className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-white hover:border-mint/50"
          >
            Phát hiện
          </button>
        </div>
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${codexStatus?.available ? "border-mint/30 bg-mint/10 text-mint" : "border-ember/30 bg-ember/10 text-ember"}`}
        >
          {codexStatus?.available
            ? `${codexStatus.version ?? "Codex CLI"} - ${codexStatus.source ?? "khả dụng"}`
            : (codexStatus?.error ?? "Chưa kiểm tra Codex CLI.")}
        </div>
        <label className="mt-4 block text-sm text-slate-300">
          <span className="font-semibold text-white">Sandbox Codex</span>
          <select
            value={settings.codexSandbox}
            onChange={(event) => update("codexSandbox", event.target.value)}
            className="mt-3 w-full rounded-xl border border-white/10 bg-ink/70 px-3 py-2 outline-none focus:border-mint/60"
          >
            <option value="read-only">Chỉ đọc: chỉ phân tích và gợi ý</option>
            <option value="workspace-write">
              Cho phép ghi workspace: Codex được sửa tệp dự án
            </option>
          </select>
        </label>
        {settings.codexSandbox === "workspace-write" ? (
          <div className="mt-3 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm leading-6 text-ember">
            Chế độ ghi workspace cho phép Codex CLI sửa tệp trực tiếp. Chỉ dùng
            khi bạn sẵn sàng kiểm tra thay đổi trong git hoặc VS Code sau đó.
          </div>
        ) : null}
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-ink/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="font-display text-lg font-semibold text-white">
              Gỡ lỗi mạng AI
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              Request được gửi từ tiến trình Electron main nên không xuất hiện
              trong Network của DevTools renderer.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={refreshNetworkEvents}
              className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-white hover:border-mint/50"
            >
              Làm mới
            </button>
            <button
              type="button"
              onClick={clearNetworkEvents}
              disabled={!networkEvents.length}
              className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-white hover:border-ember/50 hover:text-ember disabled:opacity-40"
            >
              Xóa
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          {networkEvents.length ? (
            networkEvents.slice(0, 8).map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-400"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-slate-200">
                    {event.method} {event.url}
                  </span>
                  <span
                    className={
                      event.ok ? "font-bold text-mint" : "font-bold text-ember"
                    }
                  >
                    {event.status ?? "mạng"}
                    {typeof event.durationMs === "number"
                      ? ` - ${event.durationMs}ms`
                      : ""}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3">
                  <span>model: {event.model}</span>
                  <span>
                    request: {(event.requestBytes / 1024).toFixed(1)}KB
                  </span>
                  {typeof event.responseBytes === "number" ? (
                    <span>
                      response: {(event.responseBytes / 1024).toFixed(1)}KB
                    </span>
                  ) : null}
                  <span>{new Date(event.startedAt).toLocaleTimeString()}</span>
                </div>
                {event.error ? (
                  <div className="mt-2 text-ember">{event.error}</div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">
              Chưa ghi nhận request AI nào. Hãy chạy Kiểm tra kết nối hoặc Lập
              kế hoạch.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
