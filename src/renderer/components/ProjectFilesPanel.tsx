import { useState } from 'react';
import type { ProjectFile } from '../../shared/types';
import { HistoryPanel } from './HistoryPanel';

interface ProjectFilesPanelProps {
  files: ProjectFile[];
}

const formatBytes = (size: number): string => {
  if (size < 1024) {
    return `${size} B`;
  }

  return `${(size / 1024).toFixed(1)} KB`;
};

export function ProjectFilesPanel({ files }: ProjectFilesPanelProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<'files' | 'history'>('files');
  const previewFiles = files.slice(0, 20);

  return (
    <aside className="hidden h-full w-96 shrink-0 overflow-y-auto border-l border-white/10 bg-panel/80 p-5 xl:block">
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-ink/40 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('files')}
          className={`rounded-xl px-3 py-2 text-sm font-bold transition ${activeTab === 'files' ? 'bg-mint text-ink' : 'text-slate-400 hover:text-white'}`}
        >
          Files
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`rounded-xl px-3 py-2 text-sm font-bold transition ${activeTab === 'history' ? 'bg-mint text-ink' : 'text-slate-400 hover:text-white'}`}
        >
          History
        </button>
      </div>

      {activeTab === 'files' ? (
        <>
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Project files</p>
            <h2 className="mt-2 font-display text-xl font-semibold text-white">Preview list</h2>
          </div>

          <div className="space-y-3">
            {previewFiles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm leading-6 text-slate-500">
                Open a project folder to preview the first 20 scanned code files.
              </div>
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
        </>
      ) : (
        <HistoryPanel />
      )}
    </aside>
  );
}
