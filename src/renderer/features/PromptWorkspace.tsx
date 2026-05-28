import { useEffect, useState } from "react";
import { useProjectStore } from "../stores/projectStore";
import { PromptVariantCard } from "../components/PromptVariantCard";
import { PatchPreview } from "../components/PatchPreview";
import { createUnifiedDiff } from "../services/diff";
import type {
  AiNetworkEvent,
  DetectedIntent,
  ProjectContext,
  ProjectContextFile,
  ProjectContextSummary,
  PromptVariant,
} from "../../shared/types";

type RequestStyle = "direct" | "planned";
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  kind?: "plan" | "answer" | "patch" | "error";
};

const EDIT_CONTEXT_EXTENSIONS = new Set([
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

function buildProjectContext(
  selectedFolder: string,
  files: { relativePath: string; extension: string }[],
): ProjectContextSummary {
  const extensions = files.reduce<Record<string, number>>((acc, file) => {
    const key = file.extension || "[none]";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return {
    folderName:
      selectedFolder.split(/[\\/]/).filter(Boolean).pop() ?? selectedFolder,
    fileCount: files.length,
    topFiles: files.slice(0, 50).map((file) => file.relativePath),
    extensions,
  };
}

function buildExecutionProjectContext(
  selectedFolder: string,
  files: { relativePath: string; extension: string }[],
): ProjectContext {
  const baseContext = buildProjectContext(selectedFolder, files);
  return {
    ...baseContext,
    folderPath: selectedFolder,
    topFiles: files.slice(0, 100).map((file) => file.relativePath),
  };
}

function uniqueFilePaths(filePaths: string[]): string[] {
  return Array.from(
    new Set(
      filePaths
        .map((filePath) => filePath.replace(/\\/g, "/").trim())
        .filter(Boolean),
    ),
  );
}

function FormattedAiResponse({ content }: { content: string }): JSX.Element {
  const parts = content.split(/```([\w.+-]*)\n?([\s\S]*?)```/g);
  return (
    <div className="space-y-4 text-sm leading-7 text-slate-200">
      {parts.map((part, index) => {
        if (index % 3 === 1) return null;
        if (index % 3 === 2) {
          const language = parts[index - 1]?.trim();
          return (
            <div
              key={`${index}-${part.slice(0, 12)}`}
              className="overflow-hidden rounded-2xl border border-white/10 bg-ink/80"
            >
              {language ? (
                <div className="border-b border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {language}
                </div>
              ) : null}
              <pre className="overflow-x-auto p-4 text-xs leading-6 text-slate-100">
                <code>{part.trim()}</code>
              </pre>
            </div>
          );
        }
        return part
          .split(/\n{2,}/)
          .filter(Boolean)
          .map((block, blockIndex) => (
            <p key={`${index}-${blockIndex}`} className="whitespace-pre-wrap">
              {block}
            </p>
          ));
      })}
    </div>
  );
}

export function PromptWorkspace(): JSX.Element {
  const [requestStyle, setRequestStyle] = useState<RequestStyle>("planned");
  const [draftRequest, setDraftRequest] = useState("");
  const [submittedMessage, setSubmittedMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [lastNetworkEvent, setLastNetworkEvent] =
    useState<AiNetworkEvent | null>(null);
  const [stopping, setStopping] = useState(false);
  const {
    selectedFolder,
    scannedFiles,
    projectSummary,
    rawRequest,
    selectedPromptVariant,
    promptVariants,
    detectedIntent,
    refinedPrompt,
    executionPlan,
    taskBreakdown,
    implementationSuggestions,
    isLoading,
    isOptimizing,
    executionResult,
    executionLoading,
    executionMode,
    executionError,
    executionStartedAt,
    executionFinishedAt,
    loadedContextFiles,
    patchPlan,
    patchLoading,
    patchError,
    patchWarnings,
    diffTextByFile,
    applyLoading,
    applyError,
    lastApplyResult,
    rollbackLoading,
    rollbackError,
    rollbackResult,
    error,
    setSelectedFolder,
    setScannedFiles,
    setProjectSummary,
    setRawRequest,
    setPromptOptimization,
    setSelectedPromptVariant,
    setLoading,
    setOptimizing,
    setExecutionResult,
    setExecutionMode,
    setExecutionLoading,
    setExecutionError,
    setExecutionStartedAt,
    setExecutionFinishedAt,
    clearExecution,
    setPatchPlan,
    setPatchLoading,
    clearPatchPlan,
    setPatchError,
    applyPatch,
    rollbackLastPatch,
    clearApplyResult,
    clearContextFiles,
    saveProjectMemory,
    createCurrentSession,
    updateCurrentSession,
    setError,
    refreshCodexStatus,
  } = useProjectStore();

  useEffect(() => {
    if (typeof window.doni.onAiNetworkEvent !== "function") return;
    return window.doni.onAiNetworkEvent((event) => setLastNetworkEvent(event));
  }, []);

  const appendChatMessage = (message: Omit<ChatMessage, "id">): void => {
    setChatMessages((current) => [
      ...current,
      {
        ...message,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
    ]);
  };

  const openProjectFolder = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.doni.openProjectFolder();
      if (result.canceled || !result.folderPath || !result.scan) return;
      setSelectedFolder(result.folderPath);
      setScannedFiles(result.scan.files);
      setProjectSummary(result.scan.summary);
      clearContextFiles();
      clearExecution();
      clearApplyResult();
      await saveProjectMemory(result.folderPath, result.scan.files);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể mở thư mục dự án.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const planTask = async (requestText = rawRequest): Promise<void> => {
    const trimmedRequest = requestText.trim();
    if (!selectedFolder) {
      setError("Hãy mở thư mục dự án trước khi lập kế hoạch.");
      return;
    }
    if (!trimmedRequest) {
      setError("Hãy mô tả việc bạn muốn AI làm trước.");
      return;
    }

    if (
      typeof window.doni.getSettings !== "function" ||
      typeof window.doni.optimizePrompt !== "function"
    ) {
      setError(
        "Electron preload API đã cũ. Hãy khởi động lại toàn bộ app, không chỉ refresh React.",
      );
      return;
    }

    setError(null);
    setSelectedPromptVariant(null);
    clearExecution();
    setOptimizing(true);
    try {
      const settings = await window.doni.getSettings();
      if (settings.executorProvider === "codex") {
        const effectiveIntent = buildDirectIntent(trimmedRequest);
        const effectiveVariant = buildDirectVariant(trimmedRequest);
        const canWrite = settings.codexSandbox === "workspace-write";
        const response = await window.doni.runCodexCli({
          folderPath: selectedFolder,
          sandbox: settings.codexSandbox,
          model: settings.executorModel || settings.model,
          prompt: [
            "You are being called from Doni, a desktop AI coding companion.",
            canWrite
              ? "You may modify files inside the workspace if that is necessary. Keep edits small and summarize every changed file."
              : "Do not modify files. Analyze the project and return a reviewable plan plus unified diff suggestions if code should change.",
            canWrite
              ? "After editing, include verification commands the user should run."
              : "The user will review/apply changes in Doni, so do not claim that edits were applied.",
            "",
            `Yêu cầu gốc:\n${trimmedRequest}`,
            "",
            `${requestStyle === "direct" ? "Prompt" : "Chiến lược đã chọn"}:\n${effectiveVariant.title}\n${effectiveVariant.prompt}`,
          ].join("\n"),
        });
        setExecutionResult({
          content: response.content,
          createdAt: response.finishedAt,
        });
        appendChatMessage({
          role: "assistant",
          kind: "answer",
          content: response.content,
        });
        await updateCurrentSession({
          rawRequest: trimmedRequest,
          detectedIntent: effectiveIntent,
          selectedVariant: effectiveVariant,
          finalPrompt: effectiveVariant.prompt,
          executionMode: "answer",
          executionResult: response.content,
        });
        return;
      }
      if (
        !settings.apiBase.trim() ||
        !settings.apiKey.trim() ||
        !(settings.plannerModel || settings.model).trim()
      ) {
        throw new Error(
          "Thiếu cài đặt planner. Hãy điền URL API Base, Khóa API và Model A lập kế hoạch.",
        );
      }
      const result = await window.doni.optimizePrompt({
        rawRequest: trimmedRequest,
        projectContext: buildProjectContext(selectedFolder, scannedFiles),
      });
      setPromptOptimization(
        result.detectedIntent,
        result.variants,
        result.refinedPrompt,
        result.executionPlan,
        result.taskBreakdown,
        result.implementationSuggestions,
      );
      await createCurrentSession();
      await updateCurrentSession({
        rawRequest: trimmedRequest,
        detectedIntent: result.detectedIntent,
        refinedPrompt: result.refinedPrompt,
        executionPlan: result.executionPlan,
        taskBreakdown: result.taskBreakdown,
        implementationSuggestions: result.implementationSuggestions,
        promptVariants: result.variants,
      });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Lập kế hoạch thất bại.";
      setError(
        message.replace(
          /^Error invoking remote method 'optimize-prompt': Error: /,
          "",
        ),
      );
    } finally {
      setOptimizing(false);
    }
  };

  const buildDirectIntent = (requestText: string): DetectedIntent => ({
    taskType: "unknown",
    summary: requestText.trim() || "Không lập kế hoạch",
    riskLevel: "medium",
    needsProjectContext: true,
  });
  const buildDirectVariant = (requestText: string): PromptVariant => ({
    id: "direct-question",
    title: "Không lập kế hoạch",
    description:
      "Gửi nguyên yêu cầu cho executor, không qua bước lập kế hoạch.",
    prompt: requestText.trim(),
    plan: [],
    tradeoffs: [],
    suggestedFiles: [],
    estimatedRisk: "medium",
  });
  const buildPlannedFallbackVariant = (requestText: string): PromptVariant => ({
    id: "generated-plan",
    title: "Kế hoạch đã generate",
    description:
      "Chạy theo kế hoạch đã tạo mà không cần chọn một strategy riêng.",
    prompt: (refinedPrompt || requestText).trim(),
    plan: executionPlan,
    tradeoffs: [],
    suggestedFiles: uniqueFilePaths(
      promptVariants.flatMap((variant) => variant.suggestedFiles),
    ),
    estimatedRisk: detectedIntent?.riskLevel ?? "medium",
  });
  const activeRequestText = submittedMessage || rawRequest;
  const directIntent = buildDirectIntent(activeRequestText);
  const directVariant = buildDirectVariant(activeRequestText);
  const plannedFallbackVariant =
    requestStyle === "planned" && detectedIntent && activeRequestText.trim()
      ? buildPlannedFallbackVariant(activeRequestText)
      : undefined;
  const plannedVariant = promptVariants.find(
    (variant) => variant.id === selectedPromptVariant,
  );
  const selectedVariant =
    requestStyle === "direct"
      ? activeRequestText.trim()
        ? directVariant
        : undefined
      : plannedVariant ?? plannedFallbackVariant;
  const executionIntent =
    requestStyle === "direct" ? directIntent : detectedIntent;
  const canRunTask = Boolean(
    selectedFolder &&
    activeRequestText.trim() &&
    selectedVariant?.prompt.trim() &&
    (requestStyle === "direct" || detectedIntent),
  );
  async function loadEditContextFiles(
    settingsMaxContextFiles: number,
    contextVariant = selectedVariant,
  ): Promise<ProjectContextFile[]> {
    if (!selectedFolder) return [];
    if (loadedContextFiles.length) return loadedContextFiles;

    const scannedPathSet = new Set(
      scannedFiles.map((file) => file.relativePath),
    );
    const fallbackPaths = uniqueFilePaths([
      ...(contextVariant?.suggestedFiles ?? []),
      ...(projectSummary?.importantFiles ?? []),
      ...(projectSummary?.entryPoints ?? []),
      ...scannedFiles
        .filter((file) =>
          EDIT_CONTEXT_EXTENSIONS.has(file.extension.toLowerCase()),
        )
        .map((file) => file.relativePath),
    ])
      .filter((filePath) => scannedPathSet.has(filePath))
      .slice(0, Math.max(1, Math.min(30, settingsMaxContextFiles || 10)));

    if (!fallbackPaths.length) {
      throw new Error(
        "Không tìm thấy tệp phù hợp để tạo bản chỉnh sửa. Hãy mở đúng thư mục dự án hoặc lập kế hoạch trước.",
      );
    }

    const result = await window.doni.readProjectFiles({
      folderPath: selectedFolder,
      relativePaths: fallbackPaths,
    });
    return result.files;
  }

  const runTask = async (
    requestText = rawRequest,
    variantOverride?: PromptVariant,
  ): Promise<void> => {
    const trimmedRequest = requestText.trim();
    const effectiveVariant =
      requestStyle === "direct"
        ? buildDirectVariant(trimmedRequest)
        : variantOverride ?? selectedVariant;
    const effectiveIntent =
      requestStyle === "direct"
        ? buildDirectIntent(trimmedRequest)
        : executionIntent;
    if (!selectedFolder) {
      setExecutionError("Hãy mở thư mục dự án trước khi chạy tác vụ.");
      return;
    }
    if (!effectiveIntent || !effectiveVariant) {
      setExecutionError("Hãy chọn chiến lược trước.");
      return;
    }
    if (!effectiveVariant.prompt.trim()) {
      setExecutionError("Prompt cuối đang trống. Hãy chọn chiến lược trước.");
      return;
    }
    if (typeof window.doni.executePrompt !== "function") {
      setExecutionError(
        "Electron preload API đã cũ. Hãy khởi động lại toàn bộ app, không chỉ refresh React.",
      );
      return;
    }

    const startedAt = new Date().toISOString();
    setExecutionLoading(true);
    setPatchLoading(executionMode === "patch");
    setExecutionError(null);
    setPatchError(null);
    clearApplyResult();
    setExecutionResult(null);
    clearPatchPlan();
    setExecutionStartedAt(startedAt);
    setExecutionFinishedAt(null);

    try {
      const settings = await window.doni.getSettings();
      if (
        !settings.apiBase.trim() ||
        !settings.apiKey.trim() ||
        !(settings.executorModel || settings.model).trim()
      ) {
        throw new Error(
          "Thiếu cài đặt executor. Hãy điền URL API Base, Khóa API và Model B executor.",
        );
      }
      const contextFiles =
        executionMode === "patch"
          ? await loadEditContextFiles(
              settings.maxContextFiles,
              effectiveVariant,
            )
          : loadedContextFiles;
      const result = await window.doni.executePrompt({
        rawRequest: trimmedRequest,
        finalPrompt: effectiveVariant.prompt,
        selectedVariant: effectiveVariant,
        detectedIntent: effectiveIntent,
        projectContext: buildExecutionProjectContext(
          selectedFolder,
          scannedFiles,
        ),
        contextFiles,
        executionMode,
      });
      setExecutionResult(result);
      appendChatMessage({
        role: "assistant",
        kind: executionMode === "patch" ? "patch" : "answer",
        content:
          executionMode === "patch"
            ? "Mình đã tạo bản chỉnh sửa xem trước bên dưới."
            : result.content,
      });
      await updateCurrentSession({
        rawRequest: trimmedRequest,
        detectedIntent: effectiveIntent,
        selectedVariant: effectiveVariant,
        finalPrompt: effectiveVariant.prompt,
        executionMode,
        executionResult: result.content,
        loadedContextFilePaths: contextFiles.map((file) => file.relativePath),
      });
      if (executionMode === "patch") {
        if (!result.patchPlan) {
          throw new Error("AI không trả về patch plan hợp lệ.");
        }
        const diffs = Object.fromEntries(
          result.patchPlan.files.map((file) => [
            file.relativePath,
            createUnifiedDiff(
              file.relativePath,
              file.oldContent,
              file.newContent,
            ),
          ]),
        );
        setPatchPlan(
          result.patchPlan,
          result.patchWarnings ?? result.patchPlan.warnings,
          diffs,
        );
        await updateCurrentSession({
          patchPlanSummary: {
            summary: result.patchPlan.summary,
            riskLevel: result.patchPlan.riskLevel,
            changedFiles: result.patchPlan.files.map(
              (file) => file.relativePath,
            ),
          },
        });
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Chạy tác vụ thất bại.";
      const cleanMessage = message.replace(
        /^Error invoking remote method 'ai:executePrompt': Error: /,
        "",
      );
      if (executionMode === "patch") {
        setPatchError(cleanMessage);
      } else {
        setExecutionError(cleanMessage);
      }
      appendChatMessage({
        role: "assistant",
        kind: "error",
        content: cleanMessage,
      });
    } finally {
      setExecutionLoading(false);
      setPatchLoading(false);
      setExecutionFinishedAt(new Date().toISOString());
    }
  };

  const runCodexTask = async (): Promise<void> => {
    if (!selectedFolder) {
      setExecutionError("Hãy mở thư mục dự án trước khi chạy Codex CLI.");
      return;
    }
    if (!selectedVariant) {
      setExecutionError("Hãy chọn chiến lược trước.");
      return;
    }
    const startedAt = new Date().toISOString();
    setExecutionLoading(true);
    setExecutionError(null);
    setExecutionResult(null);
    clearPatchPlan();
    setExecutionStartedAt(startedAt);
    setExecutionFinishedAt(null);
    try {
      const settings = await window.doni.getSettings();
      const canWrite = settings.codexSandbox === "workspace-write";
      const response = await window.doni.runCodexCli({
        folderPath: selectedFolder,
        sandbox: settings.codexSandbox,
        model: settings.executorModel || settings.model,
        prompt: [
          "You are being called from Doni, a desktop AI coding companion.",
          canWrite
            ? "You may modify files inside the workspace if that is necessary. Keep edits small and summarize every changed file."
            : "Do not modify files. Analyze the project and return a reviewable plan plus unified diff suggestions if code should change.",
          canWrite
            ? "After editing, include verification commands the user should run."
            : "The user will review/apply changes in Doni, so do not claim that edits were applied.",
          "",
          `Yêu cầu gốc:\n${rawRequest.trim()}`,
          "",
          `${requestStyle === "direct" ? "Prompt" : "Chiến lược đã chọn"}:\n${selectedVariant.title}\n${selectedVariant.prompt}`,
        ].join("\n"),
      });
      setExecutionResult({
        content: response.content,
        createdAt: response.finishedAt,
      });
      await updateCurrentSession({
        rawRequest: rawRequest.trim(),
        detectedIntent: executionIntent ?? undefined,
        selectedVariant,
        finalPrompt: selectedVariant.prompt,
        executionMode: "answer",
        executionResult: response.content,
      });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Codex CLI thất bại.";
      setExecutionError(
        message.replace(
          /^Error invoking remote method 'codex:run': Error: /,
          "",
        ),
      );
    } finally {
      setExecutionLoading(false);
      setExecutionFinishedAt(new Date().toISOString());
      await refreshCodexStatus();
    }
  };

  const copyExecutionResult = async (): Promise<void> => {
    if (!executionResult?.content) return;
    await navigator.clipboard.writeText(executionResult.content);
  };

  const primaryAction = async (): Promise<void> => {
    const freshDraft = draftRequest.trim();
    const message = freshDraft || submittedMessage.trim() || rawRequest.trim();
    if (!message) return;
    const shouldAppendUserMessage = Boolean(
      freshDraft || !submittedMessage.trim(),
    );
    if (freshDraft && requestStyle === "planned") {
      setSelectedPromptVariant(null);
      clearPatchPlan();
      clearExecution();
    }
    setSubmittedMessage(message);
    setRawRequest(message);
    setDraftRequest("");
    setLastNetworkEvent(null);
    if (shouldAppendUserMessage) {
      appendChatMessage({ role: "user", content: message });
    }
    if (requestStyle === "planned" && (freshDraft || !selectedVariant)) {
      await planTask(message);
      return;
    }
    await runTask(message);
  };

  const selectPlanAndRun = async (variantId: string): Promise<void> => {
    const variant = promptVariants.find((item) => item.id === variantId);
    const message = submittedMessage.trim() || rawRequest.trim();
    if (!variant || !message) return;
    setSelectedPromptVariant(variantId);
    await runTask(message, variant);
  };

  const stopActiveRun = async (): Promise<void> => {
    setStopping(true);
    try {
      await window.doni.cancelActiveAi();
      setError("Đã dừng request đang chạy.");
      setExecutionError("Đã dừng request đang chạy.");
      setOptimizing(false);
      setExecutionLoading(false);
      setPatchLoading(false);
    } finally {
      setStopping(false);
    }
  };

  const openProjectInVSCode = async (): Promise<void> => {
    if (!selectedFolder) return;
    await window.doni.openInVSCode({ folderPath: selectedFolder });
  };

  const backToStrategies = (): void => {
    clearExecution();
    clearPatchPlan();
    setSelectedPromptVariant(null);
  };

  const copyPatchJson = async (): Promise<void> => {
    if (!patchPlan) return;
    await navigator.clipboard.writeText(JSON.stringify(patchPlan, null, 2));
  };

  const copyDiff = async (): Promise<void> => {
    const diffText = Object.values(diffTextByFile).join("\n\n");
    if (!diffText) return;
    await navigator.clipboard.writeText(diffText);
  };

  const rejectPatchFile = (relativePath: string): void => {
    if (!patchPlan) return;
    const nextPlan = {
      ...patchPlan,
      files: patchPlan.files.filter(
        (file) => file.relativePath !== relativePath,
      ),
    };
    const nextDiffs = Object.fromEntries(
      nextPlan.files.map((file) => [
        file.relativePath,
        createUnifiedDiff(file.relativePath, file.oldContent, file.newContent),
      ]),
    );
    setPatchPlan(nextPlan, patchWarnings, nextDiffs);
  };

  const applyPatchFile = async (relativePath: string): Promise<void> => {
    if (!selectedFolder) return;
    await applyPatch(selectedFolder, [relativePath]);
  };

  const copyPatchFileContent = async (relativePath: string): Promise<void> => {
    const file = patchPlan?.files.find(
      (item) => item.relativePath === relativePath,
    );
    if (!file) return;
    await navigator.clipboard.writeText(file.newContent);
  };

  const hasBlockingPatchWarning = patchWarnings.some((warning) =>
    /not loaded as context|removed from the preview|oldContent does not match|not safe to apply|stale/i.test(
      warning,
    ),
  );
  const canApplyPatch = Boolean(
    selectedFolder &&
    patchPlan?.files.length &&
    !hasBlockingPatchWarning &&
    !applyLoading &&
    !executionLoading,
  );
  const composerMessage =
    draftRequest.trim() || submittedMessage.trim() || rawRequest.trim();

  return (
    <main className="flex-1 overflow-hidden">
      <section className="flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-200">
              {selectedFolder ? selectedFolder : "Chưa mở dự án"}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {scannedFiles.length} tệp được lập chỉ mục
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={openProjectFolder}
              disabled={isLoading}
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-white transition hover:border-mint/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Đang quét..." : "Mở dự án"}
            </button>
            <button
              type="button"
              onClick={openProjectInVSCode}
              disabled={!selectedFolder}
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-white transition hover:border-mint/50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              VS Code
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-7 py-8">
            {!chatMessages.length &&
            !executionResult &&
            !promptVariants.length &&
            !isOptimizing ? (
              <div className="flex flex-1 items-center justify-center text-center">
                <div>
                  <h2 className="font-display text-3xl font-semibold text-white">
                    Doni có thể giúp gì?
                  </h2>
                  <p className="mt-3 text-sm text-slate-500">
                    Mở dự án, nhập yêu cầu, AI sẽ làm tất cả
                  </p>
                </div>
              </div>
            ) : null}

            {chatMessages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[82%] rounded-[1.5rem] bg-white/[0.08] px-5 py-4 text-sm leading-7 text-slate-100">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div key={message.id} className="max-w-[92%]">
                  <div
                    className={`rounded-[1.5rem] px-5 py-4 text-sm leading-7 ${
                      message.kind === "error"
                        ? "border border-ember/30 bg-ember/10 text-ember"
                        : message.kind === "patch"
                          ? "border border-skyglass/20 bg-skyglass/10 text-slate-200"
                          : "text-slate-200"
                    }`}
                  >
                    {message.kind === "answer" ? (
                      <FormattedAiResponse content={message.content} />
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ),
            )}

            {error ? (
              <div className="rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm font-medium text-ember">
                {error}
              </div>
            ) : null}

            {isOptimizing ? (
              <div className="max-w-[82%] rounded-[1.5rem] border border-white/10 bg-panelSoft/70 px-5 py-4 text-sm text-slate-300">
                Đang lập kế hoạch...
              </div>
            ) : null}

            {lastNetworkEvent ? (
              <div className="max-w-[92%] rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-slate-500">
                {lastNetworkEvent.ok
                  ? "Đã gửi request tới AI API"
                  : "Request AI API lỗi"}{" "}
                - {lastNetworkEvent.model} -{" "}
                {lastNetworkEvent.status ?? "network"}
                {typeof lastNetworkEvent.durationMs === "number"
                  ? ` - ${lastNetworkEvent.durationMs}ms`
                  : ""}
                {lastNetworkEvent.error ? ` - ${lastNetworkEvent.error}` : ""}
              </div>
            ) : null}

            {requestStyle === "planned" && detectedIntent ? (
              <div className="max-w-[92%] space-y-4">
                <div className="text-sm leading-7 text-slate-300">
                  <div className="mb-2 font-semibold text-white">
                    Kế hoạch đã sẵn sàng
                  </div>
                  <p>{detectedIntent.summary}</p>
                  {refinedPrompt ? (
                    <p className="mt-3 whitespace-pre-wrap">{refinedPrompt}</p>
                  ) : null}
                </div>
                {executionPlan.length ||
                taskBreakdown.length ||
                implementationSuggestions.length ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      ["Kế hoạch", executionPlan],
                      ["Tác vụ", taskBreakdown],
                      ["Gợi ý", implementationSuggestions],
                    ].map(([title, items]) => (
                      <div
                        key={title as string}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <h4 className="text-sm font-bold text-white">
                          {title as string}
                        </h4>
                        <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-400">
                          {(items as string[]).map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {requestStyle === "planned" && promptVariants.length ? (
              <div className="grid gap-4">
                {promptVariants.map((variant) => (
                  <PromptVariantCard
                    key={variant.id}
                    variant={variant}
                    isSelected={selectedPromptVariant === variant.id}
                    onSelect={(variantId) => void selectPlanAndRun(variantId)}
                  />
                ))}
              </div>
            ) : null}

            {executionError ||
            patchError ||
            executionLoading ||
            executionResult ? (
              <div className="max-w-[92%] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-white">
                    {executionMode === "patch" ? "Bản chỉnh sửa" : "Doni"}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={copyExecutionResult}
                      disabled={!executionResult?.content}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-mint/50 hover:text-mint disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Sao chép
                    </button>
                    <button
                      type="button"
                      onClick={clearExecution}
                      disabled={
                        !executionResult &&
                        !executionError &&
                        !executionStartedAt
                      }
                      className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-ember/50 hover:text-ember disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Xóa
                    </button>
                    <button
                      type="button"
                      onClick={backToStrategies}
                      disabled={
                        requestStyle !== "planned" || !promptVariants.length
                      }
                      className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-skyglass/50 hover:text-skyglass disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Chọn lại
                    </button>
                  </div>
                </div>
                {executionError ? (
                  <div className="rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm font-medium text-ember">
                    {executionError}
                  </div>
                ) : null}
                {patchError ? (
                  <div className="rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm font-medium text-ember">
                    {patchError}
                  </div>
                ) : null}
                {executionLoading ? (
                  <div className="rounded-2xl border border-skyglass/20 bg-skyglass/10 px-4 py-3 text-sm text-slate-300">
                    {patchLoading
                      ? "AI đang tạo bản chỉnh sửa..."
                      : "AI đang trả lời..."}
                  </div>
                ) : null}
              </div>
            ) : null}

            {patchPlan ? (
              <PatchPreview
                patchPlan={patchPlan}
                warnings={patchWarnings}
                diffTextByFile={diffTextByFile}
                applyLoading={applyLoading}
                applyError={applyError}
                lastApplyResult={lastApplyResult}
                rollbackLoading={rollbackLoading}
                rollbackError={rollbackError}
                rollbackResult={rollbackResult}
                canApply={canApplyPatch}
                onCopyPatchJson={copyPatchJson}
                onCopyDiff={copyDiff}
                onDiscard={clearPatchPlan}
                onRejectFile={rejectPatchFile}
                onApplyFile={applyPatchFile}
                onCopyFileContent={copyPatchFileContent}
                onApply={async () => {
                  if (!selectedFolder) return;
                  await applyPatch(selectedFolder);
                }}
                onRollback={rollbackLastPatch}
              />
            ) : null}
          </div>
        </div>

        <div className="border-t border-white/10 bg-ink/95 px-5 py-4">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-3 shadow-glow backdrop-blur transition focus-within:border-mint/40 focus-within:bg-white/[0.08]">
              <textarea
                id="raw-request"
                value={draftRequest}
                onChange={(event) => setDraftRequest(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    (event.ctrlKey || event.metaKey) &&
                    event.key === "Enter"
                  ) {
                    event.preventDefault();
                    void (isOptimizing || executionLoading
                      ? stopActiveRun()
                      : primaryAction());
                  }
                }}
                placeholder="Hãy nhập ở đây..."
                className="min-h-24 w-full resize-none rounded-3xl border-0 bg-transparent px-3 py-3 text-base leading-7 text-slate-100 outline-none placeholder:text-slate-500"
              />
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-1 pt-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <select
                    aria-label="Luồng xử lý"
                    value={requestStyle}
                    onChange={(event) => {
                      const nextStyle = event.target.value as RequestStyle;
                      setRequestStyle(nextStyle);
                      setError(null);
                      if (nextStyle === "direct")
                        setSelectedPromptVariant(null);
                      clearExecution();
                      clearPatchPlan();
                    }}
                    className="h-10 rounded-full border border-white/10 bg-ink/80 px-3 text-sm font-semibold text-slate-200 outline-none transition hover:border-white/20 focus:border-mint/60"
                  >
                    <option value="planned">Lập kế hoạch</option>
                    <option value="direct">Không lập kế hoạch</option>
                  </select>
                  <select
                    aria-label="Cách phản hồi"
                    value={executionMode}
                    onChange={(event) => {
                      setExecutionMode(
                        event.target.value === "patch" ? "patch" : "answer",
                      );
                      if (event.target.value === "answer") clearPatchPlan();
                      setPatchError(null);
                    }}
                    className="h-10 rounded-full border border-white/10 bg-ink/80 px-3 text-sm font-semibold text-slate-200 outline-none transition hover:border-white/20 focus:border-mint/60"
                  >
                    <option value="answer">Chỉ trả lời</option>
                    <option value="patch">Chỉnh sửa</option>
                  </select>
                </div>
                <button
                  type="button"
                  title={isOptimizing || executionLoading ? "Dừng" : "Gửi"}
                  onClick={
                    isOptimizing || executionLoading
                      ? stopActiveRun
                      : primaryAction
                  }
                  disabled={
                    stopping ||
                    (!(isOptimizing || executionLoading) &&
                      (!selectedFolder || !composerMessage))
                  }
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg font-black text-ink transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    isOptimizing || executionLoading
                      ? "bg-ember hover:bg-ember/90"
                      : executionMode === "patch"
                        ? "bg-skyglass hover:bg-skyglass/90"
                        : "bg-mint hover:bg-mint/90"
                  }`}
                >
                  {isOptimizing || executionLoading ? "■" : "↑"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
