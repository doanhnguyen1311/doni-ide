import { useEffect } from 'react';
import { useProjectStore } from '../stores/projectStore';
import type { CommandStatus } from '../../shared/types';

const COMMAND_PRESETS = [
  'npm run build',
  'npm run lint',
  'npm test',
  'npm run typecheck',
  'pnpm build',
  'pnpm lint',
  'pnpm test',
  'yarn build',
  'yarn lint',
  'yarn test',
];
const MAX_OUTPUT_PREVIEW = 20 * 1024;

function shortenOutput(output: string): { outputPreview: string; truncated: boolean } {
  if (output.length <= MAX_OUTPUT_PREVIEW) return { outputPreview: output, truncated: false };
  const head = output.slice(0, 5 * 1024);
  const tail = output.slice(output.length - 15 * 1024);
  return { outputPreview: `${head}\n\n[Output đã được rút gọn cho lịch sử phiên.]\n\n${tail}`, truncated: true };
}

function statusClassName(status: CommandStatus): string {
  if (status === 'running') return 'border-skyglass/30 bg-skyglass/10 text-skyglass';
  if (status === 'success') return 'border-mint/30 bg-mint/10 text-mint';
  if (status === 'failed' || status === 'blocked') return 'border-ember/30 bg-ember/10 text-ember';
  if (status === 'stopped') return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
  return 'border-white/10 bg-white/[0.04] text-slate-400';
}

export function VerifyPanel({ selectedFolder }: { selectedFolder: string | null }): JSX.Element {
  const {
    commandInput,
    selectedCommandPreset,
    commandChạyning,
    commandStatus,
    commandOutput,
    commandExitCode,
    commandError,
    commandStartedAt,
    commandFinishedAt,
    errorAnalysisLoading,
    errorAnalysisResult,
    errorAnalysisError,
    setCommandInput,
    setSelectedCommandPreset,
    runCommand,
    stopCommand,
    appendCommandOutput,
    clearCommandOutput,
    setCommandStatus,
    setCommandChạyning,
    setCommandError,
    setCommandFinishedAt,
    analyzeCommandError,
    clearErrorAnalysis,
    useSuggestedPrompt,
    selectRelatedFilesFromAnalysis,
    updateCurrentSession,
  } = useProjectStore();

  useEffect(() => {
    const removeOutput = window.doni.onCommandOutput((event) => {
      appendCommandOutput(event.data);
    });
    const removeError = window.doni.onCommandError((event) => {
      setCommandError(event.message);
      appendCommandOutput(`\n[error] ${event.message}\n`);
    });
    const removeExit = window.doni.onCommandExit((event) => {
      const current = useProjectStore.getState();
      const finalStatus: CommandStatus = current.commandStatus === 'stopped' ? 'stopped' : event.exitCode === 0 ? 'success' : 'failed';
      const finishedAt = new Date().toISOString();
      setCommandChạyning(false);
      setCommandStatus(finalStatus, event.exitCode);
      setCommandFinishedAt(finishedAt);
      appendCommandOutput(
        `\n[tiến trình đã thoát: ${finalStatus}${typeof event.exitCode === 'number' ? `, mã ${event.exitCode}` : ''}, ${event.durationMs}ms]\n`,
      );
      const preview = shortenOutput(
        `${current.commandOutput}\n[tiến trình đã thoát: ${finalStatus}${typeof event.exitCode === 'number' ? `, mã ${event.exitCode}` : ''}, ${event.durationMs}ms]\n`,
      );
      void updateCurrentSession({
        verifyCommand: {
          command: current.commandInput,
          exitCode: event.exitCode,
          status: finalStatus,
          outputPreview: preview.outputPreview,
          truncated: preview.truncated,
        },
      });
    });

    return () => {
      removeOutput();
      removeError();
      removeExit();
    };
  }, [appendCommandOutput, setCommandError, setCommandFinishedAt, setCommandChạyning, setCommandStatus, updateCurrentSession]);

  const copySuggestedPrompt = async (): Promise<void> => {
    if (!errorAnalysisResult?.suggestedPrompt) return;
    await navigator.clipboard.writeText(errorAnalysisResult.suggestedPrompt);
  };

  return (
    <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-skyglass">Bước 7 Xác minh</p>
          <h3 className="mt-3 font-display text-2xl font-semibold text-white">Command Chạyner</h3>
          <p className="mt-2 text-sm text-slate-500">Lệnh chạy cục bộ trong thư mục dự án đã chọn. Hãy kiểm tra lệnh trước khi chạy.</p>
        </div>
        <span className={`rounded-full border px-4 py-2 text-sm font-bold ${statusClassName(commandStatus)}`}>{commandStatus}</span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[220px_1fr]">
        <select
          value={selectedCommandPreset}
          onChange={(event) => setSelectedCommandPreset(event.target.value)}
          className="rounded-2xl border border-white/10 bg-ink/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-mint/60"
        >
          <option value="">Lệnh tùy chỉnh</option>
          {COMMAND_PRESETS.map((preset) => (
            <option key={preset} value={preset}>
              {preset}
            </option>
          ))}
        </select>
        <input
          value={commandInput}
          onChange={(event) => {
            setSelectedCommandPreset('');
            setCommandInput(event.target.value);
          }}
          placeholder="npm run build"
          className="rounded-2xl border border-white/10 bg-ink/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-mint/60"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => runCommand(selectedFolder)} disabled={!selectedFolder || commandChạyning} className="rounded-full bg-mint px-5 py-3 text-sm font-extrabold text-ink transition hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-50">
          Chạy
        </button>
        <button type="button" onClick={stopCommand} disabled={!commandChạyning} className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-ember/50 hover:text-ember disabled:cursor-not-allowed disabled:opacity-40">
          Dừng
        </button>
        <button type="button" onClick={clearCommandOutput} disabled={commandChạyning || (!commandOutput && !commandError)} className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-40">
          Xóa output
        </button>
      </div>

      {commandError ? <div className="mt-4 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm font-medium text-ember">{commandError}</div> : null}

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
        <span>Bắt đầu: {commandStartedAt ? new Date(commandStartedAt).toLocaleTimeString() : 'n/a'}</span>
        <span>Kết thúc: {commandFinishedAt ? new Date(commandFinishedAt).toLocaleTimeString() : 'n/a'}</span>
        {typeof commandExitCode === 'number' ? <span>Mã thoát: {commandExitCode}</span> : null}
      </div>

      <pre className="mt-4 min-h-64 max-h-96 overflow-auto rounded-3xl border border-white/10 bg-ink/80 p-4 text-xs leading-6 text-slate-200">
        {commandOutput || 'Output của lệnh sẽ xuất hiện ở đây.'}
      </pre>

      {commandStatus === 'failed' ? (
        <div className="mt-5 rounded-3xl border border-ember/20 bg-ember/10 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h4 className="font-display text-xl font-semibold text-white">Phân tích lỗi lệnh</h4>
              <p className="mt-2 text-sm text-slate-400">Phân tích của AI chỉ mang tính tham khảo. Hãy kiểm tra các tệp gợi ý trước khi tạo patch khác.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={analyzeCommandError} disabled={errorAnalysisLoading} className="rounded-full bg-mint px-5 py-3 text-sm font-extrabold text-ink transition hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-50">
                {errorAnalysisLoading ? 'Đang phân tích...' : 'Phân tích lỗi bằng AI'}
              </button>
              <button type="button" onClick={clearErrorAnalysis} disabled={!errorAnalysisResult && !errorAnalysisError} className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-40">
                Xóa phân tích
              </button>
            </div>
          </div>

          {errorAnalysisError ? <div className="mt-4 rounded-2xl border border-ember/30 bg-ink/50 px-4 py-3 text-sm font-medium text-ember">{errorAnalysisError}</div> : null}

          {errorAnalysisResult ? (
            <div className="mt-5 rounded-3xl border border-white/10 bg-ink/50 p-5 text-sm text-slate-300">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-skyglass">Tóm tắt</div>
                  <p className="mt-2 leading-6 text-slate-200">{errorAnalysisResult.summary}</p>
                </div>
                <span className="rounded-full border border-skyglass/30 bg-skyglass/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-skyglass">
                  {errorAnalysisResult.confidence} độ tin cậy
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Nguyên nhân có thể</div>
                  <ul className="mt-2 space-y-2">
                    {errorAnalysisResult.probableCauses.length ? errorAnalysisResult.probableCauses.map((cause) => (
                      <li key={cause} className="rounded-2xl border border-white/10 bg-ink/50 px-3 py-2">{cause}</li>
                    )) : <li className="rounded-2xl border border-white/10 bg-ink/50 px-3 py-2">Chưa xác định được nguyên nhân cụ thể.</li>}
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Tệp liên quan</div>
                  <ul className="mt-2 space-y-2">
                    {errorAnalysisResult.relatedFiles.length ? errorAnalysisResult.relatedFiles.map((file) => (
                      <li key={file} className="rounded-2xl border border-white/10 bg-ink/50 px-3 py-2 font-mono text-xs">{file}</li>
                    )) : <li className="rounded-2xl border border-white/10 bg-ink/50 px-3 py-2">Chưa xác định tệp cụ thể.</li>}
                  </ul>
                </div>
              </div>

              <div className="mt-5">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Hành động tiếp theo gợi ý</div>
                <ul className="mt-2 space-y-2">
                  {errorAnalysisResult.suggestedNextActions.length ? errorAnalysisResult.suggestedNextActions.map((action) => (
                    <li key={action} className="rounded-2xl border border-white/10 bg-ink/50 px-3 py-2">{action}</li>
                  )) : <li className="rounded-2xl border border-white/10 bg-ink/50 px-3 py-2">Không có hành động tiếp theo được gợi ý.</li>}
                </ul>
              </div>

              <div className="mt-5">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Prompt tiếp theo gợi ý</div>
                <pre className="mt-2 whitespace-pre-wrap rounded-2xl border border-white/10 bg-ink/80 p-4 text-xs leading-6 text-slate-200">{errorAnalysisResult.suggestedPrompt}</pre>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={copySuggestedPrompt} className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-mint/50 hover:text-mint">
                  Sao chép prompt gợi ý
                </button>
                <button type="button" onClick={useSuggestedPrompt} className="rounded-full bg-mint px-5 py-3 text-sm font-extrabold text-ink transition hover:bg-mint/90">
                  Dùng prompt gợi ý
                </button>
                <button type="button" onClick={selectRelatedFilesFromAnalysis} className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-skyglass/50 hover:text-skyglass">
                  Chọn tệp liên quan
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
