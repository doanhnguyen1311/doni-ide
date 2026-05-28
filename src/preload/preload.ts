import { contextBridge, ipcRenderer } from 'electron';
import type {
  AiSettings,
  AiNetworkEvent,
  AnalyzeCommandErrorRequest,
  ApplyPatchRequest,
  ApplyPatchResponse,
  ElectronApi,
  ExecutePromptRequest,
  ExecutePromptResponse,
  FolderPickerResult,
  OptimizePromptRequest,
  OptimizePromptResponse,
  OpenInEditorRequest,
  ReadProjectFilesRequest,
  ReadProjectFilesResponse,
  RollbackPatchRequest,
  RollbackPatchResponse,
  CommandErrorEvent,
  CommandExitEvent,
  CommandOutputEvent,
  CodexCliStatus,
  ErrorAnalysisResult,
  CreateSessionRequest,
  ProjectMemoryInfo,
  ProjectSessionsRequest,
  ProbeCodexCliRequest,
  SaveProjectMemoryRequest,
  SessionItem,
  SessionRequest,
  UpdateSessionRequest,
  RunCommandRequest,
  RunCommandResponse,
  RunCodexCliRequest,
  RunCodexCliResponse,
} from '../shared/types';

const electronApi: ElectronApi = {
  openProjectFolder: (): Promise<FolderPickerResult> => ipcRenderer.invoke('project:open-folder'),
  getSettings: (): Promise<AiSettings> => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: AiSettings): Promise<AiSettings> => ipcRenderer.invoke('settings:save', settings),
  testConnection: (settings: AiSettings): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('ai:testConnection', settings),
  getAiNetworkEvents: (): Promise<AiNetworkEvent[]> => ipcRenderer.invoke('ai:listNetworkEvents'),
  clearAiNetworkEvents: (): Promise<void> => ipcRenderer.invoke('ai:clearNetworkEvents'),
  onAiNetworkEvent: (callback: (event: AiNetworkEvent) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: AiNetworkEvent): void => callback(payload);
    ipcRenderer.on('ai:networkEvent', listener);
    return () => ipcRenderer.removeListener('ai:networkEvent', listener);
  },
  optimizePrompt: (request: OptimizePromptRequest): Promise<OptimizePromptResponse> => ipcRenderer.invoke('optimize-prompt', request),
  executePrompt: (request: ExecutePromptRequest): Promise<ExecutePromptResponse> => ipcRenderer.invoke('ai:executePrompt', request),
  readProjectFiles: (request: ReadProjectFilesRequest): Promise<ReadProjectFilesResponse> => ipcRenderer.invoke('project:readFiles', request),
  openInVSCode: (request: OpenInEditorRequest): Promise<void> => ipcRenderer.invoke('project:openInVSCode', request),
  getCodexCliStatus: (): Promise<CodexCliStatus> => ipcRenderer.invoke('codex:status'),
  probeCodexCliStatus: (request?: ProbeCodexCliRequest): Promise<CodexCliStatus> => ipcRenderer.invoke('codex:probe', request),
  runCodexCli: (request: RunCodexCliRequest): Promise<RunCodexCliResponse> => ipcRenderer.invoke('codex:run', request),
  applyPatch: (request: ApplyPatchRequest): Promise<ApplyPatchResponse> => ipcRenderer.invoke('patch:apply', request),
  rollbackPatch: (request: RollbackPatchRequest): Promise<RollbackPatchResponse> => ipcRenderer.invoke('patch:rollback', request),
  runProjectCommand: (request: RunCommandRequest): Promise<RunCommandResponse> => ipcRenderer.invoke('command:run', request),
  stopProjectCommand: (): Promise<void> => ipcRenderer.invoke('command:stop'),
  onCommandOutput: (callback: (event: CommandOutputEvent) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: CommandOutputEvent): void => callback(payload);
    ipcRenderer.on('command:output', listener);
    return () => ipcRenderer.removeListener('command:output', listener);
  },
  onCommandError: (callback: (event: CommandErrorEvent) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: CommandErrorEvent): void => callback(payload);
    ipcRenderer.on('command:error', listener);
    return () => ipcRenderer.removeListener('command:error', listener);
  },
  onCommandExit: (callback: (event: CommandExitEvent) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: CommandExitEvent): void => callback(payload);
    ipcRenderer.on('command:exit', listener);
    return () => ipcRenderer.removeListener('command:exit', listener);
  },
  analyzeCommandError: (request: AnalyzeCommandErrorRequest): Promise<ErrorAnalysisResult> => ipcRenderer.invoke('ai:analyzeCommandError', request),
  saveProjectMemory: (request: SaveProjectMemoryRequest): Promise<ProjectMemoryInfo> => ipcRenderer.invoke('memory:saveProject', request),
  createSession: (request: CreateSessionRequest): Promise<SessionItem> => ipcRenderer.invoke('memory:createSession', request),
  updateSession: (request: UpdateSessionRequest): Promise<SessionItem> => ipcRenderer.invoke('memory:updateSession', request),
  listSessions: (request: ProjectSessionsRequest): Promise<SessionItem[]> => ipcRenderer.invoke('memory:listSessions', request),
  getSession: (request: SessionRequest): Promise<SessionItem> => ipcRenderer.invoke('memory:getSession', request),
  deleteSession: (request: SessionRequest): Promise<void> => ipcRenderer.invoke('memory:deleteSession', request),
  clearProjectSessions: (request: ProjectSessionsRequest): Promise<void> => ipcRenderer.invoke('memory:clearProjectSessions', request),
};

contextBridge.exposeInMainWorld('doni', electronApi);
