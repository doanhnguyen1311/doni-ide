import { contextBridge, ipcRenderer } from 'electron';
import type {
  AiSettings,
  ApplyPatchRequest,
  ApplyPatchResponse,
  ElectronApi,
  ExecutePromptRequest,
  ExecutePromptResponse,
  FolderPickerResult,
  OptimizePromptRequest,
  OptimizePromptResponse,
  ReadProjectFilesRequest,
  ReadProjectFilesResponse,
  RollbackPatchRequest,
  RollbackPatchResponse,
} from '../shared/types';

const electronApi: ElectronApi = {
  openProjectFolder: (): Promise<FolderPickerResult> => ipcRenderer.invoke('project:open-folder'),
  getSettings: (): Promise<AiSettings> => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: AiSettings): Promise<AiSettings> => ipcRenderer.invoke('settings:save', settings),
  testConnection: (settings: AiSettings): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('ai:testConnection', settings),
  optimizePrompt: (request: OptimizePromptRequest): Promise<OptimizePromptResponse> => ipcRenderer.invoke('optimize-prompt', request),
  executePrompt: (request: ExecutePromptRequest): Promise<ExecutePromptResponse> => ipcRenderer.invoke('ai:executePrompt', request),
  readProjectFiles: (request: ReadProjectFilesRequest): Promise<ReadProjectFilesResponse> => ipcRenderer.invoke('project:readFiles', request),
  applyPatch: (request: ApplyPatchRequest): Promise<ApplyPatchResponse> => ipcRenderer.invoke('patch:apply', request),
  rollbackPatch: (request: RollbackPatchRequest): Promise<RollbackPatchResponse> => ipcRenderer.invoke('patch:rollback', request),
};

contextBridge.exposeInMainWorld('doni', electronApi);
