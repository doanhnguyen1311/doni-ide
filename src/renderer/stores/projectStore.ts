import { create } from 'zustand';
import type {
  DetectedIntent,
  ExecutePromptResponse,
  ExecutionMode,
  ApplyPatchResponse,
  PatchPlan,
  RollbackPatchResponse,
  CommandStatus,
  ErrorAnalysisResult,
  SessionItem,
  ProjectContextFile,
  ProjectFile,
  ProjectSummary,
  CodexCliStatus,
  PromptVariant,
  PromptVariantId,
} from '../../shared/types';

const MAX_COMMAND_OUTPUT_PREVIEW = 20 * 1024;

function shortenOutputPreview(output: string): { outputPreview: string; truncated: boolean } {
  if (output.length <= MAX_COMMAND_OUTPUT_PREVIEW) return { outputPreview: output, truncated: false };
  const head = output.slice(0, 5 * 1024);
  const tail = output.slice(output.length - 15 * 1024);
  return { outputPreview: `${head}\n\n[Output truncated for session history.]\n\n${tail}`, truncated: true };
}

interface ProjectState {
  selectedFolder: string | null;
  scannedFiles: ProjectFile[];
  projectSummary: ProjectSummary | null;
  previewFile: ProjectContextFile | null;
  previewLoading: boolean;
  previewError: string | null;
  codexStatus: CodexCliStatus | null;
  codexStatusLoading: boolean;
  rawRequest: string;
  promptVariants: PromptVariant[];
  detectedIntent: DetectedIntent | null;
  refinedPrompt: string;
  executionPlan: string[];
  taskBreakdown: string[];
  implementationSuggestions: string[];
  selectedPromptVariant: PromptVariantId | null;
  isLoading: boolean;
  isOptimizing: boolean;
  executionResult: ExecutePromptResponse | null;
  executionMode: ExecutionMode;
  executionLoading: boolean;
  executionError: string | null;
  executionStartedAt: string | null;
  executionFinishedAt: string | null;
  patchPlan: PatchPlan | null;
  patchLoading: boolean;
  patchError: string | null;
  patchWarnings: string[];
  diffTextByFile: Record<string, string>;
  applyLoading: boolean;
  applyError: string | null;
  lastApplyResult: ApplyPatchResponse | null;
  lastBackupId: string | null;
  rollbackLoading: boolean;
  rollbackError: string | null;
  rollbackResult: RollbackPatchResponse | null;
  selectedContextFilePaths: string[];
  loadedContextFiles: ProjectContextFile[];
  maxContextFiles: number;
  contextLoading: boolean;
  contextError: string | null;
  suggestedFilePaths: string[];
  command: string;
  commandInput: string;
  selectedCommandPreset: string;
  commandRunning: boolean;
  commandStatus: CommandStatus;
  commandOutput: string;
  commandExitCode: number | null;
  commandError: string | null;
  commandStartedAt: string | null;
  commandFinishedAt: string | null;
  errorAnalysisLoading: boolean;
  errorAnalysisResult: ErrorAnalysisResult | null;
  errorAnalysisError: string | null;
  activeProjectId: string | null;
  activeSessionId: string | null;
  sessions: SessionItem[];
  sessionLoading: boolean;
  sessionError: string | null;
  error: string | null;
  setSelectedFolder: (folderPath: string | null) => void;
  setScannedFiles: (files: ProjectFile[]) => void;
  setProjectSummary: (summary: ProjectSummary | null) => void;
  refreshProjectScan: (folderPath?: string | null) => Promise<void>;
  previewProjectFile: (folderPath: string | null, relativePath: string) => Promise<void>;
  clearPreviewFile: () => void;
  refreshCodexStatus: () => Promise<void>;
  probeCodexStatus: () => Promise<void>;
  setRawRequest: (request: string) => void;
  setPromptOptimization: (
    detectedIntent: DetectedIntent,
    variants: PromptVariant[],
    refinedPrompt?: string,
    executionPlan?: string[],
    taskBreakdown?: string[],
    implementationSuggestions?: string[],
  ) => void;
  setSelectedPromptVariant: (variant: PromptVariantId | null) => void;
  setLoading: (isLoading: boolean) => void;
  setOptimizing: (isOptimizing: boolean) => void;
  setExecutionResult: (result: ExecutePromptResponse | null) => void;
  setExecutionMode: (mode: ExecutionMode) => void;
  setExecutionLoading: (isLoading: boolean) => void;
  setExecutionError: (error: string | null) => void;
  setExecutionStartedAt: (startedAt: string | null) => void;
  setExecutionFinishedAt: (finishedAt: string | null) => void;
  clearExecution: () => void;
  setPatchPlan: (plan: PatchPlan | null, warnings?: string[], diffTextByFile?: Record<string, string>) => void;
  setPatchLoading: (isLoading: boolean) => void;
  clearPatchPlan: () => void;
  setPatchError: (error: string | null) => void;
  applyPatch: (folderPath: string, relativePaths?: string[]) => Promise<void>;
  rollbackLastPatch: () => Promise<void>;
  clearApplyResult: () => void;
  addContextFile: (filePath: string) => void;
  toggleContextFile: (filePath: string) => void;
  setMaxContextFiles: (value: number) => void;
  clearContextFiles: () => void;
  loadContextFiles: (folderPath: string) => Promise<void>;
  setLoadedContextFiles: (files: ProjectContextFile[]) => void;
  setSuggestedFilePaths: (filePaths: string[]) => void;
  setCommand: (command: string) => void;
  setCommandInput: (command: string) => void;
  setSelectedCommandPreset: (preset: string) => void;
  runCommand: (folderPath: string | null) => Promise<void>;
  stopCommand: () => Promise<void>;
  appendCommandOutput: (chunk: string) => void;
  clearCommandOutput: () => void;
  setCommandStatus: (status: CommandStatus, exitCode?: number | null) => void;
  setCommandRunning: (isRunning: boolean) => void;
  setCommandError: (error: string | null) => void;
  setCommandStartedAt: (startedAt: string | null) => void;
  setCommandFinishedAt: (finishedAt: string | null) => void;
  analyzeCommandError: () => Promise<void>;
  clearErrorAnalysis: () => void;
  useSuggestedPrompt: () => void;
  selectRelatedFilesFromAnalysis: () => void;
  saveProjectMemory: (folderPath: string, files: ProjectFile[]) => Promise<void>;
  loadProjectSessions: () => Promise<void>;
  createCurrentSession: () => Promise<SessionItem | null>;
  updateCurrentSession: (partialData: Partial<SessionItem>) => Promise<void>;
  startNewChat: () => void;
  openSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, title: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  clearSessions: () => Promise<void>;
  setError: (error: string | null) => void;
  resetProject: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  selectedFolder: null,
  scannedFiles: [],
  projectSummary: null,
  previewFile: null,
  previewLoading: false,
  previewError: null,
  codexStatus: null,
  codexStatusLoading: false,
  rawRequest: '',
  promptVariants: [],
  detectedIntent: null,
  refinedPrompt: '',
  executionPlan: [],
  taskBreakdown: [],
  implementationSuggestions: [],
  selectedPromptVariant: null,
  isLoading: false,
  isOptimizing: false,
  executionResult: null,
  executionMode: 'answer',
  executionLoading: false,
  executionError: null,
  executionStartedAt: null,
  executionFinishedAt: null,
  patchPlan: null,
  patchLoading: false,
  patchError: null,
  patchWarnings: [],
  diffTextByFile: {},
  applyLoading: false,
  applyError: null,
  lastApplyResult: null,
  lastBackupId: null,
  rollbackLoading: false,
  rollbackError: null,
  rollbackResult: null,
  selectedContextFilePaths: [],
  loadedContextFiles: [],
  maxContextFiles: 10,
  contextLoading: false,
  contextError: null,
  suggestedFilePaths: [],
  command: 'npm run build',
  commandInput: 'npm run build',
  selectedCommandPreset: 'npm run build',
  commandRunning: false,
  commandStatus: 'idle',
  commandOutput: '',
  commandExitCode: null,
  commandError: null,
  commandStartedAt: null,
  commandFinishedAt: null,
  errorAnalysisLoading: false,
  errorAnalysisResult: null,
  errorAnalysisError: null,
  activeProjectId: null,
  activeSessionId: null,
  sessions: [],
  sessionLoading: false,
  sessionError: null,
  error: null,
  setSelectedFolder: (folderPath) => set({ selectedFolder: folderPath }),
  setScannedFiles: (files) => set({ scannedFiles: files }),
  setProjectSummary: (summary) => set({ projectSummary: summary }),
  refreshProjectScan: async (folderPath) => {
    const targetFolder = folderPath ?? useProjectStore.getState().selectedFolder;
    if (!targetFolder) return;
    const scan = await window.doni.scanProjectFolder({ folderPath: targetFolder });
    set({ scannedFiles: scan.files, projectSummary: scan.summary });
  },
  previewProjectFile: async (folderPath, relativePath) => {
    if (!folderPath) {
      set({ previewError: 'Hãy mở thư mục dự án trước khi xem tệp.' });
      return;
    }
    set({ previewLoading: true, previewError: null });
    try {
      const result = await window.doni.readProjectFiles({ folderPath, relativePaths: [relativePath] });
      set({ previewFile: result.files[0] ?? null });
    } catch (error) {
      set({ previewError: error instanceof Error ? error.message.replace(/^Error invoking remote method 'project:readFiles': Error: /, '') : 'Không thể xem trước tệp.' });
    } finally {
      set({ previewLoading: false });
    }
  },
  clearPreviewFile: () => set({ previewFile: null, previewError: null, previewLoading: false }),
  refreshCodexStatus: async () => {
    if (typeof window.doni.getCodexCliStatus !== 'function') return;
    set({ codexStatusLoading: true });
    try {
      set({ codexStatus: await window.doni.getCodexCliStatus() });
    } finally {
      set({ codexStatusLoading: false });
    }
  },
  probeCodexStatus: async () => {
    if (typeof window.doni.probeCodexCliStatus !== 'function') return;
    const folderPath = useProjectStore.getState().selectedFolder ?? undefined;
    set({ codexStatusLoading: true });
    try {
      set({ codexStatus: await window.doni.probeCodexCliStatus({ folderPath }) });
    } catch (error) {
      set({
        codexStatus: {
          available: false,
          authenticated: false,
          error: error instanceof Error ? error.message.replace(/^Error invoking remote method 'codex:probe': Error: /, '') : 'Kiểm tra Codex thất bại.',
        },
      });
    } finally {
      set({ codexStatusLoading: false });
    }
  },
  setRawRequest: (request) => set({ rawRequest: request }),
  setPromptOptimization: (detectedIntent, variants, refinedPrompt = '', executionPlan = [], taskBreakdown = [], implementationSuggestions = []) =>
    set({ detectedIntent, promptVariants: variants, refinedPrompt, executionPlan, taskBreakdown, implementationSuggestions }),
  setSelectedPromptVariant: (variant) => {
    set({ selectedPromptVariant: variant });
    if (!variant) return;
    const state = useProjectStore.getState();
    const selectedVariant = state.promptVariants.find((item) => item.id === variant) ?? null;
    void state.updateCurrentSession({ selectedVariant, finalPrompt: selectedVariant?.prompt });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setOptimizing: (isOptimizing) => set({ isOptimizing }),
  setExecutionResult: (result) => set({ executionResult: result }),
  setExecutionMode: (mode) => set({ executionMode: mode }),
  setExecutionLoading: (isLoading) => set({ executionLoading: isLoading }),
  setExecutionError: (error) => set({ executionError: error }),
  setExecutionStartedAt: (startedAt) => set({ executionStartedAt: startedAt }),
  setExecutionFinishedAt: (finishedAt) => set({ executionFinishedAt: finishedAt }),
  clearExecution: () =>
    set({
      executionResult: null,
      executionError: null,
      executionStartedAt: null,
      executionFinishedAt: null,
      patchPlan: null,
      patchLoading: false,
      patchError: null,
      patchWarnings: [],
      diffTextByFile: {},
      applyError: null,
    }),
  setPatchPlan: (plan, warnings = [], diffTextByFile = {}) =>
    set({
      patchPlan: plan,
      patchWarnings: warnings,
      diffTextByFile,
      patchError: null,
    }),
  setPatchLoading: (isLoading) => set({ patchLoading: isLoading }),
  clearPatchPlan: () =>
    set({
      patchPlan: null,
      patchError: null,
      patchWarnings: [],
      diffTextByFile: {},
      applyError: null,
    }),
  setPatchError: (error) => set({ patchError: error }),
  applyPatch: async (folderPath, relativePaths) => {
    const patchPlan = useProjectStore.getState().patchPlan;
    if (!patchPlan?.files.length) {
      set({ applyError: 'Patch plan không có thay đổi tệp để áp dụng.' });
      return;
    }
    const selectedFiles = relativePaths?.length ? patchPlan.files.filter((file) => relativePaths.includes(file.relativePath)) : patchPlan.files;
    if (!selectedFiles.length) {
      set({ applyError: 'Không có tệp patch phù hợp để áp dụng.' });
      return;
    }

    set({ applyLoading: true, applyError: null, lastApplyResult: null, rollbackResult: null, rollbackError: null });
    try {
      const result = await window.doni.applyPatch({ folderPath, patchPlan: { ...patchPlan, files: selectedFiles } });
      set({
        lastApplyResult: result,
        lastBackupId: result.backupId,
      });
      await useProjectStore.getState().refreshProjectScan(folderPath);
      await useProjectStore.getState().updateCurrentSession({ applyResult: result });
    } catch (error) {
      set({ applyError: error instanceof Error ? error.message.replace(/^Error invoking remote method 'patch:apply': Error: /, '') : 'Không thể áp dụng patch.' });
    } finally {
      set({ applyLoading: false });
    }
  },
  rollbackLastPatch: async () => {
    const backupId = useProjectStore.getState().lastBackupId;
    if (!backupId) {
      set({ rollbackError: 'No backup is available to roll back.' });
      return;
    }

    set({ rollbackLoading: true, rollbackError: null, rollbackResult: null });
    try {
      const result = await window.doni.rollbackPatch({ backupId });
      set({ rollbackResult: result });
    } catch (error) {
      set({ rollbackError: error instanceof Error ? error.message.replace(/^Error invoking remote method 'patch:rollback': Error: /, '') : 'Không thể hoàn tác patch.' });
    } finally {
      set({ rollbackLoading: false });
    }
  },
  clearApplyResult: () =>
    set({
      applyError: null,
      lastApplyResult: null,
      lastBackupId: null,
      rollbackError: null,
      rollbackResult: null,
    }),
  addContextFile: (filePath) =>
    set((state) => {
      if (state.selectedContextFilePaths.includes(filePath)) {
        return { contextError: null };
      }
      if (state.selectedContextFilePaths.length >= state.maxContextFiles) {
        return { contextError: `Chọn tối đa ${state.maxContextFiles} tệp ngữ cảnh.` };
      }
      return { selectedContextFilePaths: [...state.selectedContextFilePaths, filePath], contextError: null };
    }),
  toggleContextFile: (filePath) =>
    set((state) => {
      const isSelected = state.selectedContextFilePaths.includes(filePath);
      if (isSelected) {
        return { selectedContextFilePaths: state.selectedContextFilePaths.filter((path) => path !== filePath), contextError: null };
      }
      if (state.selectedContextFilePaths.length >= state.maxContextFiles) {
        return { contextError: `Chọn tối đa ${state.maxContextFiles} tệp ngữ cảnh.` };
      }
      return { selectedContextFilePaths: [...state.selectedContextFilePaths, filePath], contextError: null };
    }),
  setMaxContextFiles: (value) => set({ maxContextFiles: Math.max(1, Math.min(30, value)) }),
  clearContextFiles: () =>
    set({
      selectedContextFilePaths: [],
      loadedContextFiles: [],
      maxContextFiles: 10,
      contextError: null,
    }),
  loadContextFiles: async (folderPath) => {
    set({ contextLoading: true, contextError: null });
    try {
      const selectedPaths = useProjectStore.getState().selectedContextFilePaths;
      if (!folderPath) {
        throw new Error('Open a project folder before loading tệp ngữ cảnh.');
      }
      if (selectedPaths.length === 0) {
        throw new Error('Select at least one context file to load.');
      }
      const result = await window.doni.readProjectFiles({ folderPath, relativePaths: selectedPaths });
      useProjectStore.getState().setLoadedContextFiles(result.files);
      await useProjectStore.getState().updateCurrentSession({ loadedContextFilePaths: result.files.map((file) => file.relativePath) });
    } catch (error) {
      set({ contextError: error instanceof Error ? error.message.replace(/^Error invoking remote method 'project:readFiles': Error: /, '') : 'Không thể tải tệp ngữ cảnh.' });
    } finally {
      set({ contextLoading: false });
    }
  },
  setLoadedContextFiles: (files) => set({ loadedContextFiles: files, contextError: null }),
  setSuggestedFilePaths: (filePaths) => set({ suggestedFilePaths: filePaths }),
  setCommand: (command) => set({ command, commandInput: command }),
  setCommandInput: (command) => set({ command, commandInput: command }),
  setSelectedCommandPreset: (preset) => set({ selectedCommandPreset: preset, command: preset || useProjectStore.getState().commandInput, commandInput: preset || useProjectStore.getState().commandInput }),
  runCommand: async (folderPath) => {
    const state = useProjectStore.getState();
    const command = state.commandInput.trim();
    if (!folderPath) {
      set({ commandError: 'Open a project folder before running a command.', commandStatus: 'failed' });
      return;
    }
    if (!command) {
      set({ commandError: 'Enter a command before running verification.', commandStatus: 'failed' });
      return;
    }
    if (state.commandRunning) {
      set({ commandError: 'A verification command is already running.' });
      return;
    }

    set({
      command,
      commandOutput: `$ ${command}\n`,
      commandRunning: true,
      commandStatus: 'running',
      commandError: null,
      commandExitCode: null,
      commandStartedAt: new Date().toISOString(),
      commandFinishedAt: null,
      errorAnalysisResult: null,
      errorAnalysisError: null,
    });

    try {
      const result = await window.doni.runProjectCommand({ folderPath, command });
      set({ commandStartedAt: result.startedAt });
      await useProjectStore.getState().updateCurrentSession({
        verifyCommand: {
          command,
          exitCode: null,
          status: 'running',
          outputPreview: `$ ${command}\n`,
          truncated: false,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message.replace(/^Error invoking remote method 'command:run': Error: /, '') : 'Không thể chạy lệnh.';
      const preview = shortenOutputPreview(`$ ${command}\n\n[error] ${message}\n`);
      set({
        commandRunning: false,
        commandStatus: /^Blocked unsafe/i.test(message) ? 'blocked' : 'failed',
        commandError: message,
        commandFinishedAt: new Date().toISOString(),
      });
      useProjectStore.getState().appendCommandOutput(`\n[error] ${message}\n`);
      await useProjectStore.getState().updateCurrentSession({
        verifyCommand: {
          command,
          exitCode: null,
          status: /^Blocked unsafe/i.test(message) ? 'blocked' : 'failed',
          outputPreview: preview.outputPreview,
          truncated: preview.truncated,
        },
      });
    }
  },
  stopCommand: async () => {
    if (!useProjectStore.getState().commandRunning) return;
    set({ commandStatus: 'stopped', commandError: null });
    await window.doni.stopProjectCommand();
  },
  appendCommandOutput: (chunk) => set((state) => ({ commandOutput: `${state.commandOutput}${chunk}` })),
  clearCommandOutput: () =>
    set({
      commandOutput: '',
      commandError: null,
      commandExitCode: null,
      commandStatus: 'idle',
      commandStartedAt: null,
      commandFinishedAt: null,
      errorAnalysisResult: null,
      errorAnalysisError: null,
    }),
  setCommandStatus: (status, exitCode = null) =>
    set({
      commandStatus: status,
      commandExitCode: exitCode,
    }),
  setCommandRunning: (isRunning) => set({ commandRunning: isRunning }),
  setCommandError: (error) => set({ commandError: error }),
  setCommandStartedAt: (startedAt) => set({ commandStartedAt: startedAt }),
  setCommandFinishedAt: (finishedAt) => set({ commandFinishedAt: finishedAt }),
  analyzeCommandError: async () => {
    const state = useProjectStore.getState();
    if (state.commandStatus !== 'failed') {
      set({ errorAnalysisError: 'Run a command and wait for it to fail before analyzing.' });
      return;
    }
    if (!state.commandOutput.trim()) {
      set({ errorAnalysisError: 'Command output is empty. There is nothing to analyze.' });
      return;
    }
    if (!state.selectedFolder) {
      set({ errorAnalysisError: 'Open a project folder before analyzing command output.' });
      return;
    }

    const extensions = state.scannedFiles.reduce<Record<string, number>>((acc, file) => {
      const key = file.extension || '[none]';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    set({ errorAnalysisLoading: true, errorAnalysisError: null, errorAnalysisResult: null });
    try {
      const selectedVariant = state.promptVariants.find((variant) => variant.id === state.selectedPromptVariant);
      const result = await window.doni.analyzeCommandError({
        command: state.command,
        exitCode: state.commandExitCode,
        output: state.commandOutput,
        projectContext: {
          folderPath: state.selectedFolder,
          folderName: state.selectedFolder.split(/[\\/]/).filter(Boolean).pop() ?? state.selectedFolder,
          fileCount: state.scannedFiles.length,
          topFiles: state.scannedFiles.slice(0, 100).map((file) => file.relativePath),
          extensions,
        },
        loadedContextFiles: state.loadedContextFiles,
        rawRequest: state.rawRequest,
        detectedIntent: state.detectedIntent ?? undefined,
        selectedVariant,
      });
      set({ errorAnalysisResult: result });
      await useProjectStore.getState().updateCurrentSession({ errorAnalysis: result });
    } catch (error) {
      set({
        errorAnalysisError:
          error instanceof Error
            ? error.message.replace(/^Error invoking remote method 'ai:analyzeCommandError': Error: /, '')
            : 'Không thể phân tích lỗi lệnh.',
      });
    } finally {
      set({ errorAnalysisLoading: false });
    }
  },
  clearErrorAnalysis: () => set({ errorAnalysisLoading: false, errorAnalysisResult: null, errorAnalysisError: null }),
  useSuggestedPrompt: () =>
    set((state) => ({
      rawRequest: state.errorAnalysisResult?.suggestedPrompt ?? state.rawRequest,
      promptVariants: [],
      detectedIntent: null,
      refinedPrompt: '',
      executionPlan: [],
      taskBreakdown: [],
      implementationSuggestions: [],
      selectedPromptVariant: null,
      executionResult: null,
      patchPlan: null,
      patchWarnings: [],
      diffTextByFile: {},
      error: null,
    })),
  selectRelatedFilesFromAnalysis: () =>
    set((state) => {
      if (!state.errorAnalysisResult) return {};
      const scannedPaths = new Set(state.scannedFiles.map((file) => file.relativePath));
      const matches = state.errorAnalysisResult.relatedFiles.map((filePath) => filePath.replace(/\\/g, '/')).filter((filePath) => scannedPaths.has(filePath));
      const nextSelection = Array.from(new Set([...state.selectedContextFilePaths, ...matches])).slice(0, 10);
      return {
        selectedContextFilePaths: nextSelection,
        contextError: matches.length ? null : 'No related files matched scanned project files.',
      };
    }),
  saveProjectMemory: async (folderPath, files) => {
    const extensionsSummary = files.reduce<Record<string, number>>((acc, file) => {
      const key = file.extension || '[none]';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    set({ sessionLoading: true, sessionError: null });
    try {
      const project = await window.doni.saveProjectMemory({ projectPath: folderPath, fileCount: files.length, extensionsSummary });
      const sessions = await window.doni.listSessions({ projectId: project.projectId });
      set({ activeProjectId: project.projectId, activeSessionId: null, sessions });
    } catch (error) {
      set({ sessionError: error instanceof Error ? error.message : 'Không thể lưu bộ nhớ dự án.' });
    } finally {
      set({ sessionLoading: false });
    }
  },
  loadProjectSessions: async () => {
    const projectId = useProjectStore.getState().activeProjectId;
    if (!projectId) return;
    set({ sessionLoading: true, sessionError: null });
    try {
      set({ sessions: await window.doni.listSessions({ projectId }) });
    } catch (error) {
      set({ sessionError: error instanceof Error ? error.message : 'Không thể tải lịch sử.' });
    } finally {
      set({ sessionLoading: false });
    }
  },
  createCurrentSession: async () => {
    const state = useProjectStore.getState();
    if (!state.activeProjectId) return null;
    const selectedVariant = state.promptVariants.find((variant) => variant.id === state.selectedPromptVariant) ?? null;
    const session = await window.doni.createSession({
      projectId: state.activeProjectId,
      initialData: {
        title: state.rawRequest.trim().slice(0, 60) || 'Phiên chưa đặt tên',
        rawRequest: state.rawRequest,
        detectedIntent: state.detectedIntent,
        refinedPrompt: state.refinedPrompt,
        executionPlan: state.executionPlan,
        taskBreakdown: state.taskBreakdown,
        implementationSuggestions: state.implementationSuggestions,
        promptVariants: state.promptVariants,
        selectedVariant,
        finalPrompt: selectedVariant?.prompt,
        loadedContextFilePaths: state.loadedContextFiles.map((file) => file.relativePath),
        executionMode: state.executionMode,
      },
    });
    set((current) => ({ activeSessionId: session.id, sessions: [session, ...current.sessions.filter((item) => item.id !== session.id)] }));
    return session;
  },
  updateCurrentSession: async (partialData) => {
    const state = useProjectStore.getState();
    if (!state.activeProjectId) return;
    let sessionId = state.activeSessionId;
    if (!sessionId) {
      const session = await state.createCurrentSession();
      sessionId = session?.id ?? null;
    }
    if (!sessionId) return;
    try {
      const updated = await window.doni.updateSession({ projectId: state.activeProjectId, sessionId, partialData });
      set((current) => ({ activeSessionId: updated.id, sessions: [updated, ...current.sessions.filter((item) => item.id !== updated.id)] }));
    } catch (error) {
      set({ sessionError: error instanceof Error ? error.message : 'Không thể cập nhật phiên.' });
    }
  },
  startNewChat: () =>
    set({
      activeSessionId: null,
      rawRequest: '',
      promptVariants: [],
      detectedIntent: null,
      refinedPrompt: '',
      executionPlan: [],
      taskBreakdown: [],
      implementationSuggestions: [],
      selectedPromptVariant: null,
      executionResult: null,
      executionMode: 'answer',
      executionLoading: false,
      executionError: null,
      executionStartedAt: null,
      executionFinishedAt: null,
      patchPlan: null,
      patchLoading: false,
      patchError: null,
      patchWarnings: [],
      diffTextByFile: {},
      applyError: null,
      lastApplyResult: null,
      rollbackError: null,
      rollbackResult: null,
      errorAnalysisResult: null,
      errorAnalysisError: null,
      error: null,
    }),
  openSession: async (sessionId) => {
    const projectId = useProjectStore.getState().activeProjectId;
    if (!projectId) return;
    set({ sessionLoading: true, sessionError: null });
    try {
      const session = await window.doni.getSession({ projectId, sessionId });
      set((state) => ({
        activeSessionId: session.id,
        sessions: [session, ...state.sessions.filter((item) => item.id !== session.id)],
        rawRequest: session.rawRequest,
        detectedIntent: session.detectedIntent ?? null,
        refinedPrompt: session.refinedPrompt ?? '',
        executionPlan: session.executionPlan ?? [],
        taskBreakdown: session.taskBreakdown ?? [],
        implementationSuggestions: session.implementationSuggestions ?? [],
        promptVariants: session.promptVariants ?? [],
        selectedPromptVariant: session.selectedVariant?.id ?? null,
        executionMode: session.executionMode ?? 'answer',
        executionResult: session.executionResult ? { content: session.executionResult, createdAt: session.updatedAt } : null,
        patchPlan: null,
        patchWarnings: [],
        diffTextByFile: {},
        selectedContextFilePaths: session.loadedContextFilePaths ?? [],
        loadedContextFiles: [],
        lastApplyResult: session.applyResult ?? null,
        command: session.verifyCommand?.command ?? state.command,
        commandInput: session.verifyCommand?.command ?? state.commandInput,
        selectedCommandPreset: '',
        commandOutput: session.verifyCommand?.outputPreview ?? '',
        commandExitCode: session.verifyCommand?.exitCode ?? null,
        commandStatus: session.verifyCommand?.status ?? 'idle',
        errorAnalysisResult: session.errorAnalysis ?? null,
      }));
    } catch (error) {
      set({ sessionError: error instanceof Error ? error.message : 'Không thể mở phiên.' });
    } finally {
      set({ sessionLoading: false });
    }
  },
  renameSession: async (sessionId, title) => {
    const projectId = useProjectStore.getState().activeProjectId;
    if (!projectId) return;
    const updated = await window.doni.updateSession({ projectId, sessionId, partialData: { title } });
    set((state) => ({ sessions: [updated, ...state.sessions.filter((session) => session.id !== sessionId)] }));
  },
  deleteSession: async (sessionId) => {
    const projectId = useProjectStore.getState().activeProjectId;
    if (!projectId) return;
    await window.doni.deleteSession({ projectId, sessionId });
    set((state) => ({ sessions: state.sessions.filter((session) => session.id !== sessionId), activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId }));
  },
  clearSessions: async () => {
    const projectId = useProjectStore.getState().activeProjectId;
    if (!projectId) return;
    await window.doni.clearProjectSessions({ projectId });
    set({ sessions: [], activeSessionId: null });
  },
  setError: (error) => set({ error }),
  resetProject: () =>
    set({
      selectedFolder: null,
      scannedFiles: [],
      projectSummary: null,
      previewFile: null,
      previewLoading: false,
      previewError: null,
      codexStatus: null,
      codexStatusLoading: false,
      promptVariants: [],
      detectedIntent: null,
      refinedPrompt: '',
      executionPlan: [],
      taskBreakdown: [],
      implementationSuggestions: [],
      selectedPromptVariant: null,
      executionResult: null,
      executionMode: 'answer',
      executionLoading: false,
      executionError: null,
      executionStartedAt: null,
      executionFinishedAt: null,
      patchPlan: null,
      patchLoading: false,
      patchError: null,
      patchWarnings: [],
      diffTextByFile: {},
      applyLoading: false,
      applyError: null,
      lastApplyResult: null,
      lastBackupId: null,
      rollbackLoading: false,
      rollbackError: null,
      rollbackResult: null,
      selectedContextFilePaths: [],
      loadedContextFiles: [],
      contextLoading: false,
      contextError: null,
      suggestedFilePaths: [],
      command: 'npm run build',
      commandInput: 'npm run build',
      selectedCommandPreset: 'npm run build',
      commandRunning: false,
      commandStatus: 'idle',
      commandOutput: '',
      commandExitCode: null,
      commandError: null,
      commandStartedAt: null,
      commandFinishedAt: null,
      errorAnalysisLoading: false,
      errorAnalysisResult: null,
      errorAnalysisError: null,
      activeProjectId: null,
      activeSessionId: null,
      sessions: [],
      sessionLoading: false,
      sessionError: null,
      error: null,
    }),
}));
