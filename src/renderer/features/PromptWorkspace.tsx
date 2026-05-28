import { useState } from 'react';
import { SettingsPanel } from '../components/SettingsPanel';
import { useProjectStore } from '../stores/projectStore';
import { PromptVariantCard } from '../components/PromptVariantCard';
import { ContextFilesPanel } from '../components/ContextFilesPanel';
import { PatchPreview } from '../components/PatchPreview';
import { VerifyPanel } from '../components/VerifyPanel';
import { createUnifiedDiff } from '../services/diff';
import type { DetectedIntent, ProjectContext, ProjectContextSummary, PromptVariant } from '../../shared/types';

type RequestStyle = 'direct' | 'planned';

function buildProjectContext(selectedFolder: string, files: { relativePath: string; extension: string }[]): ProjectContextSummary {
  const extensions = files.reduce<Record<string, number>>((acc, file) => {
    const key = file.extension || '[none]';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return {
    folderName: selectedFolder.split(/[\\/]/).filter(Boolean).pop() ?? selectedFolder,
    fileCount: files.length,
    topFiles: files.slice(0, 50).map((file) => file.relativePath),
    extensions,
  };
}

function buildExecutionProjectContext(selectedFolder: string, files: { relativePath: string; extension: string }[]): ProjectContext {
  const baseContext = buildProjectContext(selectedFolder, files);
  return {
    ...baseContext,
    folderPath: selectedFolder,
    topFiles: files.slice(0, 100).map((file) => file.relativePath),
  };
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
            <div key={`${index}-${part.slice(0, 12)}`} className="overflow-hidden rounded-2xl border border-white/10 bg-ink/80">
              {language ? <div className="border-b border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{language}</div> : null}
              <pre className="overflow-x-auto p-4 text-xs leading-6 text-slate-100"><code>{part.trim()}</code></pre>
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
  const [requestStyle, setRequestStyle] = useState<RequestStyle>('planned');
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
      const message = caughtError instanceof Error ? caughtError.message : 'Không thể mở thư mục dự án.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const planTask = async (): Promise<void> => {
    if (!selectedFolder) {
      setError('Hãy mở thư mục dự án trước khi lập kế hoạch.');
      return;
    }
    if (!rawRequest.trim()) {
      setError('Hãy mô tả việc bạn muốn AI làm trước.');
      return;
    }

    if (typeof window.doni.getSettings !== 'function' || typeof window.doni.optimizePrompt !== 'function') {
      setError('Electron preload API đã cũ. Hãy khởi động lại toàn bộ app, không chỉ refresh React.');
      return;
    }

    setError(null);
    setSelectedPromptVariant(null);
    clearExecution();
    setOptimizing(true);
    try {
      const settings = await window.doni.getSettings();
      if (!settings.apiBase.trim() || !settings.apiKey.trim() || !(settings.plannerModel || settings.model).trim()) {
        throw new Error('Thiếu cài đặt planner. Hãy điền URL API Base, Khóa API và Model A lập kế hoạch.');
      }
      const result = await window.doni.optimizePrompt({
        rawRequest: rawRequest.trim(),
        projectContext: buildProjectContext(selectedFolder, scannedFiles),
      });
      setPromptOptimization(result.detectedIntent, result.variants, result.refinedPrompt, result.executionPlan, result.taskBreakdown, result.implementationSuggestions);
      await createCurrentSession();
      await updateCurrentSession({
        rawRequest: rawRequest.trim(),
        detectedIntent: result.detectedIntent,
        refinedPrompt: result.refinedPrompt,
        executionPlan: result.executionPlan,
        taskBreakdown: result.taskBreakdown,
        implementationSuggestions: result.implementationSuggestions,
        promptVariants: result.variants,
      });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Lập kế hoạch thất bại.';
      setError(message.replace(/^Error invoking remote method 'optimize-prompt': Error: /, ''));
    } finally {
      setOptimizing(false);
    }
  };

  const directIntent: DetectedIntent = {
    taskType: 'unknown',
    summary: rawRequest.trim() || 'Không lập kế hoạch',
    riskLevel: 'medium',
    needsProjectContext: true,
  };
  const directVariant: PromptVariant = {
    id: 'direct-question',
    title: 'Không lập kế hoạch',
    description: 'Gửi nguyên yêu cầu cho executor, không qua bước lập kế hoạch.',
    prompt: rawRequest.trim(),
    plan: [],
    tradeoffs: [],
    suggestedFiles: [],
    estimatedRisk: 'medium',
  };
  const plannedVariant = promptVariants.find((variant) => variant.id === selectedPromptVariant);
  const selectedVariant = requestStyle === 'direct' ? (rawRequest.trim() ? directVariant : undefined) : plannedVariant;
  const executionIntent = requestStyle === 'direct' ? directIntent : detectedIntent;
  const canRunTask = Boolean(
    selectedFolder &&
    rawRequest.trim() &&
    selectedVariant?.prompt.trim() &&
    (requestStyle === 'direct' || (detectedIntent && plannedVariant)),
  );

  const runTask = async (): Promise<void> => {
    if (!selectedFolder) {
      setExecutionError('Hãy mở thư mục dự án trước khi chạy tác vụ.');
      return;
    }
    if (!executionIntent || !selectedVariant) {
      setExecutionError('Hãy chọn chiến lược trước.');
      return;
    }
    if (!selectedVariant.prompt.trim()) {
      setExecutionError('Prompt cuối đang trống. Hãy chọn chiến lược trước.');
      return;
    }
    if (executionMode === 'patch' && loadedContextFiles.length === 0) {
      setPatchError('Hãy tải ít nhất một tệp ngữ cảnh trước khi tạo patch.');
      return;
    }
    if (typeof window.doni.executePrompt !== 'function') {
      setExecutionError('Electron preload API đã cũ. Hãy khởi động lại toàn bộ app, không chỉ refresh React.');
      return;
    }

    const startedAt = new Date().toISOString();
    setExecutionLoading(true);
    setPatchLoading(executionMode === 'patch');
    setExecutionError(null);
    setPatchError(null);
    clearApplyResult();
    setExecutionResult(null);
    clearPatchPlan();
    setExecutionStartedAt(startedAt);
    setExecutionFinishedAt(null);

    try {
      const settings = await window.doni.getSettings();
      if (!settings.apiBase.trim() || !settings.apiKey.trim() || !(settings.executorModel || settings.model).trim()) {
        throw new Error('Thiếu cài đặt executor. Hãy điền URL API Base, Khóa API và Model B executor.');
      }
      const result = await window.doni.executePrompt({
        rawRequest: rawRequest.trim(),
        finalPrompt: selectedVariant.prompt,
        selectedVariant,
        detectedIntent: executionIntent,
        projectContext: buildExecutionProjectContext(selectedFolder, scannedFiles),
        contextFiles: loadedContextFiles,
        executionMode,
      });
      setExecutionResult(result);
      await updateCurrentSession({
        rawRequest: rawRequest.trim(),
        detectedIntent: executionIntent,
        selectedVariant,
        finalPrompt: selectedVariant.prompt,
        executionMode,
        executionResult: result.content,
        loadedContextFilePaths: loadedContextFiles.map((file) => file.relativePath),
      });
      if (executionMode === 'patch') {
        if (!result.patchPlan) {
          throw new Error('AI không trả về patch plan hợp lệ.');
        }
        const diffs = Object.fromEntries(
          result.patchPlan.files.map((file) => [file.relativePath, createUnifiedDiff(file.relativePath, file.oldContent, file.newContent)]),
        );
        setPatchPlan(result.patchPlan, result.patchWarnings ?? result.patchPlan.warnings, diffs);
        await updateCurrentSession({
          patchPlanSummary: {
            summary: result.patchPlan.summary,
            riskLevel: result.patchPlan.riskLevel,
            changedFiles: result.patchPlan.files.map((file) => file.relativePath),
          },
        });
      }
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Chạy tác vụ thất bại.';
      const cleanMessage = message.replace(/^Error invoking remote method 'ai:executePrompt': Error: /, '');
      if (executionMode === 'patch') {
        setPatchError(cleanMessage);
      } else {
        setExecutionError(cleanMessage);
      }
    } finally {
      setExecutionLoading(false);
      setPatchLoading(false);
      setExecutionFinishedAt(new Date().toISOString());
    }
  };

  const runCodexTask = async (): Promise<void> => {
    if (!selectedFolder) {
      setExecutionError('Hãy mở thư mục dự án trước khi chạy Codex CLI.');
      return;
    }
    if (!selectedVariant) {
      setExecutionError('Hãy chọn chiến lược trước.');
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
      const canWrite = settings.codexSandbox === 'workspace-write';
      const response = await window.doni.runCodexCli({
        folderPath: selectedFolder,
        sandbox: settings.codexSandbox,
        model: settings.executorModel || settings.model,
        prompt: [
          'You are being called from Doni, a desktop AI coding companion.',
          canWrite
            ? 'You may modify files inside the workspace if that is necessary. Keep edits small and summarize every changed file.'
            : 'Do not modify files. Analyze the project and return a reviewable plan plus unified diff suggestions if code should change.',
          canWrite
            ? 'After editing, include verification commands the user should run.'
            : 'The user will review/apply changes in Doni, so do not claim that edits were applied.',
          '',
          `Yêu cầu gốc:\n${rawRequest.trim()}`,
          '',
          `${requestStyle === 'direct' ? 'Prompt' : 'Chiến lược đã chọn'}:\n${selectedVariant.title}\n${selectedVariant.prompt}`,
        ].join('\n'),
      });
      setExecutionResult({ content: response.content, createdAt: response.finishedAt });
      await updateCurrentSession({
        rawRequest: rawRequest.trim(),
        detectedIntent: executionIntent ?? undefined,
        selectedVariant,
        finalPrompt: selectedVariant.prompt,
        executionMode: 'answer',
        executionResult: response.content,
      });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Codex CLI thất bại.';
      setExecutionError(message.replace(/^Error invoking remote method 'codex:run': Error: /, ''));
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
    const diffText = Object.values(diffTextByFile).join('\n\n');
    if (!diffText) return;
    await navigator.clipboard.writeText(diffText);
  };

  const rejectPatchFile = (relativePath: string): void => {
    if (!patchPlan) return;
    const nextPlan = { ...patchPlan, files: patchPlan.files.filter((file) => file.relativePath !== relativePath) };
    const nextDiffs = Object.fromEntries(nextPlan.files.map((file) => [file.relativePath, createUnifiedDiff(file.relativePath, file.oldContent, file.newContent)]));
    setPatchPlan(nextPlan, patchWarnings, nextDiffs);
  };

  const applyPatchFile = async (relativePath: string): Promise<void> => {
    if (!selectedFolder) return;
    await applyPatch(selectedFolder, [relativePath]);
  };

  const copyPatchFileContent = async (relativePath: string): Promise<void> => {
    const file = patchPlan?.files.find((item) => item.relativePath === relativePath);
    if (!file) return;
    await navigator.clipboard.writeText(file.newContent);
  };

  const hasBlockingPatchWarning = patchWarnings.some((warning) =>
    /not loaded as context|removed from the preview|oldContent does not match|not safe to apply|stale/i.test(warning),
  );
  const canApplyPatch = Boolean(selectedFolder && patchPlan?.files.length && !hasBlockingPatchWarning && !applyLoading && !executionLoading);

  return (
    <main className="flex-1 overflow-y-auto p-6 lg:p-8">
      <section className="mx-auto max-w-4xl">
        <div className="rounded-[2rem] border border-white/10 bg-panelSoft/80 p-7 shadow-glow backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-skyglass">Trợ lý lập trình AI</p>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-white lg:text-5xl">Tối đa hóa code</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">Doni chuẩn bị kế hoạch, chiến lược và prompt cuối có thể kiểm soát trước khi model executor xử lý code.</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button type="button" onClick={openProjectFolder} disabled={isLoading} className="rounded-full bg-mint px-5 py-3 text-sm font-extrabold text-ink transition hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-60">
              {isLoading ? 'Đang quét dự án...' : 'Mở thư mục dự án'}
            </button>
            <button type="button" onClick={openProjectInVSCode} disabled={!selectedFolder} className="rounded-full border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-mint/50 disabled:cursor-not-allowed disabled:opacity-40">
              Mở trong VS Code
            </button>
            <span className="text-sm text-slate-500">{scannedFiles.length} tệp được lập chỉ mục</span>
          </div>
        </div>

        <SettingsPanel />

        {projectSummary ? (
          <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-skyglass">Chỉ mục dự án</p>
                <h3 className="mt-3 font-display text-2xl font-semibold text-white">Tóm tắt codebase</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {[...projectSummary.technologies, ...projectSummary.frameworks].map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-ink/60 px-3 py-1 text-xs font-bold text-slate-300">{item}</span>
                ))}
              </div>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-ink/40 p-4">
                <h4 className="text-sm font-bold text-white">Điểm vào</h4>
                <div className="mt-3 space-y-2 text-xs font-mono text-slate-400">{projectSummary.entryPoints.map((file) => <div key={file} className="truncate">{file}</div>)}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-ink/40 p-4">
                <h4 className="text-sm font-bold text-white">Tệp quan trọng</h4>
                <div className="mt-3 space-y-2 text-xs font-mono text-slate-400">{projectSummary.importantFiles.slice(0, 6).map((file) => <div key={file} className="truncate">{file}</div>)}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-ink/40 p-4">
                <h4 className="text-sm font-bold text-white">Luồng chạy</h4>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-400">{projectSummary.runFlow.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setRequestStyle('direct');
                setError(null);
                setSelectedPromptVariant(null);
                clearExecution();
                clearPatchPlan();
              }}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                requestStyle === 'direct' ? 'border-mint/50 bg-mint/10 text-white' : 'border-white/10 bg-ink/40 text-slate-400 hover:border-white/20'
              }`}
            >
              <div className="font-semibold">Không lập kế hoạch</div>
              <div className="mt-1 text-xs leading-5 text-slate-500">Gửi yêu cầu trực tiếp cho AI executor, nhanh hơn và bỏ qua planner.</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setRequestStyle('planned');
                setError(null);
                clearExecution();
                clearPatchPlan();
              }}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                requestStyle === 'planned' ? 'border-ember/50 bg-ember/10 text-white' : 'border-white/10 bg-ink/40 text-slate-400 hover:border-white/20'
              }`}
            >
              <div className="font-semibold">Lập kế hoạch</div>
              <div className="mt-1 text-xs leading-5 text-slate-500">Dùng AI planner custom để tạo plan, strategy và final prompt.</div>
            </button>
          </div>
          <label htmlFor="raw-request" className="font-display text-xl font-semibold text-white">Yêu cầu gốc</label>
          <textarea id="raw-request" value={rawRequest} onChange={(event) => setRawRequest(event.target.value)} placeholder="Ví dụ: Tìm vì sao Electron preload bridge chưa typed đúng và gợi ý cách sửa an toàn." className="mt-4 min-h-36 w-full resize-none rounded-3xl border border-white/10 bg-ink/70 p-5 text-sm leading-7 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-mint/60" />
          {error ? <div className="mt-4 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm font-medium text-ember">{error}</div> : null}
          <button
            type="button"
            onClick={requestStyle === 'direct' ? runTask : planTask}
            disabled={requestStyle === 'direct' ? !canRunTask || executionLoading : isOptimizing}
            className={`mt-5 rounded-full px-5 py-3 text-sm font-extrabold text-ink transition disabled:cursor-not-allowed disabled:opacity-60 ${
              requestStyle === 'direct' ? 'bg-mint hover:bg-mint/90' : 'bg-ember hover:bg-ember/90'
            }`}
          >
            {requestStyle === 'direct' ? (executionLoading ? 'Đang chạy...' : 'Gửi') : isOptimizing ? 'Đang lập kế hoạch...' : 'Gửi'}
          </button>
        </div>

        {requestStyle === 'planned' && detectedIntent ? <div className="mt-6 rounded-3xl border border-skyglass/20 bg-skyglass/10 p-5 text-sm text-slate-300"><b className="text-white">Ý định phát hiện:</b> {detectedIntent.taskType} - {detectedIntent.riskLevel} rủi ro - {detectedIntent.summary}</div> : null}

        {requestStyle === 'planned' && (refinedPrompt || executionPlan.length || taskBreakdown.length || implementationSuggestions.length) ? (
          <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <h3 className="font-display text-xl font-semibold text-white">Kết quả lập kế hoạch</h3>
            {refinedPrompt ? <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-ink/60 p-4 text-sm leading-6 text-slate-300">{refinedPrompt}</p> : null}
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {[
                ['Kế hoạch thực thi', executionPlan],
                ['Phân rã tác vụ', taskBreakdown],
                ['Gợi ý triển khai', implementationSuggestions],
              ].map(([title, items]) => (
                <div key={title as string} className="rounded-2xl border border-white/10 bg-ink/40 p-4">
                  <h4 className="text-sm font-bold text-white">{title as string}</h4>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
                    {(items as string[]).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {requestStyle === 'planned' && promptVariants.length ? <div className="mt-6 grid gap-4">{promptVariants.map((variant) => <PromptVariantCard key={variant.id} variant={variant} isSelected={selectedPromptVariant === variant.id} onSelect={setSelectedPromptVariant} />)}</div> : null}

        {selectedVariant ? (
          <div className="mt-6 rounded-[2rem] border border-mint/30 bg-mint/10 p-6">
            <h3 className="font-display text-xl font-semibold text-white">{requestStyle === 'direct' ? 'Nhập prompt' : 'Nhập prompt'}</h3>
            <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-ink/70 p-4 text-sm leading-6 text-slate-200">{selectedVariant.prompt}</pre>
          </div>
        ) : null}

        <ContextFilesPanel selectedFolder={selectedFolder} scannedFiles={scannedFiles} rawRequest={rawRequest} />

        <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-skyglass">Model B Executor</p>
              <h3 className="mt-3 font-display text-2xl font-semibold text-white">{requestStyle === 'direct' ? 'Chạy yêu cầu hỏi thẳng' : 'Chạy chiến lược đã chọn'}</h3>
              {!selectedVariant ? <p className="mt-2 text-sm text-slate-500">{requestStyle === 'direct' ? 'Hãy nhập yêu cầu trước.' : 'Hãy chọn chiến lược trước.'}</p> : null}
              {executionMode === 'patch' && !loadedContextFiles.length ? <p className="mt-2 text-sm text-ember">Hãy tải tệp ngữ cảnh trước khi tạo patch.</p> : null}
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={runTask} disabled={!canRunTask || executionLoading} className="rounded-full bg-mint px-5 py-3 text-sm font-extrabold text-ink transition hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-50">
                {executionLoading ? 'Đang chạy...' : 'Chạy tác vụ'}
              </button>
              <button type="button" onClick={runCodexTask} disabled={!selectedFolder || !selectedVariant || executionLoading} className="rounded-full border border-skyglass/30 px-5 py-3 text-sm font-extrabold text-skyglass transition hover:bg-skyglass/10 disabled:cursor-not-allowed disabled:opacity-50">
                Chạy Codex CLI
              </button>
              <button type="button" onClick={copyExecutionResult} disabled={!executionResult?.content} className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-mint/50 hover:text-mint disabled:cursor-not-allowed disabled:opacity-40">
                Sao chép kết quả
              </button>
              <button type="button" onClick={clearExecution} disabled={!executionResult && !executionError && !executionStartedAt} className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-ember/50 hover:text-ember disabled:cursor-not-allowed disabled:opacity-40">
                Xóa kết quả
              </button>
              <button type="button" onClick={backToStrategies} disabled={requestStyle !== 'planned' || !promptVariants.length} className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-skyglass/50 hover:text-skyglass disabled:cursor-not-allowed disabled:opacity-40">
                Quay lại chiến lược
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setExecutionMode('answer');
                clearPatchPlan();
                setPatchError(null);
              }}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                executionMode === 'answer' ? 'border-mint/50 bg-mint/10 text-white' : 'border-white/10 bg-ink/40 text-slate-400 hover:border-white/20'
              }`}
            >
              <div className="font-semibold">Chỉ trả lời</div>
              <div className="mt-1 text-xs text-slate-500">Chạy prompt đã chọn và hiển thị câu trả lời của AI.</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setExecutionMode('patch');
                setExecutionResult(null);
              }}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                executionMode === 'patch' ? 'border-skyglass/50 bg-skyglass/10 text-white' : 'border-white/10 bg-ink/40 text-slate-400 hover:border-white/20'
              }`}
            >
              <div className="font-semibold">Tạo patch</div>
              <div className="mt-1 text-xs text-slate-500">Yêu cầu AI tạo JSON patch nghiêm ngặt và chỉ xem trước diff.</div>
            </button>
          </div>

          {executionError ? <div className="mt-5 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm font-medium text-ember">{executionError}</div> : null}
          {patchError ? <div className="mt-5 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm font-medium text-ember">{patchError}</div> : null}
          {executionLoading ? <div className="mt-5 rounded-2xl border border-skyglass/20 bg-skyglass/10 px-4 py-3 text-sm text-slate-300">{patchLoading ? 'AI đang tạo bản xem trước patch...' : 'AI đang xử lý prompt đã chọn...'}</div> : null}
          {executionResult && executionMode === 'answer' ? (
            <div className="mt-5 rounded-3xl border border-white/10 bg-ink/60 p-5">
              <div className="mb-4 flex flex-wrap gap-3 text-xs text-slate-500">
                <span>Bắt đầu: {executionStartedAt ? new Date(executionStartedAt).toLocaleTimeString() : 'n/a'}</span>
                <span>Kết thúc: {executionFinishedAt ? new Date(executionFinishedAt).toLocaleTimeString() : 'n/a'}</span>
              </div>
              <FormattedAiResponse content={executionResult.content} />
            </div>
          ) : null}
        </div>

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

        <VerifyPanel selectedFolder={selectedFolder} />
      </section>
    </main>
  );
}
