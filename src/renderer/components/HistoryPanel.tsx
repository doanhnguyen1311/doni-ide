import { useState } from 'react';
import type { SessionItem } from '../../shared/types';
import { useProjectStore } from '../stores/projectStore';

function sessionStatus(session: SessionItem): string {
  if (session.verifyCommand?.status === 'failed') return 'xác minh lỗi';
  if (session.applyResult?.success) return 'đã áp dụng';
  return session.executionMode ?? 'answer';
}

function statusClassName(status: string): string {
  if (status === 'xác minh lỗi') return 'border-ember/30 bg-ember/10 text-ember';
  if (status === 'đã áp dụng') return 'border-mint/30 bg-mint/10 text-mint';
  if (status === 'patch') return 'border-skyglass/30 bg-skyglass/10 text-skyglass';
  return 'border-white/10 bg-white/[0.04] text-slate-300';
}

function JsonPreview({ value }: { value: unknown }): JSX.Element {
  return (
    <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-ink/70 p-3 text-xs leading-5 text-slate-300">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function HistoryPanel(): JSX.Element {
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const {
    activeProjectId,
    activeSessionId,
    sessions,
    sessionLoading,
    sessionError,
    openSession,
    renameSession,
    deleteSession,
    clearSessions,
    loadProjectSessions,
  } = useProjectStore();
  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? null;

  const startRename = (session: SessionItem): void => {
    setRenameId(session.id);
    setRenameTitle(session.title);
  };

  const commitRename = async (): Promise<void> => {
    if (!renameId || !renameTitle.trim()) return;
    await renameSession(renameId, renameTitle.trim());
    setRenameId(null);
  };

  return (
    <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-skyglass">Lịch sử</p>
          <h3 className="mt-3 font-display text-2xl font-semibold text-white">Lịch sử phiên cục bộ</h3>
          <p className="mt-2 text-sm text-slate-500">Lịch sử phiên được lưu trong workspace .doni của dự án.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={loadProjectSessions} disabled={!activeProjectId || sessionLoading} className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-mint/50 hover:text-mint disabled:cursor-not-allowed disabled:opacity-40">
            Làm mới
          </button>
          <button type="button" onClick={clearSessions} disabled={!sessions.length} className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-ember/50 hover:text-ember disabled:cursor-not-allowed disabled:opacity-40">
            Xóa lịch sử
          </button>
        </div>
      </div>

      {sessionError ? <div className="mt-4 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm font-medium text-ember">{sessionError}</div> : null}

      <div className="mt-5 grid gap-3">
        {sessions.length ? (
          sessions.map((session) => (
            <article key={session.id} className={`rounded-3xl border p-4 ${activeSessionId === session.id ? 'border-mint/40 bg-mint/10' : 'border-white/10 bg-ink/40'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {renameId === session.id ? (
                    <input
                      value={renameTitle}
                      onChange={(event) => setRenameTitle(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-ink/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-mint/60"
                    />
                  ) : (
                    <button type="button" onClick={() => openSession(session.id)} className="block max-w-full truncate text-left font-display text-lg font-semibold text-white">
                      {session.title}
                    </button>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{new Date(session.createdAt).toLocaleString()}</span>
                    <span className={`rounded-full border px-2 py-1 font-bold ${statusClassName(sessionStatus(session))}`}>{sessionStatus(session)}</span>
                    {session.patchPlanSummary ? <span>{session.patchPlanSummary.changedFiles.length} tệp đã đổi</span> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {renameId === session.id ? (
                    <button type="button" onClick={commitRename} className="rounded-full bg-mint px-3 py-2 text-xs font-bold text-ink">
                      Lưu
                    </button>
                  ) : (
                    <button type="button" onClick={() => startRename(session)} className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-white hover:border-mint/50">
                      Đổi tên
                    </button>
                  )}
                  <button type="button" onClick={() => deleteSession(session.id)} className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-white hover:border-ember/50 hover:text-ember">
                    Xóa
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-white/10 bg-ink/40 p-4 text-sm text-slate-500">
            {activeProjectId ? 'Chưa có phiên nào được lưu.' : 'Mở thư mục dự án để tải lịch sử cục bộ.'}
          </div>
        )}
      </div>

      {activeSession ? (
        <div className="mt-5 rounded-3xl border border-white/10 bg-ink/40 p-4 text-sm text-slate-300">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="font-display text-lg font-semibold text-white">Phiên đã chọn</h4>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClassName(sessionStatus(activeSession))}`}>{sessionStatus(activeSession)}</span>
          </div>

          <div className="mt-4 grid gap-4">
            <section>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Yêu cầu gốc</div>
              <p className="mt-2 whitespace-pre-wrap leading-6 text-slate-200">{activeSession.rawRequest || 'Chưa lưu yêu cầu.'}</p>
            </section>

            {activeSession.detectedIntent ? (
              <section>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Ý định phát hiện</div>
                <JsonPreview value={activeSession.detectedIntent} />
              </section>
            ) : null}

            {activeSession.promptVariants?.length ? (
              <section>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Chiến lược</div>
                <div className="mt-2 text-slate-400">{activeSession.promptVariants.length} chiến lược đã lưu.</div>
              </section>
            ) : null}

            {activeSession.refinedPrompt ? (
              <section>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Prompt đã tinh chỉnh</div>
                <p className="mt-2 whitespace-pre-wrap leading-6 text-slate-200">{activeSession.refinedPrompt}</p>
              </section>
            ) : null}

            {activeSession.selectedVariant ? (
              <section>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Chiến lược đã chọn</div>
                <p className="mt-2 font-semibold text-white">{activeSession.selectedVariant.title}</p>
                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-ink/70 p-3 text-xs leading-5 text-slate-300">
                  {activeSession.finalPrompt ?? activeSession.selectedVariant.prompt}
                </pre>
              </section>
            ) : null}

            {activeSession.loadedContextFilePaths?.length ? (
              <section>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Đường dẫn ngữ cảnh đã tải</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {activeSession.loadedContextFilePaths.map((filePath) => (
                    <span key={filePath} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-xs text-slate-300">{filePath}</span>
                  ))}
                </div>
              </section>
            ) : null}

            {activeSession.executionResult ? (
              <section>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Kết quả thực thi</div>
                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-ink/70 p-3 text-xs leading-5 text-slate-300">
                  {activeSession.executionResult}
                </pre>
              </section>
            ) : null}

            {activeSession.patchPlanSummary ? (
              <section>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Tóm tắt patch</div>
                <p className="mt-2 text-slate-200">{activeSession.patchPlanSummary.summary}</p>
                <div className="mt-2 text-xs text-slate-500">
                  {activeSession.patchPlanSummary.riskLevel} rủi ro, {activeSession.patchPlanSummary.changedFiles.length} tệp đã đổi
                </div>
              </section>
            ) : null}

            {activeSession.applyResult ? (
              <section>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Kết quả áp dụng</div>
                <JsonPreview value={activeSession.applyResult} />
              </section>
            ) : null}

            {activeSession.verifyCommand ? (
              <section>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Lệnh xác minh</div>
                <div className="mt-2 text-slate-200">{activeSession.verifyCommand.command}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {activeSession.verifyCommand.status}, mã thoát {activeSession.verifyCommand.exitCode ?? 'n/a'}
                  {activeSession.verifyCommand.truncated ? ', output đã rút gọn' : ''}
                </div>
              </section>
            ) : null}

            {activeSession.errorAnalysis ? (
              <section>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Phân tích lỗi</div>
                <JsonPreview value={activeSession.errorAnalysis} />
              </section>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
