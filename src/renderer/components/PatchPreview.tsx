import { useState } from "react";
import type {
  ApplyPatchResponse,
  PatchPlan,
  RollbackPatchResponse,
} from "../../shared/types";

function riskClassName(riskLevel: PatchPlan["riskLevel"]): string {
  if (riskLevel === "low") return "border-mint/30 bg-mint/10 text-mint";
  if (riskLevel === "medium") return "border-ember/30 bg-ember/10 text-ember";
  return "border-red-400/30 bg-red-400/10 text-red-300";
}

function DiffViewer({ diff }: { diff: string }): JSX.Element {
  return (
    <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-ink/80 p-4 text-xs leading-6">
      {diff.split("\n").map((line, index) => {
        const className =
          line.startsWith("+") && !line.startsWith("+++")
            ? "text-mint"
            : line.startsWith("-") && !line.startsWith("---")
              ? "text-ember"
              : line.startsWith("@@")
                ? "text-skyglass"
                : "text-slate-300";
        return (
          <div key={`${index}-${line.slice(0, 12)}`} className={className}>
            {line || " "}
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
  onRejectFile: (relativePath: string) => void;
  onApplyFile: (relativePath: string) => Promise<void>;
  onCopyFileContent: (relativePath: string) => void;
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
  onRejectFile,
  onApplyFile,
  onCopyFileContent,
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
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-skyglass">
            Xem trước patch
          </p>
          <h3 className="mt-3 font-display text-2xl font-semibold text-white">
            {patchPlan.summary}
          </h3>
        </div>
        <span
          className={`rounded-full border px-4 py-2 text-sm font-bold ${riskClassName(patchPlan.riskLevel)}`}
        >
          {patchPlan.riskLevel} rủi ro
        </span>
      </div>

      {warnings.length ? (
        <div className="mt-5 rounded-2xl border border-ember/30 bg-ember/10 p-4 text-sm text-ember">
          {warnings.map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-white/10 bg-ink/40 p-4 text-sm text-slate-400">
        <div>No files are changed until you click Áp dụng thay đổi.</div>
        <div>Bản sao lưu sẽ được tạo trước khi áp dụng.</div>
        <div>Hoàn tác is available after apply.</div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onCopyPatchJson}
          className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-mint/50 hover:text-mint"
        >
          Sao chép JSON patch
        </button>
        <button
          type="button"
          onClick={onCopyDiff}
          className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-mint/50 hover:text-mint"
        >
          Sao chép diff
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-ember/50 hover:text-ember"
        >
          Bỏ patch
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={!canApply || applyLoading}
          className="rounded-full bg-mint px-5 py-3 text-sm font-extrabold text-ink transition hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {applyLoading ? "Đang áp dụng..." : "Áp dụng thay đổi"}
        </button>
      </div>

      {!canApply ? (
        <div className="mt-3 text-sm text-slate-500">
          Chỉ có thể áp dụng khi patch có tệp và không có cảnh báo chặn xác
          thực.
        </div>
      ) : null}
      {applyError ? (
        <div className="mt-4 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm font-medium text-ember">
          {applyError}
        </div>
      ) : null}

      {lastApplyResult ? (
        <div className="mt-5 rounded-3xl border border-mint/20 bg-mint/10 p-4 text-sm text-slate-300">
          <div className="font-semibold text-white">Đã áp dụng patch</div>
          <div className="mt-2 text-xs text-slate-500">
            Sao lưu: {lastApplyResult.backupId}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Áp dụng lúc: {new Date(lastApplyResult.appliedAt).toLocaleString()}
          </div>
          <div className="mt-3 flex flex-col gap-[12px]">
            {lastApplyResult.appliedFiles.map((file) => (
              <div
                key={file.relativePath}
                className="rounded-2xl border border-white/10 bg-ink/50 px-3 py-2"
              >
                {file.relativePath}: {file.status}
                {file.message ? ` - ${file.message}` : ""}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={onRollback}
            disabled={rollbackLoading}
            className="mt-4 rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-ember/50 hover:text-ember disabled:cursor-not-allowed disabled:opacity-50"
          >
            {rollbackLoading ? "Đang hoàn tác..." : "Hoàn tác Last Apply"}
          </button>
        </div>
      ) : null}

      {rollbackError ? (
        <div className="mt-4 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm font-medium text-ember">
          {rollbackError}
        </div>
      ) : null}
      {rollbackResult ? (
        <div className="mt-4 rounded-2xl border border-skyglass/20 bg-skyglass/10 p-4 text-sm text-slate-300">
          <div className="font-semibold text-white">
            Hoàn tác {rollbackResult.success ? "hoàn tất" : "kết thúc với lỗi"}
          </div>
          <div className="mt-3 flex flex-col gap-[12px]">
            {rollbackResult.restoredFiles.map((file) => (
              <div
                key={file.relativePath}
                className="rounded-2xl border border-white/10 bg-ink/50 px-3 py-2"
              >
                {file.relativePath}: {file.status}
                {file.message ? ` - ${file.message}` : ""}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-5">
        {patchPlan.files.length ? (
          patchPlan.files.map((file) => (
            <article
              key={file.relativePath}
              className="rounded-3xl border border-white/10 bg-ink/40 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="font-display text-lg font-semibold text-white">
                    {file.relativePath}
                  </h4>
                  {file.notes ? (
                    <p className="mt-2 text-sm text-slate-400">{file.notes}</p>
                  ) : null}
                </div>
                <span className="rounded-full border border-skyglass/20 bg-skyglass/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-skyglass">
                  {file.changeType}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onApplyFile(file.relativePath)}
                  disabled={!canApply || applyLoading}
                  className="rounded-full border border-mint/30 px-3 py-2 text-xs font-bold text-mint transition hover:bg-mint/10 disabled:opacity-40"
                >
                  Áp dụng tệp
                </button>
                <button
                  type="button"
                  onClick={() => onRejectFile(file.relativePath)}
                  className="rounded-full border border-ember/30 px-3 py-2 text-xs font-bold text-ember transition hover:bg-ember/10"
                >
                  Từ chối tệp
                </button>
                <button
                  type="button"
                  onClick={() => onCopyFileContent(file.relativePath)}
                  className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-white transition hover:border-skyglass/50"
                >
                  Sao chép tệp mới
                </button>
              </div>
              <div className="mt-4">
                <DiffViewer diff={diffTextByFile[file.relativePath] ?? ""} />
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-white/10 bg-ink/50 p-4 text-sm text-slate-400">
            Không có thay đổi tệp nào được tạo.
          </div>
        )}
      </div>

      {isConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-panel p-6 shadow-glow">
            <h3 className="font-display text-2xl font-semibold text-white">
              Áp dụng thay đổi?
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Thao tác này sẽ sửa {patchPlan.files.length} tệp trong dự án. Bản
              sao lưu sẽ được tạo trước.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmApply}
                className="rounded-full bg-mint px-5 py-3 text-sm font-extrabold text-ink transition hover:bg-mint/90"
              >
                Áp dụng thay đổi
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
