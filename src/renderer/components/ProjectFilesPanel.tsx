import { useMemo } from "react";
import type { ReactNode } from "react";
import type { ProjectFile } from "../../shared/types";
import { useProjectStore } from "../stores/projectStore";

interface ProjectFilesPanelProps {
  selectedFolder: string | null;
  files: ProjectFile[];
  width: number;
}

const formatBytes = (size: number): string =>
  size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`;

function PanelSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="rounded-lg border border-white/10 bg-ink/50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
        {title}
      </p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function ProjectFilesPanel({
  selectedFolder,
  files,
  width,
}: ProjectFilesPanelProps): JSX.Element {
  const projectSummary = useProjectStore((state) => state.projectSummary);
  const patchPlan = useProjectStore((state) => state.patchPlan);
  const patchWarnings = useProjectStore((state) => state.patchWarnings);
  const applyLoading = useProjectStore((state) => state.applyLoading);
  const applyError = useProjectStore((state) => state.applyError);
  const lastApplyResult = useProjectStore((state) => state.lastApplyResult);
  const loadedContextFiles = useProjectStore(
    (state) => state.loadedContextFiles,
  );
  const selectedContextFilePaths = useProjectStore(
    (state) => state.selectedContextFilePaths,
  );
  const commandStatus = useProjectStore((state) => state.commandStatus);
  const detectedIntent = useProjectStore((state) => state.detectedIntent);
  const implementationSuggestions = useProjectStore(
    (state) => state.implementationSuggestions,
  );
  const applyPatch = useProjectStore((state) => state.applyPatch);
  const clearPatchPlan = useProjectStore((state) => state.clearPatchPlan);
  const previewProjectFile = useProjectStore(
    (state) => state.previewProjectFile,
  );

  const importantFiles = useMemo(
    () =>
      [
        ...(patchPlan?.files.map((file) => file.relativePath) ?? []),
        ...loadedContextFiles.map((file) => file.relativePath),
        ...selectedContextFilePaths,
        ...(projectSummary?.importantFiles ?? []),
        ...files.slice(0, 8).map((file) => file.relativePath),
      ]
        .filter((value, index, list) => value && list.indexOf(value) === index)
        .slice(0, 10),
    [
      files,
      loadedContextFiles,
      patchPlan,
      projectSummary,
      selectedContextFilePaths,
    ],
  );

  const canApply = Boolean(
    selectedFolder &&
    patchPlan?.files.length &&
    !patchWarnings.length &&
    !applyLoading,
  );
  const projectName =
    selectedFolder?.split(/[\\/]/).filter(Boolean).pop() ?? "No project";

  return (
    <aside
      className="hidden h-full shrink-0 flex-col border-l border-white/10 bg-panel/90 p-5 xl:flex"
      style={{ width }}
    >
      <div className="mb-5 rounded-lg border border-white/10 bg-ink/60 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
          Patch Controls
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              if (selectedFolder) void applyPatch(selectedFolder);
            }}
            disabled={!canApply}
            className="rounded-md bg-mint px-3 py-2 text-xs font-black text-ink transition hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {applyLoading ? "Applying" : "Apply Patch"}
          </button>
          <button
            type="button"
            onClick={clearPatchPlan}
            disabled={!patchPlan}
            className="rounded-md border border-ember/30 px-3 py-2 text-xs font-black text-ember transition hover:bg-ember/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reject
          </button>
        </div>
        <div className="mt-3 flex flex-col gap-[12px] text-xs text-slate-400">
          <div className="flex justify-between gap-3">
            <span>Queued files</span>
            <span>{patchPlan?.files.length ?? 0}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Validation</span>
            <span
              className={
                patchWarnings.length
                  ? "text-ember"
                  : patchPlan
                    ? "text-mint"
                    : "text-slate-500"
              }
            >
              {patchWarnings.length
                ? "blocked"
                : patchPlan
                  ? "ready"
                  : "pending"}
            </span>
          </div>
        </div>
        {applyError ? (
          <div className="mt-3 rounded-md border border-ember/30 bg-ember/10 p-2 text-xs text-ember">
            {applyError}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        <PanelSection title="Project Context">
          <h3 className="truncate font-display text-lg font-semibold text-white">
            {projectName}
          </h3>
          <div className="mt-3 flex flex-col gap-[12px] text-xs text-slate-400">
            <div className="flex justify-between gap-3">
              <span>Indexed files</span>
              <span>{files.length}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Loaded context</span>
              <span>{loadedContextFiles.length}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Terminal</span>
              <span>{commandStatus}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Task type</span>
              <span>{detectedIntent?.taskType ?? "unknown"}</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              ...(projectSummary?.technologies ?? []),
              ...(projectSummary?.frameworks ?? []),
            ]
              .slice(0, 6)
              .map((item) => (
                <span
                  key={item}
                  className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-slate-300"
                >
                  {item}
                </span>
              ))}
          </div>
        </PanelSection>

        <PanelSection title="Open Files">
          <div className="space-y-2">
            {importantFiles.length ? (
              importantFiles.map((filePath) => (
                <button
                  key={filePath}
                  type="button"
                  onClick={() =>
                    void previewProjectFile(selectedFolder, filePath)
                  }
                  className="block w-full truncate rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-left font-mono text-xs text-slate-300 transition hover:border-skyglass/40 hover:text-white"
                >
                  {filePath}
                </button>
              ))
            ) : (
              <div className="text-xs leading-5 text-slate-500">
                Open a project or generate a plan to pin relevant files.
              </div>
            )}
          </div>
        </PanelSection>

        <PanelSection title="Recent Changes">
          <div className="space-y-2 text-xs">
            {lastApplyResult ? (
              lastApplyResult.appliedFiles.map((file) => (
                <div
                  key={file.relativePath}
                  className="rounded-md border border-mint/20 bg-mint/10 px-3 py-2 text-mint"
                >
                  <div className="truncate font-mono">{file.relativePath}</div>
                  <div className="mt-1 opacity-80">{file.status}</div>
                </div>
              ))
            ) : (
              <div className="text-slate-500">
                No patch has been applied in this session.
              </div>
            )}
          </div>
        </PanelSection>

        <PanelSection title="AI Memory">
          <div className="space-y-2 text-xs leading-5 text-slate-400">
            <div>
              Project memory: {projectSummary ? "available" : "pending"}
            </div>
            <div>
              Intent memory:{" "}
              {detectedIntent
                ? detectedIntent.summary
                : "no active task summary"}
            </div>
          </div>
        </PanelSection>

        <PanelSection title="Related Symbols">
          <div className="space-y-2 text-xs text-slate-400">
            {implementationSuggestions.length
              ? implementationSuggestions.slice(0, 5).map((item) => (
                  <div
                    key={item}
                    className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2"
                  >
                    {item}
                  </div>
                ))
              : files.slice(0, 5).map((file) => (
                  <div
                    key={file.absolutePath}
                    className="flex justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2"
                  >
                    <span className="truncate font-mono">
                      {file.relativePath}
                    </span>
                    <span className="shrink-0 text-slate-600">
                      {formatBytes(file.size)}
                    </span>
                  </div>
                ))}
          </div>
        </PanelSection>
      </div>
    </aside>
  );
}
