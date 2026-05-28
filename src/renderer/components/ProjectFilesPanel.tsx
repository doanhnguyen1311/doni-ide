import { useMemo, useState } from 'react';
import type { ProjectFile } from '../../shared/types';
import { useProjectStore } from '../stores/projectStore';
import { HistoryPanel } from './HistoryPanel';

interface ProjectFilesPanelProps {
  selectedFolder: string | null;
  files: ProjectFile[];
}

const formatBytes = (size: number): string => (size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`);

function FilePreview({ selectedFolder }: { selectedFolder: string | null }): JSX.Element {
  const previewFile = useProjectStore((state) => state.previewFile);
  const previewLoading = useProjectStore((state) => state.previewLoading);
  const previewError = useProjectStore((state) => state.previewError);

  const openPreviewInCode = async (): Promise<void> => {
    if (!selectedFolder || !previewFile) return;
    await window.doni.openInVSCode({ folderPath: selectedFolder, relativePath: previewFile.relativePath });
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Xem trước tệp</p>
          <h2 className="mt-2 truncate font-display text-xl font-semibold text-white">{previewFile?.relativePath ?? 'Chưa chọn tệp'}</h2>
        </div>
        <button type="button" onClick={openPreviewInCode} disabled={!previewFile} className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-white hover:border-mint/50 disabled:opacity-40">
          VS Code
        </button>
      </div>

      {previewLoading ? <div className="rounded-2xl border border-skyglass/20 bg-skyglass/10 p-4 text-sm text-slate-300">Đang tải tệp...</div> : null}
      {previewError ? <div className="rounded-2xl border border-ember/30 bg-ember/10 p-4 text-sm text-ember">{previewError}</div> : null}
      {!previewFile && !previewLoading ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm leading-6 text-slate-500">Bấm một tệp trong cây dự án để xem tại đây.</div>
      ) : null}
      {previewFile ? (
        <pre className="max-h-[calc(100vh-180px)] overflow-auto rounded-2xl border border-white/10 bg-ink/80 p-4 text-xs leading-6 text-slate-300">
          <code>{previewFile.content}</code>
        </pre>
      ) : null}
    </div>
  );
}

function ChangedFiles(): JSX.Element {
  const patchPlan = useProjectStore((state) => state.patchPlan);
  const lastApplyResult = useProjectStore((state) => state.lastApplyResult);

  return (
    <div className="space-y-3">
      {patchPlan?.files.length ? patchPlan.files.map((file) => (
        <div key={file.relativePath} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <p className="truncate text-sm font-semibold text-slate-100">{file.relativePath}</p>
          <p className="mt-2 text-xs text-slate-500">{file.changeType}</p>
        </div>
      )) : (
        <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm leading-6 text-slate-500">Chưa có patch được tạo.</div>
      )}
      {lastApplyResult ? (
        <div className="rounded-2xl border border-mint/20 bg-mint/10 p-3 text-sm text-slate-300">
          <div className="font-semibold text-white">Tệp đã áp dụng</div>
          {lastApplyResult.appliedFiles.map((file) => <div key={file.relativePath} className="mt-2 truncate text-xs">{file.relativePath}: {file.status}</div>)}
        </div>
      ) : null}
    </div>
  );
}

export function ProjectFilesPanel({ selectedFolder, files }: ProjectFilesPanelProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<'preview' | 'changed' | 'history' | 'files'>('preview');
  const previewFiles = useMemo(() => files.slice(0, 40), [files]);

  return (
    <aside className="hidden h-full w-[28rem] shrink-0 flex-col border-l border-white/10 bg-panel/90 p-5 xl:flex">
      <div className="mb-5 grid grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-ink/40 p-1">
        {[
          ['preview', 'Xem trước'],
          ['changed', 'Đã đổi'],
          ['history', 'Lịch sử'],
          ['files', 'Tệp'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id as typeof activeTab)}
            className={`rounded-xl px-2 py-2 text-xs font-bold transition ${activeTab === id ? 'bg-mint text-ink' : 'text-slate-400 hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'preview' ? <FilePreview selectedFolder={selectedFolder} /> : null}
      {activeTab === 'changed' ? <ChangedFiles /> : null}
      {activeTab === 'history' ? <HistoryPanel /> : null}
      {activeTab === 'files' ? (
        <div className="min-h-0 overflow-y-auto">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Tệp dự án</p>
            <h2 className="mt-2 font-display text-xl font-semibold text-white">Tệp nguồn đã quét</h2>
          </div>
          <div className="space-y-3">
            {previewFiles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm leading-6 text-slate-500">Mở thư mục dự án để xem trước các tệp code đã quét.</div>
            ) : (
              previewFiles.map((file) => (
                <div key={file.absolutePath} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="truncate text-sm font-semibold text-slate-100">{file.relativePath}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>{file.extension}</span>
                    <span>{formatBytes(file.size)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
