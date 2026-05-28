import { useEffect, useMemo, useState } from 'react';
import type { ProjectFile, ProjectSummary } from '../../shared/types';
import { useProjectStore } from '../stores/projectStore';

interface TreeNode {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
  file?: ProjectFile;
}

interface SidebarProps {
  selectedFolder: string | null;
  fileCount: number;
  files: ProjectFile[];
  projectSummary: ProjectSummary | null;
}

function buildTree(files: ProjectFile[]): TreeNode {
  const root: TreeNode = { name: 'root', path: '', children: new Map() };
  for (const file of files) {
    const parts = file.relativePath.replace(/\\/g, '/').split('/');
    let current = root;
    parts.forEach((part, index) => {
      const nodePath = parts.slice(0, index + 1).join('/');
      const existing = current.children.get(part);
      if (existing) {
        current = existing;
        return;
      }
      const node: TreeNode = { name: part, path: nodePath, children: new Map(), file: index === parts.length - 1 ? file : undefined };
      current.children.set(part, node);
      current = node;
    });
  }
  return root;
}

function TreeItem({ node, depth, selectedFolder }: { node: TreeNode; depth: number; selectedFolder: string | null }): JSX.Element {
  const [open, setOpen] = useState(depth < 1);
  const previewProjectFile = useProjectStore((state) => state.previewProjectFile);
  const isFile = Boolean(node.file);
  const children = Array.from(node.children.values()).sort((a, b) => Number(Boolean(a.file)) - Number(Boolean(b.file)) || a.name.localeCompare(b.name));

  return (
    <div>
      <button
        type="button"
        draggable={isFile}
        onDragStart={(event) => {
          if (!isFile) return;
          event.dataTransfer.effectAllowed = 'copy';
          event.dataTransfer.setData('application/x-doni-project-file', node.path);
          event.dataTransfer.setData('text/plain', node.path);
        }}
        onClick={() => {
          if (isFile) void previewProjectFile(selectedFolder, node.path);
          else setOpen((value) => !value);
        }}
        className={`flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-300 transition hover:bg-white/[0.06] hover:text-white ${isFile ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        <span className="w-4 shrink-0 text-slate-500">{isFile ? '-' : open ? 'v' : '>'}</span>
        <span className={isFile ? 'truncate font-mono' : 'truncate font-semibold'}>{node.name}</span>
      </button>
      {!isFile && open ? children.map((child) => <TreeItem key={child.path} node={child} depth={depth + 1} selectedFolder={selectedFolder} />) : null}
    </div>
  );
}

export function Sidebar({ selectedFolder, fileCount, files, projectSummary }: SidebarProps): JSX.Element {
  const tree = useMemo(() => buildTree(files), [files]);
  const rootChildren = Array.from(tree.children.values()).sort((a, b) => Number(Boolean(a.file)) - Number(Boolean(b.file)) || a.name.localeCompare(b.name));
  const codexStatus = useProjectStore((state) => state.codexStatus);
  const codexStatusLoading = useProjectStore((state) => state.codexStatusLoading);
  const refreshCodexStatus = useProjectStore((state) => state.refreshCodexStatus);
  const probeCodexStatus = useProjectStore((state) => state.probeCodexStatus);
  const hasRemainingPercent = typeof codexStatus?.remainingPercent === 'number';
  const hasWeeklyRemainingPercent = typeof codexStatus?.weeklyRemainingPercent === 'number';
  const tokenText = typeof codexStatus?.totalTokens === 'number' ? codexStatus.totalTokens.toLocaleString() : null;
  const contextText = typeof codexStatus?.contextWindowTokens === 'number' ? codexStatus.contextWindowTokens.toLocaleString() : null;

  useEffect(() => {
    void refreshCodexStatus();
    const interval = window.setInterval(() => void refreshCodexStatus(), 15000);
    return () => window.clearInterval(interval);
  }, [refreshCodexStatus]);

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-white/10 bg-panel/95">
      <div className="border-b border-white/10 p-5">
        <div className="mb-2 inline-flex rounded-full border border-ember/30 bg-ember/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-ember">
          Codex V2
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-white">Doni</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Bộ não AI cạnh VS Code.</p>
      </div>

      <div className="space-y-3 border-b border-white/10 p-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Dự án</p>
          <p className="mt-2 break-words text-xs font-medium text-slate-200">{selectedFolder ?? 'Chưa chọn thư mục'}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Tệp</p>
            <p className="mt-2 font-display text-3xl font-semibold text-mint">{fileCount}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Công nghệ</p>
            <p className="mt-2 truncate text-sm font-semibold text-skyglass">{projectSummary?.frameworks.slice(0, 2).join(', ') || 'n/a'}</p>
          </div>
        </div>
      </div>

      {projectSummary ? (
        <div className="border-b border-white/10 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Tóm tắt dự án</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[...projectSummary.technologies, ...projectSummary.frameworks].slice(0, 8).map((item) => (
              <span key={item} className="rounded-full border border-white/10 bg-ink/60 px-2 py-1 text-xs text-slate-300">{item}</span>
            ))}
          </div>
          <div className="mt-3 space-y-1 text-xs leading-5 text-slate-500">
            {projectSummary.entryPoints.slice(0, 3).map((file) => <div key={file} className="truncate font-mono">{file}</div>)}
          </div>
        </div>
      ) : null}

      <div className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Trạng thái</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => void refreshCodexStatus()} className="rounded-full border border-white/10 px-2 py-1 text-xs font-bold text-slate-300 hover:border-mint/50">
              {codexStatusLoading ? '...' : 'Làm mới'}
            </button>
            <button type="button" onClick={() => void probeCodexStatus()} className="rounded-full border border-mint/30 px-2 py-1 text-xs font-bold text-mint hover:bg-mint/10">
              Kiểm tra
            </button>
          </div>
        </div>
        <div className={`mt-3 rounded-2xl border p-3 ${codexStatus?.available ? 'border-mint/20 bg-mint/10' : 'border-ember/20 bg-ember/10'}`}>
          <div className="flex items-center justify-between gap-3">
            <span className={codexStatus?.available ? 'text-sm font-bold text-mint' : 'text-sm font-bold text-ember'}>
              {codexStatus?.authenticated === false ? 'Xác thực lỗi' : codexStatus?.authenticated ? 'Dùng được' : codexStatus?.available ? 'Đã kết nối' : 'Không khả dụng'}
            </span>
            <span className="text-xs text-slate-500">{codexStatus?.version ?? 'chưa phát hiện'}</span>
          </div>
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
              <span>Giới hạn 5 giờ</span>
              <span>{hasRemainingPercent ? `${codexStatus.remainingPercent.toFixed(0)}% còn lại` : 'Chưa rõ'}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink/80">
              <div
                className={`h-full rounded-full ${hasRemainingPercent ? 'bg-mint' : 'bg-slate-700'}`}
                style={{ width: `${hasRemainingPercent ? codexStatus.remainingPercent : 100}%` }}
              />
            </div>
            {hasWeeklyRemainingPercent ? (
              <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
                <span>Giới hạn tuần</span>
                <span>{codexStatus.weeklyRemainingPercent.toFixed(0)}% còn lại</span>
              </div>
            ) : null}
          </div>
          <div className="mt-3 space-y-1 text-xs leading-5 text-slate-500">
            <div>Prompt: {codexStatus?.promptCount ?? 0}</div>
            <div>Lần cuối: {codexStatus?.lastRunAt ? new Date(codexStatus.lastRunAt).toLocaleTimeString() : 'n/a'}</div>
            <div>Kiểm tra: {codexStatus?.lastProbeAt ? new Date(codexStatus.lastProbeAt).toLocaleTimeString() : 'n/a'}</div>
            {codexStatus?.lastDurationMs ? <div>Thời lượng: {(codexStatus.lastDurationMs / 1000).toFixed(1)}s</div> : null}
            {tokenText ? <div>Token: {tokenText}{contextText ? ` / ${contextText}` : ''}</div> : null}
            {codexStatus?.lastModel ? <div>Model: {codexStatus.lastModel}</div> : null}
          </div>
          {codexStatus?.remainingSource ? <div className="mt-2 rounded-xl bg-ink/50 p-2 text-xs text-slate-500">{codexStatus.remainingSource}</div> : null}
          {codexStatus?.weeklyRemainingSource ? <div className="mt-2 rounded-xl bg-ink/50 p-2 text-xs text-slate-500">{codexStatus.weeklyRemainingSource}</div> : null}
          {codexStatus?.usageSummary ? <div className="mt-2 rounded-xl bg-ink/50 p-2 text-xs text-slate-500">{codexStatus.usageSummary}</div> : null}
          {codexStatus?.error ? <div className="mt-2 rounded-xl bg-ember/10 p-2 text-xs text-ember">{codexStatus.error}</div> : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mb-2 px-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Cây thư mục</div>
        {rootChildren.length ? rootChildren.map((node) => <TreeItem key={node.path} node={node} depth={0} selectedFolder={selectedFolder} />) : (
          <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm leading-6 text-slate-500">Mở thư mục dự án để quét tệp.</div>
        )}
      </div>
    </aside>
  );
}
