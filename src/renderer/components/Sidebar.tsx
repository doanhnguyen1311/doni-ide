interface SidebarProps {
  selectedFolder: string | null;
  fileCount: number;
}

export function Sidebar({ selectedFolder, fileCount }: SidebarProps): JSX.Element {
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-white/10 bg-panel/90 p-6">
      <div>
        <div className="mb-2 inline-flex rounded-full border border-ember/30 bg-ember/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-ember">
          Nexa
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-white">Doni</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">AI Coding Companion running beside VS Code.</p>
      </div>

      <div className="mt-10 space-y-5">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Project</p>
          <p className="mt-3 break-words text-sm font-medium text-slate-200">
            {selectedFolder ?? 'No folder selected'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Files scanned</p>
          <p className="mt-3 font-display text-4xl font-semibold text-mint">{fileCount}</p>
        </div>
      </div>

      <div className="mt-auto rounded-2xl border border-mint/20 bg-mint/10 p-4 text-sm leading-6 text-mint/90">
        MVP Step 1: folder scan, request capture, prompt variant mock.
      </div>
    </aside>
  );
}