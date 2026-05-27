import { create } from 'zustand';
import type {
  DetectedIntent,
  ExecutePromptResponse,
  ExecutionMode,
  ApplyPatchResponse,
  PatchPlan,
  RollbackPatchResponse,
  ProjectContextFile,
  ProjectFile,
  PromptVariant,
  PromptVariantId,
} from '../../shared/types';

interface ProjectState {
  selectedFolder: string | null;
  scannedFiles: ProjectFile[];
  rawRequest: string;
  promptVariants: PromptVariant[];
  detectedIntent: DetectedIntent | null;
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
  contextLoading: boolean;
  contextError: string | null;
  suggestedFilePaths: string[];
  error: string | null;
  setSelectedFolder: (folderPath: string | null) => void;
  setScannedFiles: (files: ProjectFile[]) => void;
  setRawRequest: (request: string) => void;
  setPromptOptimization: (detectedIntent: DetectedIntent, variants: PromptVariant[]) => void;
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
  applyPatch: (folderPath: string) => Promise<void>;
  rollbackLastPatch: () => Promise<void>;
  clearApplyResult: () => void;
  toggleContextFile: (filePath: string) => void;
  clearContextFiles: () => void;
  loadContextFiles: (folderPath: string) => Promise<void>;
  setSuggestedFilePaths: (filePaths: string[]) => void;
  setError: (error: string | null) => void;
  resetProject: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  selectedFolder: null,
  scannedFiles: [],
  rawRequest: '',
  promptVariants: [],
  detectedIntent: null,
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
  contextLoading: false,
  contextError: null,
  suggestedFilePaths: [],
  error: null,
  setSelectedFolder: (folderPath) => set({ selectedFolder: folderPath }),
  setScannedFiles: (files) => set({ scannedFiles: files }),
  setRawRequest: (request) => set({ rawRequest: request }),
  setPromptOptimization: (detectedIntent, variants) => set({ detectedIntent, promptVariants: variants }),
  setSelectedPromptVariant: (variant) => set({ selectedPromptVariant: variant }),
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
  applyPatch: async (folderPath) => {
    const patchPlan = useProjectStore.getState().patchPlan;
    if (!patchPlan?.files.length) {
      set({ applyError: 'Patch plan has no file changes to apply.' });
      return;
    }

    set({ applyLoading: true, applyError: null, lastApplyResult: null, rollbackResult: null, rollbackError: null });
    try {
      const result = await window.doni.applyPatch({ folderPath, patchPlan });
      set({
        lastApplyResult: result,
        lastBackupId: result.backupId,
      });
    } catch (error) {
      set({ applyError: error instanceof Error ? error.message.replace(/^Error invoking remote method 'patch:apply': Error: /, '') : 'Unable to apply patch.' });
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
      set({ rollbackError: error instanceof Error ? error.message.replace(/^Error invoking remote method 'patch:rollback': Error: /, '') : 'Unable to roll back patch.' });
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
  toggleContextFile: (filePath) =>
    set((state) => {
      const isSelected = state.selectedContextFilePaths.includes(filePath);
      if (isSelected) {
        return { selectedContextFilePaths: state.selectedContextFilePaths.filter((path) => path !== filePath), contextError: null };
      }
      if (state.selectedContextFilePaths.length >= 10) {
        return { contextError: 'Select at most 10 context files.' };
      }
      return { selectedContextFilePaths: [...state.selectedContextFilePaths, filePath], contextError: null };
    }),
  clearContextFiles: () =>
    set({
      selectedContextFilePaths: [],
      loadedContextFiles: [],
      contextError: null,
    }),
  loadContextFiles: async (folderPath) => {
    set({ contextLoading: true, contextError: null });
    try {
      const selectedPaths = useProjectStore.getState().selectedContextFilePaths;
      if (!folderPath) {
        throw new Error('Open a project folder before loading context files.');
      }
      if (selectedPaths.length === 0) {
        throw new Error('Select at least one context file to load.');
      }
      const result = await window.doni.readProjectFiles({ folderPath, relativePaths: selectedPaths });
      set({ loadedContextFiles: result.files });
    } catch (error) {
      set({ contextError: error instanceof Error ? error.message.replace(/^Error invoking remote method 'project:readFiles': Error: /, '') : 'Unable to load context files.' });
    } finally {
      set({ contextLoading: false });
    }
  },
  setSuggestedFilePaths: (filePaths) => set({ suggestedFilePaths: filePaths }),
  setError: (error) => set({ error }),
  resetProject: () =>
    set({
      selectedFolder: null,
      scannedFiles: [],
      promptVariants: [],
      detectedIntent: null,
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
      error: null,
    }),
}));
