import { useEffect, useMemo, useState } from 'react';
import type { ProjectFile } from '../../shared/types';
import { useProjectStore } from '../stores/projectStore';

const CONTEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss', '.html', '.md', '.yml', '.yaml']);
const UI_TERMS = ['ui', 'design', 'responsive', 'layout', 'scroll', 'mobile'];
const API_TERMS = ['api', 'request', 'fetch', 'service'];
const STORE_TERMS = ['store', 'state', 'zustand', 'redux'];
const ROUTE_TERMS = ['route', 'page', 'screen'];

function tokenizeRequest(rawRequest: string): string[] {
  return rawRequest
    .toLowerCase()
    .split(/[^a-z0-9_.-]+/)
    .filter((token) => token.length >= 3);
}

function hasAnyTerm(rawRequest: string, terms: string[]): boolean {
  const lowerRequest = rawRequest.toLowerCase();
  return terms.some((term) => lowerRequest.includes(term));
}

function scoreFile(file: ProjectFile, rawRequest: string): number {
  const path = file.relativePath.toLowerCase();
  const extension = file.extension.toLowerCase();
  const tokens = tokenizeRequest(rawRequest);
  let score = 0;

  tokens.forEach((token) => {
    if (path.includes(token)) score += 5;
  });

  if (['.tsx', '.ts', '.jsx', '.js', '.css', '.scss'].includes(extension)) score += 2;
  if (hasAnyTerm(rawRequest, UI_TERMS) && ['.tsx', '.jsx', '.css', '.scss'].includes(extension)) score += 8;
  if (hasAnyTerm(rawRequest, API_TERMS) && /(api|service|request|client|fetch)/i.test(path)) score += 8;
  if (hasAnyTerm(rawRequest, STORE_TERMS) && /(store|state|zustand|redux)/i.test(path)) score += 8;
  if (hasAnyTerm(rawRequest, ROUTE_TERMS) && /(route|router|page|screen)/i.test(path)) score += 8;

  return score;
}

function suggestFiles(files: ProjectFile[], rawRequest: string): string[] {
  return files
    .filter((file) => CONTEXT_EXTENSIONS.has(file.extension.toLowerCase()))
    .map((file) => ({ file, score: scoreFile(file, rawRequest) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.file.relativePath.localeCompare(b.file.relativePath))
    .slice(0, 8)
    .map((item) => item.file.relativePath);
}

interface FileCheckboxProps {
  filePath: string;
  checked: boolean;
  disabled: boolean;
  onToggle: (filePath: string) => void;
}

function FileCheckbox({ filePath, checked, disabled, onToggle }: FileCheckboxProps): JSX.Element {
  return (
    <label className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-ink/50 px-3 py-2 text-sm text-slate-300 transition hover:border-white/20">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled && !checked}
        onChange={() => onToggle(filePath)}
        className="h-4 w-4 accent-mint"
      />
      <span className="truncate">{filePath}</span>
    </label>
  );
}

export function ContextFilesPanel({ selectedFolder, scannedFiles, rawRequest }: { selectedFolder: string | null; scannedFiles: ProjectFile[]; rawRequest: string }): JSX.Element {
  const [search, setSearch] = useState('');
  const {
    selectedContextFilePaths,
    loadedContextFiles,
    contextLoading,
    contextError,
    suggestedFilePaths,
    toggleContextFile,
    clearContextFiles,
    loadContextFiles,
    setSuggestedFilePaths,
  } = useProjectStore();

  const supportedFiles = useMemo(() => scannedFiles.filter((file) => CONTEXT_EXTENSIONS.has(file.extension.toLowerCase())), [scannedFiles]);
  const suggested = useMemo(() => suggestFiles(scannedFiles, rawRequest), [scannedFiles, rawRequest]);
  const suggestedSet = useMemo(() => new Set(suggestedFilePaths), [suggestedFilePaths]);

  useEffect(() => {
    setSuggestedFilePaths(suggested);
  }, [setSuggestedFilePaths, suggested]);

  const filteredFiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    const files = supportedFiles.filter((file) => !suggestedSet.has(file.relativePath));
    if (!query) return files.slice(0, 80);
    return files.filter((file) => file.relativePath.toLowerCase().includes(query)).slice(0, 80);
  }, [search, suggestedSet, supportedFiles]);

  const disabledByLimit = selectedContextFilePaths.length >= 10;

  const loadSelected = async (): Promise<void> => {
    if (!selectedFolder) return;
    await loadContextFiles(selectedFolder);
  };

  return (
    <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-skyglass">Step 4 Project Context</p>
          <h3 className="mt-3 font-display text-2xl font-semibold text-white">Context Files</h3>
          <p className="mt-2 text-sm text-slate-500">Choose up to 10 text/code files. File contents are read only through Electron IPC.</p>
        </div>
        <div className="rounded-full border border-mint/30 bg-mint/10 px-4 py-2 text-sm font-semibold text-mint">
          {selectedContextFilePaths.length}/10 selected
        </div>
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search files by path..."
        className="mt-5 w-full rounded-2xl border border-white/10 bg-ink/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-mint/60"
      />

      {suggestedFilePaths.length ? (
        <div className="mt-5">
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Suggested Files</div>
          <div className="grid gap-2">
            {suggestedFilePaths.map((filePath) => (
              <FileCheckbox
                key={filePath}
                filePath={filePath}
                checked={selectedContextFilePaths.includes(filePath)}
                disabled={disabledByLimit}
                onToggle={toggleContextFile}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5">
        <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Project Files</div>
        <div className="max-h-72 overflow-y-auto rounded-3xl border border-white/10 bg-ink/30 p-3">
          {filteredFiles.length ? (
            <div className="grid gap-2">
              {filteredFiles.map((file) => (
                <FileCheckbox
                  key={file.relativePath}
                  filePath={file.relativePath}
                  checked={selectedContextFilePaths.includes(file.relativePath)}
                  disabled={disabledByLimit}
                  onToggle={toggleContextFile}
                />
              ))}
            </div>
          ) : (
            <div className="px-3 py-6 text-center text-sm text-slate-500">{selectedFolder ? 'No matching supported files.' : 'Open a project folder first.'}</div>
          )}
        </div>
      </div>

      {contextError ? <div className="mt-4 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm font-medium text-ember">{contextError}</div> : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={loadSelected} disabled={!selectedFolder || contextLoading || selectedContextFilePaths.length === 0} className="rounded-full bg-mint px-5 py-3 text-sm font-extrabold text-ink transition hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-50">
          {contextLoading ? 'Loading context...' : 'Load Selected Context'}
        </button>
        <button type="button" onClick={clearContextFiles} disabled={!selectedContextFilePaths.length && !loadedContextFiles.length} className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-ember/50 hover:text-ember disabled:cursor-not-allowed disabled:opacity-40">
          Clear Context
        </button>
      </div>

      {loadedContextFiles.length ? (
        <div className="mt-5 rounded-3xl border border-mint/20 bg-mint/10 p-4">
          <div className="text-sm font-semibold text-white">Loaded context files</div>
          <div className="mt-3 grid gap-2">
            {loadedContextFiles.map((file) => (
              <div key={file.relativePath} className="rounded-2xl border border-white/10 bg-ink/50 px-3 py-2 text-sm text-slate-300">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="truncate font-semibold text-slate-100">{file.relativePath}</span>
                  <span className="text-xs text-slate-500">{Math.ceil(file.content.length / 1024)}KB loaded{file.truncated ? ' - truncated' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
