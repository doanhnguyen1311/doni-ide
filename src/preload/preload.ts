import { contextBridge, ipcRenderer } from "electron";
import type {
  AiSettings,
  AiExecutionStreamEvent,
  AiNetworkEvent,
  AntiProviderState,
  AntiProviderAccount,
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
  ProjectChangeSummaryRequest,
  ProjectChangeSummaryResponse,
  ProjectScanRequest,
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
  ScanProjectResult,
  UpdaterProgress,
  UpdaterStatus,
} from "../shared/types";

const electronApi: ElectronApi = {
  openProjectFolder: (): Promise<FolderPickerResult> =>
    ipcRenderer.invoke("project:open-folder"),
  restoreLastProjectFolder: (): Promise<FolderPickerResult> =>
    ipcRenderer.invoke("project:restore-last-folder"),
  scanProjectFolder: (
    request: ProjectScanRequest,
  ): Promise<ScanProjectResult> =>
    ipcRenderer.invoke("project:scan-folder", request),
  getProjectChangeSummary: (
    request: ProjectChangeSummaryRequest,
  ): Promise<ProjectChangeSummaryResponse> =>
    ipcRenderer.invoke("project:changeSummary", request),
  getSettings: (): Promise<AiSettings> => ipcRenderer.invoke("settings:get"),
  saveSettings: (settings: AiSettings): Promise<AiSettings> =>
    ipcRenderer.invoke("settings:save", settings),
  listImportedAntiProviders: (): Promise<AntiProviderState> =>
    ipcRenderer.invoke("anti:listImportedProviders"),
  importAntiProviders: (): Promise<AntiProviderAccount[]> =>
    ipcRenderer.invoke("anti:importProviders"),
  applyAntiProvider: (account: AntiProviderAccount): Promise<void> =>
    ipcRenderer.invoke("anti:applyProvider", account),
  testConnection: (
    settings: AiSettings,
  ): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke("ai:testConnection", settings),
  getAiNetworkEvents: (): Promise<AiNetworkEvent[]> =>
    ipcRenderer.invoke("ai:listNetworkEvents"),
  clearAiNetworkEvents: (): Promise<void> =>
    ipcRenderer.invoke("ai:clearNetworkEvents"),
  cancelActiveAi: (): Promise<void> => ipcRenderer.invoke("ai:cancelActive"),
  onAiNetworkEvent: (
    callback: (event: AiNetworkEvent) => void,
  ): (() => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: AiNetworkEvent,
    ): void => callback(payload);
    ipcRenderer.on("ai:networkEvent", listener);
    return () => ipcRenderer.removeListener("ai:networkEvent", listener);
  },
  onAiExecutionStream: (
    callback: (event: AiExecutionStreamEvent) => void,
  ): (() => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: AiExecutionStreamEvent,
    ): void => callback(payload);
    ipcRenderer.on("ai:executionStream", listener);
    return () => ipcRenderer.removeListener("ai:executionStream", listener);
  },
  optimizePrompt: (
    request: OptimizePromptRequest,
  ): Promise<OptimizePromptResponse> =>
    ipcRenderer.invoke("optimize-prompt", request),
  executePrompt: (
    request: ExecutePromptRequest,
  ): Promise<ExecutePromptResponse> =>
    ipcRenderer.invoke("ai:executePrompt", request),
  readProjectFiles: (
    request: ReadProjectFilesRequest,
  ): Promise<ReadProjectFilesResponse> =>
    ipcRenderer.invoke("project:readFiles", request),
  openInVSCode: (request: OpenInEditorRequest): Promise<void> =>
    ipcRenderer.invoke("project:openInVSCode", request),
  getCodexCliStatus: (): Promise<CodexCliStatus> =>
    ipcRenderer.invoke("codex:status"),
  probeCodexCliStatus: (
    request?: ProbeCodexCliRequest,
  ): Promise<CodexCliStatus> => ipcRenderer.invoke("codex:probe", request),
  runCodexCli: (request: RunCodexCliRequest): Promise<RunCodexCliResponse> =>
    ipcRenderer.invoke("codex:run", request),
  stopCodexCli: (): Promise<void> => ipcRenderer.invoke("codex:stop"),
  applyPatch: (request: ApplyPatchRequest): Promise<ApplyPatchResponse> =>
    ipcRenderer.invoke("patch:apply", request),
  rollbackPatch: (
    request: RollbackPatchRequest,
  ): Promise<RollbackPatchResponse> =>
    ipcRenderer.invoke("patch:rollback", request),
  runProjectCommand: (
    request: RunCommandRequest,
  ): Promise<RunCommandResponse> => ipcRenderer.invoke("command:run", request),
  stopProjectCommand: (): Promise<void> => ipcRenderer.invoke("command:stop"),
  onCommandOutput: (
    callback: (event: CommandOutputEvent) => void,
  ): (() => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: CommandOutputEvent,
    ): void => callback(payload);
    ipcRenderer.on("command:output", listener);
    return () => ipcRenderer.removeListener("command:output", listener);
  },
  onCommandError: (
    callback: (event: CommandErrorEvent) => void,
  ): (() => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: CommandErrorEvent,
    ): void => callback(payload);
    ipcRenderer.on("command:error", listener);
    return () => ipcRenderer.removeListener("command:error", listener);
  },
  onCommandExit: (
    callback: (event: CommandExitEvent) => void,
  ): (() => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: CommandExitEvent,
    ): void => callback(payload);
    ipcRenderer.on("command:exit", listener);
    return () => ipcRenderer.removeListener("command:exit", listener);
  },
  analyzeCommandError: (
    request: AnalyzeCommandErrorRequest,
  ): Promise<ErrorAnalysisResult> =>
    ipcRenderer.invoke("ai:analyzeCommandError", request),
  saveProjectMemory: (
    request: SaveProjectMemoryRequest,
  ): Promise<ProjectMemoryInfo> =>
    ipcRenderer.invoke("memory:saveProject", request),
  createSession: (request: CreateSessionRequest): Promise<SessionItem> =>
    ipcRenderer.invoke("memory:createSession", request),
  updateSession: (request: UpdateSessionRequest): Promise<SessionItem> =>
    ipcRenderer.invoke("memory:updateSession", request),
  listSessions: (request: ProjectSessionsRequest): Promise<SessionItem[]> =>
    ipcRenderer.invoke("memory:listSessions", request),
  getSession: (request: SessionRequest): Promise<SessionItem> =>
    ipcRenderer.invoke("memory:getSession", request),
  deleteSession: (request: SessionRequest): Promise<void> =>
    ipcRenderer.invoke("memory:deleteSession", request),
  clearProjectSessions: (request: ProjectSessionsRequest): Promise<void> =>
    ipcRenderer.invoke("memory:clearProjectSessions", request),
  updater: {
    status: (): Promise<UpdaterStatus> => ipcRenderer.invoke("updater:status"),
    check: (): Promise<UpdaterStatus> => ipcRenderer.invoke("updater:check"),
    download: (): Promise<UpdaterStatus> =>
      ipcRenderer.invoke("updater:download"),
    install: (): Promise<void> => ipcRenderer.invoke("updater:install"),
    onStatus: (callback: (status: UpdaterStatus) => void): (() => void) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        payload: UpdaterStatus,
      ): void => callback(payload);
      ipcRenderer.on("updater:status", listener);
      return () => ipcRenderer.removeListener("updater:status", listener);
    },
    onProgress: (
      callback: (progress: UpdaterProgress) => void,
    ): (() => void) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        payload: UpdaterProgress,
      ): void => callback(payload);
      ipcRenderer.on("updater:progress", listener);
      return () => ipcRenderer.removeListener("updater:progress", listener);
    },
  },
};

contextBridge.exposeInMainWorld("doni", electronApi);
contextBridge.exposeInMainWorld("electron", {
  updater: electronApi.updater,
});
