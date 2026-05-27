import type { ProjectFile } from '../../shared/types';

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
  const previewFiles = files.slice(0, 20);

  return (
    <aside className="hidden h-full w-80 shrink-0 border-l border-white/10 bg-panel/80 p-5 xl:block">
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
    </aside>
  );
}