import { useState } from 'react';
import type { ApplyPatchResponse, PatchPlan, RollbackPatchResponse } from '../../shared/types';

function riskClassName(riskLevel: PatchPlan['riskLevel']): string {
  if (riskLevel === 'low') return 'border-mint/30 bg-mint/10 text-mint';
  if (riskLevel === 'medium') return 'border-ember/30 bg-ember/10 text-ember';
  return 'border-red-400/30 bg-red-400/10 text-red-300';
}

function DiffViewer({ diff }: { diff: string }): JSX.Element {
  return (
    <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-ink/80 p-4 text-xs leading-6">
      {diff.split('\n').map((line, index) => {
        const className = line.startsWith('+') && !line.startsWith('+++')
          ? 'text-mint'
          : line.startsWith('-') && !line.startsWith('---')
            ? 'text-ember'
            : line.startsWith('@@')
              ? 'text-skyglass'
              : 'text-slate-300';
        return (
          <div key={`${index}-${line.slice(0, 12)}`} className={className}>
            {line || ' '}
          </div>
        );
      })}
    </pre>
  );
}

interface PatchPreviewProps {
  patchPlan: PatchPlan;
  warnings: string[];
  diffTextByFile: Record<string, string>;
  applyLoading: boolean;
  applyError: string | null;
  lastApplyResult: ApplyPatchResponse | null;
  rollbackLoading: boolean;
  rollbackError: string | null;
  rollbackResult: RollbackPatchResponse | null;
  canApply: boolean;
  onCopyPatchJson: () => void;
  onCopyDiff: () => void;
  onDiscard: () => void;
  onApply: () => Promise<void>;
  onRollback: () => Promise<void>;
}

export function PatchPreview({
  patchPlan,
  warnings,
  diffTextByFile,
  applyLoading,
  applyError,
  lastApplyResult,
  rollbackLoading,
  rollbackError,
  rollbackResult,
  canApply,
  onCopyPatchJson,
  onCopyDiff,
  onDiscard,
  onApply,
  onRollback,
}: PatchPreviewProps): JSX.Element {
  const [isConfirmOpen, setConfirmOpen] = useState(false);

  const confirmApply = async (): Promise<void> => {
    setConfirmOpen(false);
    await onApply();
  };

  return (
    <div className="mt-6 rounded-[2rem] border border-skyglass/20 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-skyglass">Patch Preview</p>
          <h3 className="mt-3 font-display text-2xl font-semibold text-white">{patchPlan.summary}</h3>
        </div>
        <span className={`rounded-full border px-4 py-2 text-sm font-bold ${riskClassName(patchPlan.riskLevel)}`}>{patchPlan.riskLevel} risk</span>
      </div>

      {warnings.length ? (
        <div className="mt-5 rounded-2xl border border-ember/30 bg-ember/10 p-4 text-sm text-ember">
          {warnings.map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-white/10 bg-ink/40 p-4 text-sm text-slate-400">
        No files are changed until you click Apply Changes. A backup is created before applying. Rollback is available after apply.
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={onCopyPatchJson} className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-mint/50 hover:text-mint">
          Copy Patch JSON
        </button>
        <button type="button" onClick={onCopyDiff} className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-mint/50 hover:text-mint">
          Copy Diff
        </button>
        <button type="button" onClick={onDiscard} className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-ember/50 hover:text-ember">
          Discard Patch
        </button>
        <button type="button" onClick={() => setConfirmOpen(true)} disabled={!canApply || applyLoading} className="rounded-full bg-mint px-5 py-3 text-sm font-extrabold text-ink transition hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-50">
          {applyLoading ? 'Applying...' : 'Apply Changes'}
        </button>
      </div>

      {!canApply ? <div className="mt-3 text-sm text-slate-500">Apply is disabled until the patch has files and no blocking validation warnings.</div> : null}
      {applyError ? <div className="mt-4 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm font-medium text-ember">{applyError}</div> : null}

      {lastApplyResult ? (
        <div className="mt-5 rounded-3xl border border-mint/20 bg-mint/10 p-4 text-sm text-slate-300">
          <div className="font-semibold text-white">Patch applied</div>
          <div className="mt-2 text-xs text-slate-500">Backup: {lastApplyResult.backupId}</div>
          <div className="mt-1 text-xs text-slate-500">Applied at: {new Date(lastApplyResult.appliedAt).toLocaleString()}</div>
          <div className="mt-3 grid gap-2">
            {lastApplyResult.appliedFiles.map((file) => (
              <div key={file.relativePath} className="rounded-2xl border border-white/10 bg-ink/50 px-3 py-2">
                {file.relativePath}: {file.status}{file.message ? ` - ${file.message}` : ''}
              </div>
            ))}
          </div>
          <button type="button" onClick={onRollback} disabled={rollbackLoading} className="mt-4 rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-ember/50 hover:text-ember disabled:cursor-not-allowed disabled:opacity-50">
            {rollbackLoading ? 'Rolling back...' : 'Rollback Last Apply'}
          </button>
        </div>
      ) : null}

      {rollbackError ? <div className="mt-4 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm font-medium text-ember">{rollbackError}</div> : null}
      {rollbackResult ? (
        <div className="mt-4 rounded-2xl border border-skyglass/20 bg-skyglass/10 p-4 text-sm text-slate-300">
          <div className="font-semibold text-white">Rollback {rollbackResult.success ? 'completed' : 'finished with errors'}</div>
          <div className="mt-3 grid gap-2">
            {rollbackResult.restoredFiles.map((file) => (
              <div key={file.relativePath} className="rounded-2xl border border-white/10 bg-ink/50 px-3 py-2">
                {file.relativePath}: {file.status}{file.message ? ` - ${file.message}` : ''}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-5">
        {patchPlan.files.length ? (
          patchPlan.files.map((file) => (
            <article key={file.relativePath} className="rounded-3xl border border-white/10 bg-ink/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="font-display text-lg font-semibold text-white">{file.relativePath}</h4>
                  {file.notes ? <p className="mt-2 text-sm text-slate-400">{file.notes}</p> : null}
                </div>
                <span className="rounded-full border border-skyglass/20 bg-skyglass/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-skyglass">
                  {file.changeType}
                </span>
              </div>
              <div className="mt-4">
                <DiffViewer diff={diffTextByFile[file.relativePath] ?? ''} />
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-white/10 bg-ink/50 p-4 text-sm text-slate-400">No file changes were generated.</div>
        )}
      </div>

      {isConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-panel p-6 shadow-glow">
            <h3 className="font-display text-2xl font-semibold text-white">Apply Changes?</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              This will modify {patchPlan.files.length} files in your project. A backup will be created first.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmOpen(false)} className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30">
                Cancel
              </button>
              <button type="button" onClick={confirmApply} className="rounded-full bg-mint px-5 py-3 text-sm font-extrabold text-ink transition hover:bg-mint/90">
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
