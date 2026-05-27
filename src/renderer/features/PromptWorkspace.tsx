import { SettingsPanel } from '../components/SettingsPanel';
import { useProjectStore } from '../stores/projectStore';
import { PromptVariantCard } from '../components/PromptVariantCard';
import { ContextFilesPanel } from '../components/ContextFilesPanel';
import { PatchPreview } from '../components/PatchPreview';
import { VerifyPanel } from '../components/VerifyPanel';
import { createUnifiedDiff } from '../services/diff';
import type { ProjectContext, ProjectContextSummary } from '../../shared/types';

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
  const {
    selectedFolder,
    scannedFiles,
    rawRequest,
    selectedPromptVariant,
    promptVariants,
    detectedIntent,
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
  } = useProjectStore();

  const openProjectFolder = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.doni.openProjectFolder();
      if (result.canceled || !result.folderPath || !result.scan) return;
      setSelectedFolder(result.folderPath);
      setScannedFiles(result.scan.files);
      clearContextFiles();
      clearExecution();
      clearApplyResult();
      await saveProjectMemory(result.folderPath, result.scan.files);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to open project folder.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const optimizePrompt = async (): Promise<void> => {
    if (!selectedFolder) {
      setError('Open a project folder before optimizing a prompt.');
      return;
    }
    if (!rawRequest.trim()) {
      setError('Describe what you want the AI to do first.');
      return;
    }

    if (typeof window.doni.getSettings !== 'function' || typeof window.doni.optimizePrompt !== 'function') {
      setError('Electron preload API is outdated. Please fully restart the app, not just React refresh.');
      return;
    }

    setError(null);
    setSelectedPromptVariant(null);
    clearExecution();
    setOptimizing(true);
    try {
      const settings = await window.doni.getSettings();
      if (!settings.apiBase.trim() || !settings.apiKey.trim() || !settings.model.trim()) {
        throw new Error('Missing API settings. Please fill API Base URL, API Key, and Model name.');
      }
      const result = await window.doni.optimizePrompt({
        rawRequest: rawRequest.trim(),
        projectContext: buildProjectContext(selectedFolder, scannedFiles),
      });
      setPromptOptimization(result.detectedIntent, result.variants);
      await createCurrentSession();
      await updateCurrentSession({
        rawRequest: rawRequest.trim(),
        detectedIntent: result.detectedIntent,
        promptVariants: result.variants,
      });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Prompt optimization failed.';
      setError(message.replace(/^Error invoking remote method 'optimize-prompt': Error: /, ''));
    } finally {
      setOptimizing(false);
    }
  };

  const selectedVariant = promptVariants.find((variant) => variant.id === selectedPromptVariant);
  const canRunTask = Boolean(selectedFolder && detectedIntent && selectedVariant && selectedVariant.prompt.trim());

  const runTask = async (): Promise<void> => {
    if (!selectedFolder) {
      setExecutionError('Open a project folder before running a task.');
      return;
    }
    if (!detectedIntent || !selectedVariant) {
      setExecutionError('Select a prompt strategy first.');
      return;
    }
    if (!selectedVariant.prompt.trim()) {
      setExecutionError('Final prompt is empty. Select a prompt strategy first.');
      return;
    }
    if (executionMode === 'patch' && loadedContextFiles.length === 0) {
      setPatchError('Load at least one context file before generating a patch.');
      return;
    }
    if (typeof window.doni.executePrompt !== 'function') {
      setExecutionError('Electron preload API is outdated. Please fully restart the app, not just React refresh.');
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
      if (!settings.apiBase.trim() || !settings.apiKey.trim() || !settings.model.trim()) {
        throw new Error('Missing API settings. Please fill API Base URL, API Key, and Model name.');
      }
      const result = await window.doni.executePrompt({
        rawRequest: rawRequest.trim(),
        finalPrompt: selectedVariant.prompt,
        selectedVariant,
        detectedIntent,
        projectContext: buildExecutionProjectContext(selectedFolder, scannedFiles),
        contextFiles: loadedContextFiles,
        executionMode,
      });
      setExecutionResult(result);
      await updateCurrentSession({
        executionMode,
        executionResult: result.content,
        loadedContextFilePaths: loadedContextFiles.map((file) => file.relativePath),
      });
      if (executionMode === 'patch') {
        if (!result.patchPlan) {
          throw new Error('AI did not return a valid patch plan.');
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
      const message = caughtError instanceof Error ? caughtError.message : 'Task execution failed.';
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

  const copyExecutionResult = async (): Promise<void> => {
    if (!executionResult?.content) return;
    await navigator.clipboard.writeText(executionResult.content);
  };

  const backToVariants = (): void => {
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

  const hasBlockingPatchWarning = patchWarnings.some((warning) =>
    /not loaded as context|removed from the preview|oldContent does not match|not safe to apply|stale/i.test(warning),
  );
  const canApplyPatch = Boolean(selectedFolder && patchPlan?.files.length && !hasBlockingPatchWarning && !applyLoading && !executionLoading);

  return (
    <main className="flex-1 overflow-y-auto p-6 lg:p-8">
      <section className="mx-auto max-w-4xl">
        <div className="rounded-[2rem] border border-white/10 bg-panelSoft/80 p-7 shadow-glow backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-skyglass">Step 2 Prompt Optimizer AI</p>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-white lg:text-5xl">Build sharper prompts from your project context.</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">Doni sends lightweight project metadata to your OpenAI-compatible custom API and returns three actionable prompt variants.</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button type="button" onClick={openProjectFolder} disabled={isLoading} className="rounded-full bg-mint px-5 py-3 text-sm font-extrabold text-ink transition hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-60">
              {isLoading ? 'Scanning project...' : 'Open Project Folder'}
            </button>
            <span className="text-sm text-slate-500">{scannedFiles.length} supported files indexed</span>
          </div>
        </div>

        <SettingsPanel />

        <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <label htmlFor="raw-request" className="font-display text-xl font-semibold text-white">What do you want the AI to do?</label>
          <textarea id="raw-request" value={rawRequest} onChange={(event) => setRawRequest(event.target.value)} placeholder="Example: Find why my Electron preload bridge is not typed correctly and suggest a safe fix." className="mt-4 min-h-36 w-full resize-none rounded-3xl border border-white/10 bg-ink/70 p-5 text-sm leading-7 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-mint/60" />
          {error ? <div className="mt-4 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm font-medium text-ember">{error}</div> : null}
          <button type="button" onClick={optimizePrompt} disabled={isOptimizing} className="mt-5 rounded-full bg-ember px-5 py-3 text-sm font-extrabold text-ink transition hover:bg-ember/90 disabled:opacity-60">
            {isOptimizing ? 'Optimizing...' : 'Optimize Prompt'}
          </button>
        </div>

        {detectedIntent ? <div className="mt-6 rounded-3xl border border-skyglass/20 bg-skyglass/10 p-5 text-sm text-slate-300"><b className="text-white">Detected intent:</b> {detectedIntent.taskType} · {detectedIntent.riskLevel} risk · {detectedIntent.summary}</div> : null}

        {promptVariants.length ? <div className="mt-6 grid gap-4">{promptVariants.map((variant) => <PromptVariantCard key={variant.id} variant={variant} isSelected={selectedPromptVariant === variant.id} onSelect={setSelectedPromptVariant} />)}</div> : null}

        {selectedVariant ? (
          <div className="mt-6 rounded-[2rem] border border-mint/30 bg-mint/10 p-6">
            <h3 className="font-display text-xl font-semibold text-white">Final prompt preview</h3>
            <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-ink/70 p-4 text-sm leading-6 text-slate-200">{selectedVariant.prompt}</pre>
          </div>
        ) : null}

        <ContextFilesPanel selectedFolder={selectedFolder} scannedFiles={scannedFiles} rawRequest={rawRequest} />

        <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-skyglass">Step 3 Execution AI</p>
              <h3 className="mt-3 font-display text-2xl font-semibold text-white">Execution Result</h3>
              {!selectedVariant ? <p className="mt-2 text-sm text-slate-500">Select a prompt strategy first.</p> : null}
              {executionMode === 'patch' && !loadedContextFiles.length ? <p className="mt-2 text-sm text-ember">Load context files before generating a patch.</p> : null}
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={runTask} disabled={!canRunTask || executionLoading} className="rounded-full bg-mint px-5 py-3 text-sm font-extrabold text-ink transition hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-50">
                {executionLoading ? 'Running...' : 'Run Task'}
              </button>
              <button type="button" onClick={copyExecutionResult} disabled={!executionResult?.content} className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-mint/50 hover:text-mint disabled:cursor-not-allowed disabled:opacity-40">
                Copy Result
              </button>
              <button type="button" onClick={clearExecution} disabled={!executionResult && !executionError && !executionStartedAt} className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-ember/50 hover:text-ember disabled:cursor-not-allowed disabled:opacity-40">
                Clear Result
              </button>
              <button type="button" onClick={backToVariants} disabled={!promptVariants.length} className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-skyglass/50 hover:text-skyglass disabled:cursor-not-allowed disabled:opacity-40">
                Back to Variants
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
              <div className="font-semibold">Answer Only</div>
              <div className="mt-1 text-xs text-slate-500">Run the selected prompt and show the AI answer.</div>
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
              <div className="font-semibold">Generate Patch</div>
              <div className="mt-1 text-xs text-slate-500">Ask AI for strict patch JSON and preview diffs only.</div>
            </button>
          </div>

          {executionError ? <div className="mt-5 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm font-medium text-ember">{executionError}</div> : null}
          {patchError ? <div className="mt-5 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm font-medium text-ember">{patchError}</div> : null}
          {executionLoading ? <div className="mt-5 rounded-2xl border border-skyglass/20 bg-skyglass/10 px-4 py-3 text-sm text-slate-300">{patchLoading ? 'AI is generating a patch preview...' : 'AI is working on the selected prompt...'}</div> : null}
          {executionResult && executionMode === 'answer' ? (
            <div className="mt-5 rounded-3xl border border-white/10 bg-ink/60 p-5">
              <div className="mb-4 flex flex-wrap gap-3 text-xs text-slate-500">
                <span>Started: {executionStartedAt ? new Date(executionStartedAt).toLocaleTimeString() : 'n/a'}</span>
                <span>Finished: {executionFinishedAt ? new Date(executionFinishedAt).toLocaleTimeString() : 'n/a'}</span>
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
