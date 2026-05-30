import { useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";
import type { ProjectFile } from "../../shared/types";
import { useProjectStore } from "../stores/projectStore";

const CONTEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".css",
  ".scss",
  ".html",
  ".md",
  ".yml",
  ".yaml",
]);
const UI_TERMS = [
  "ui",
  "design",
  "responsive",
  "layout",
  "scroll",
  "mobile",
  "giao dien",
  "thiet ke",
  "di dong",
];
const API_TERMS = ["api", "request", "fetch", "service"];
const STORE_TERMS = ["store", "state", "zustand", "redux"];
const ROUTE_TERMS = ["route", "page", "screen", "trang"];

interface DroppedFolder {
  path: string;
  filePaths: string[];
}

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

  if ([".tsx", ".ts", ".jsx", ".js", ".css", ".scss"].includes(extension))
    score += 2;
  if (
    hasAnyTerm(rawRequest, UI_TERMS) &&
    [".tsx", ".jsx", ".css", ".scss"].includes(extension)
  )
    score += 8;
  if (
    hasAnyTerm(rawRequest, API_TERMS) &&
    /(api|service|request|client|fetch)/i.test(path)
  )
    score += 8;
  if (
    hasAnyTerm(rawRequest, STORE_TERMS) &&
    /(store|state|zustand|redux)/i.test(path)
  )
    score += 8;
  if (
    hasAnyTerm(rawRequest, ROUTE_TERMS) &&
    /(route|router|page|screen)/i.test(path)
  )
    score += 8;

  return score;
}

function suggestFiles(files: ProjectFile[], rawRequest: string): string[] {
  return files
    .filter((file) => CONTEXT_EXTENSIONS.has(file.extension.toLowerCase()))
    .map((file) => ({ file, score: scoreFile(file, rawRequest) }))
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.file.relativePath.localeCompare(b.file.relativePath),
    )
    .slice(0, 8)
    .map((item) => item.file.relativePath);
}

export function ContextFilesPanel({
  selectedFolder,
  scannedFiles,
  rawRequest,
}: {
  selectedFolder: string | null;
  scannedFiles: ProjectFile[];
  rawRequest: string;
}): JSX.Element {
  const [dragActive, setDragActive] = useState(false);
  const [droppedFolders, setDroppedFolders] = useState<DroppedFolder[]>([]);
  const {
    selectedContextFilePaths,
    loadedContextFiles,
    maxContextFiles,
    contextLoading,
    contextError,
    suggestedFilePaths,
    addContextFile,
    toggleContextFile,
    clearContextFiles,
    loadContextFiles,
    setSuggestedFilePaths,
    setMaxContextFiles,
  } = useProjectStore();

  const supportedFiles = useMemo(
    () =>
      scannedFiles.filter((file) =>
        CONTEXT_EXTENSIONS.has(file.extension.toLowerCase()),
      ),
    [scannedFiles],
  );
  const supportedFilePaths = useMemo(
    () => new Set(supportedFiles.map((file) => file.relativePath)),
    [supportedFiles],
  );
  const selectedFiles = useMemo(
    () =>
      selectedContextFilePaths.filter((filePath) =>
        supportedFilePaths.has(filePath),
      ),
    [selectedContextFilePaths, supportedFilePaths],
  );
  const visibleDroppedFolders = useMemo(
    () =>
      droppedFolders
        .map((folder) => ({
          ...folder,
          selectedCount: folder.filePaths.filter((filePath) =>
            selectedContextFilePaths.includes(filePath),
          ).length,
        }))
        .filter((folder) => folder.selectedCount > 0),
    [droppedFolders, selectedContextFilePaths],
  );
  const selectedStandaloneFiles = useMemo(
    () =>
      selectedFiles.filter(
        (filePath) =>
          !visibleDroppedFolders.some((folder) =>
            filePath.startsWith(
              folder.path.endsWith("/") ? folder.path : `${folder.path}/`,
            ),
          ),
      ),
    [selectedFiles, visibleDroppedFolders],
  );
  const suggested = useMemo(
    () => suggestFiles(scannedFiles, rawRequest),
    [scannedFiles, rawRequest],
  );

  useEffect(() => {
    setSuggestedFilePaths(suggested);
  }, [setSuggestedFilePaths, suggested]);

  useEffect(() => {
    void window.doni
      .getSettings?.()
      .then((settings) => setMaxContextFiles(settings.maxContextFiles))
      .catch(() => undefined);
  }, [setMaxContextFiles]);

  useEffect(() => {
    setDroppedFolders([]);
  }, [selectedFolder]);

  const loadSelected = async (): Promise<void> => {
    if (!selectedFolder) return;
    await loadContextFiles(selectedFolder);
  };

  const clearSelected = (): void => {
    setDroppedFolders([]);
    clearContextFiles();
  };

  const addDroppedPath = (filePath: string, entryKind?: string): void => {
    const normalizedPath = filePath
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .trim();
    if (!normalizedPath) return;

    if (supportedFilePaths.has(normalizedPath)) {
      addContextFile(normalizedPath);
      return;
    }

    const folderPrefix = normalizedPath.endsWith("/")
      ? normalizedPath
      : `${normalizedPath}/`;
    const filesInFolder = supportedFiles
      .map((file) => file.relativePath)
      .filter((relativePath) => relativePath.startsWith(folderPrefix))
      .sort((a, b) => a.localeCompare(b));

    if (!filesInFolder.length) {
      useProjectStore.setState({
        contextError:
          entryKind === "folder"
            ? "Folder này không có tệp code/text hợp lệ để làm ngữ cảnh."
            : "Chỉ kéo tệp hoặc folder code/text đã được quét từ cây dự án bên trái.",
      });
      return;
    }

    setDroppedFolders((current) => {
      const nextFolder = { path: normalizedPath, filePaths: filesInFolder };
      const existingIndex = current.findIndex(
        (folder) => folder.path === normalizedPath,
      );
      if (existingIndex === -1) return [...current, nextFolder];
      return current.map((folder, index) =>
        index === existingIndex ? nextFolder : folder,
      );
    });
    filesInFolder.forEach((relativePath) => addContextFile(relativePath));
  };

  const removeFolder = (folderPath: string): void => {
    const folderPrefix = folderPath.endsWith("/")
      ? folderPath
      : `${folderPath}/`;
    selectedContextFilePaths
      .filter((filePath) => filePath.startsWith(folderPrefix))
      .forEach((filePath) => toggleContextFile(filePath));
    setDroppedFolders((current) =>
      current.filter((folder) => folder.path !== folderPath),
    );
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDragActive(true);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragActive(false);
    const filePath =
      event.dataTransfer.getData("application/x-doni-project-file") ||
      event.dataTransfer.getData("text/plain");
    const entryKind = event.dataTransfer.getData(
      "application/x-doni-project-entry-kind",
    );
    addDroppedPath(filePath, entryKind);
  };

  return (
    <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-skyglass">
            Bước 4: Ngữ cảnh dự án
          </p>
          <h3 className="mt-3 font-display text-2xl font-semibold text-white">
            Tệp ngữ cảnh
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Kéo tệp hoặc folder từ cây dự án bên trái rồi thả vào vùng bên dưới
            để gửi làm ngữ cảnh cho AI.
          </p>
        </div>
        <div className="rounded-full border border-mint/30 bg-mint/10 px-4 py-2 text-sm font-semibold text-mint">
          {selectedContextFilePaths.length}/{maxContextFiles} đã chọn
        </div>
      </div>

      {suggestedFilePaths.length ? (
        <div className="mt-5 rounded-3xl border border-white/10 bg-ink/30 p-4">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            Tệp gợi ý để kéo từ cây bên trái
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestedFilePaths.map((filePath) => (
              <span
                key={filePath}
                className="max-w-full truncate rounded-full border border-white/10 bg-ink/60 px-3 py-1 text-xs font-mono text-slate-300"
              >
                {filePath}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div
        onDragEnter={handleDragOver}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`mt-5 rounded-3xl border border-dashed p-6 text-center transition ${
          dragActive
            ? "border-mint bg-mint/10 text-mint"
            : "border-white/15 bg-ink/30 text-slate-400"
        }`}
      >
        <div className="text-sm font-semibold text-white">
          Thả tệp hoặc folder từ cây dự án vào đây
        </div>
        <div className="mt-2 text-sm">
          {selectedFolder
            ? "Chỉ nhận tệp trong dự án đang mở và thuộc định dạng ngữ cảnh được hỗ trợ."
            : "Hãy mở thư mục dự án trước."}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
          Tệp đã chọn
        </div>
        {visibleDroppedFolders.length || selectedStandaloneFiles.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {visibleDroppedFolders.map((folder) => (
              <div
                key={folder.path}
                className="flex min-w-0 items-center gap-3 rounded-2xl border border-skyglass/20 bg-skyglass/10 px-4 py-3 text-sm text-slate-200"
              >
                <div className="grid h-10 w-14 shrink-0 place-items-center rounded-xl border border-skyglass/30 bg-skyglass/10 text-[10px] font-black text-skyglass">
                  FOLDER
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-sm font-semibold text-white">
                    {folder.path}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Folder - {folder.selectedCount} tep
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Xoa folder ${folder.path}`}
                  onClick={() => removeFolder(folder.path)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 text-lg font-bold leading-none text-slate-400 transition hover:border-ember/50 hover:text-ember"
                >
                  x
                </button>
              </div>
            ))}
            {selectedStandaloneFiles.map((filePath) => (
              <div
                key={filePath}
                className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-ink/50 px-4 py-3 text-sm text-slate-300"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-[10px] font-black text-slate-300">
                  FILE
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-sm font-semibold text-slate-100">
                    {filePath}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    File ngu canh
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Xoa file ${filePath}`}
                  onClick={() => toggleContextFile(filePath)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 text-lg font-bold leading-none text-slate-400 transition hover:border-ember/50 hover:text-ember"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        ) : false && selectedFiles.length ? (
          <div className="grid gap-2">
            {selectedFiles.map((filePath) => (
              <div
                key={filePath}
                className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-ink/50 px-3 py-2 text-sm text-slate-300"
              >
                <span className="truncate font-mono">{filePath}</span>
                <button
                  type="button"
                  onClick={() => toggleContextFile(filePath)}
                  className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300 hover:border-ember/50 hover:text-ember"
                >
                  Bỏ
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-ink/30 px-3 py-5 text-center text-sm text-slate-500">
            Chưa có tệp nào. Kéo tệp từ cây dự án bên trái để chọn.
          </div>
        )}
      </div>

      {contextError ? (
        <div className="mt-4 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm font-medium text-ember">
          {contextError}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={loadSelected}
          disabled={
            !selectedFolder ||
            contextLoading ||
            selectedContextFilePaths.length === 0
          }
          className="rounded-full bg-mint px-5 py-3 text-sm font-extrabold text-ink transition hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {contextLoading ? "Đang tải tệp..." : "Tải tệp đã chọn"}
        </button>
        <button
          type="button"
          onClick={clearSelected}
          disabled={
            !selectedContextFilePaths.length && !loadedContextFiles.length
          }
          className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-ember/50 hover:text-ember disabled:cursor-not-allowed disabled:opacity-40"
        >
          Xóa tệp đã chọn
        </button>
      </div>

      {loadedContextFiles.length ? (
        <div className="mt-5 rounded-3xl border border-mint/20 bg-mint/10 p-4">
          <div className="text-sm font-semibold text-white">
            Tệp ngữ cảnh đã tải
          </div>
          <div className="mt-3 flex flex-col gap-[12px]">
            {loadedContextFiles.map((file) => (
              <div
                key={file.relativePath}
                className="rounded-2xl border border-white/10 bg-ink/50 px-3 py-2 text-sm text-slate-300"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="truncate font-semibold text-slate-100">
                    {file.relativePath}
                  </span>
                  <span className="text-xs text-slate-500">
                    {Math.ceil(file.content.length / 1024)}KB đã tải
                    {file.truncated ? " - đã cắt bớt" : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
