import { app, BrowserWindow, Menu, dialog, ipcMain } from 'electron';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { scanProject } from './fileScanner';
import { getAiSettings, saveAiSettings, validateAiSettings } from './aiSettingsService';
import { cancelActiveAiRequests, clearAiNetworkEvents, listAiNetworkEvents, testConnection } from './aiClient';
import { optimizePrompt } from './promptOptimizerService';
import { executePrompt } from './executionAiService';
import { readProjectFiles } from './projectFileReaderService';
import { applyPatchPlan, rollbackPatch } from './patchApplyService';
import { runProjectCommand, stopProjectCommand } from './commandRunnerService';
import { getCodexCliStatus, probeCodexCliStatus, runCodexCli, stopCodexCli } from './codexCliService';
import { analyzeCommandError } from './errorAnalyzerService';
import {
  clearProjectSessions,
  createOrUpdateProjectMemory,
  createSession,
  deleteSession,
  getSession,
  listSessions,
  updateSession,
} from './sessionMemoryService';
import type {
  AiSettings,
  AiNetworkEvent,
  AnalyzeCommandErrorRequest,
  ApplyPatchRequest,
  ApplyPatchResponse,
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
  RunCommandRequest,
  RunCommandResponse,
  CodexCliStatus,
  ProbeCodexCliRequest,
  RunCodexCliRequest,
  RunCodexCliResponse,
  ErrorAnalysisResult,
  CreateSessionRequest,
  ProjectMemoryInfo,
  ProjectSessionsRequest,
  SaveProjectMemoryRequest,
  SessionItem,
  SessionRequest,
  UpdateSessionRequest,
} from '../shared/types';

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
let selectedProjectFolder: string | null = null;
const execFileAsync = promisify(execFile);

function friendlyError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected AI error.';
}

function createMainWindow(): void {
  Menu.setApplicationMenu(null);

  const window = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#05070b',
    title: 'Doni',
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#05070b',
      symbolColor: '#cbd5e1',
      height: 36,
    },
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL);
    window.webContents.openDevTools({ mode: 'detach' });
    return;
  }

  void window.loadFile(path.join(__dirname, '../renderer/index.html'));
}

ipcMain.handle('project:open-folder', async (): Promise<FolderPickerResult> => {
  const result = await dialog.showOpenDialog({
    title: 'Open Project Folder',
    properties: ['openDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const folderPath = result.filePaths[0];
  const scan = await scanProject(folderPath);
  selectedProjectFolder = path.resolve(folderPath);

  return {
    canceled: false,
    folderPath,
    scan,
  };
});

ipcMain.handle('project:readFiles', async (_event, request: ReadProjectFilesRequest): Promise<ReadProjectFilesResponse> => {
  try {
    if (!selectedProjectFolder || path.resolve(request.folderPath) !== selectedProjectFolder) {
      throw new Error('Open a project folder before loading context files.');
    }
    return await readProjectFiles(request.folderPath, request.relativePaths);
  } catch (error) {
    throw new Error(friendlyError(error));
  }
});

ipcMain.handle('project:openInVSCode', async (_event, request: OpenInEditorRequest): Promise<void> => {
  try {
    if (!selectedProjectFolder || path.resolve(request.folderPath) !== selectedProjectFolder) {
      throw new Error('Open a project folder before opening VS Code.');
    }
    const target = request.relativePath ? path.resolve(request.folderPath, request.relativePath) : path.resolve(request.folderPath);
    if (!target.toLowerCase().startsWith(path.resolve(request.folderPath).toLowerCase())) {
      throw new Error('Target path is outside the open project.');
    }
    await execFileAsync('code', [target]);
  } catch (error) {
    throw new Error(friendlyError(error));
  }
});

ipcMain.handle('codex:status', async (): Promise<CodexCliStatus> => getCodexCliStatus());

ipcMain.handle('codex:probe', async (_event, request?: ProbeCodexCliRequest): Promise<CodexCliStatus> => {
  try {
    if (request?.folderPath && (!selectedProjectFolder || path.resolve(request.folderPath) !== selectedProjectFolder)) {
      throw new Error('Open a project folder before probing Codex in that folder.');
    }
    return await probeCodexCliStatus(request?.folderPath);
  } catch (error) {
    throw new Error(friendlyError(error));
  }
});

ipcMain.handle('codex:run', async (_event, request: RunCodexCliRequest): Promise<RunCodexCliResponse> => {
  try {
    if (!selectedProjectFolder || path.resolve(request.folderPath) !== selectedProjectFolder) {
      throw new Error('Open a project folder before running Codex CLI.');
    }
    return await runCodexCli(request);
  } catch (error) {
    throw new Error(friendlyError(error));
  }
});

ipcMain.handle('codex:stop', async (): Promise<void> => {
  stopCodexCli();
});

ipcMain.handle('patch:apply', async (_event, request: ApplyPatchRequest): Promise<ApplyPatchResponse> => {
  try {
    if (!selectedProjectFolder || path.resolve(request.folderPath) !== selectedProjectFolder) {
      throw new Error('Open a project folder before applying a patch.');
    }
    return await applyPatchPlan(request.folderPath, request.patchPlan);
  } catch (error) {
    throw new Error(friendlyError(error));
  }
});

ipcMain.handle('patch:rollback', async (_event, request: RollbackPatchRequest): Promise<RollbackPatchResponse> => {
  try {
    return await rollbackPatch(request.backupId);
  } catch (error) {
    throw new Error(friendlyError(error));
  }
});

ipcMain.handle('command:run', async (event, request: RunCommandRequest): Promise<RunCommandResponse> => {
  try {
    if (!selectedProjectFolder || path.resolve(request.folderPath) !== selectedProjectFolder) {
      throw new Error('Open a project folder before running a command.');
    }
    return await runProjectCommand(request.folderPath, request.command, {
      onOutput: (payload) => event.sender.send('command:output', payload),
      onError: (message) => event.sender.send('command:error', { message }),
      onExit: (payload) => event.sender.send('command:exit', payload),
    });
  } catch (error) {
    throw new Error(friendlyError(error));
  }
});

ipcMain.handle('command:stop', async (): Promise<void> => {
  stopProjectCommand();
});

ipcMain.handle('ai:analyzeCommandError', async (_event, request: AnalyzeCommandErrorRequest): Promise<ErrorAnalysisResult> => {
  try {
    const settings = await getAiSettings();
    validateAiSettings(settings);
    return await analyzeCommandError(request, settings);
  } catch (error) {
    throw new Error(friendlyError(error));
  }
});

ipcMain.handle('memory:saveProject', async (_event, request: SaveProjectMemoryRequest): Promise<ProjectMemoryInfo> => createOrUpdateProjectMemory(request));
ipcMain.handle('memory:createSession', async (_event, request: CreateSessionRequest): Promise<SessionItem> => createSession(request.projectId, request.initialData));
ipcMain.handle('memory:updateSession', async (_event, request: UpdateSessionRequest): Promise<SessionItem> =>
  updateSession(request.projectId, request.sessionId, request.partialData),
);
ipcMain.handle('memory:listSessions', async (_event, request: ProjectSessionsRequest): Promise<SessionItem[]> => listSessions(request.projectId));
ipcMain.handle('memory:getSession', async (_event, request: SessionRequest): Promise<SessionItem> => getSession(request.projectId, request.sessionId));
ipcMain.handle('memory:deleteSession', async (_event, request: SessionRequest): Promise<void> => deleteSession(request.projectId, request.sessionId));
ipcMain.handle('memory:clearProjectSessions', async (_event, request: ProjectSessionsRequest): Promise<void> => clearProjectSessions(request.projectId));

ipcMain.handle('settings:get', async (): Promise<AiSettings> => getAiSettings());

ipcMain.handle('settings:save', async (_event, settings: AiSettings): Promise<AiSettings> => saveAiSettings(settings));

ipcMain.handle('ai:listNetworkEvents', async (): Promise<AiNetworkEvent[]> => listAiNetworkEvents());

ipcMain.handle('ai:clearNetworkEvents', async (): Promise<void> => {
  clearAiNetworkEvents();
});

ipcMain.handle('ai:cancelActive', async (): Promise<void> => {
  cancelActiveAiRequests();
  stopCodexCli();
});

ipcMain.handle('ai:testConnection', async (_event, settings: AiSettings): Promise<{ ok: boolean; error?: string }> => {
  try {
    const ok = await testConnection(settings);
    return ok ? { ok: true } : { ok: false, error: 'AI responded, but did not reply with OK.' };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
});

ipcMain.handle('optimize-prompt', async (_event, request: OptimizePromptRequest): Promise<OptimizePromptResponse> => {
  try {
    if (!request.rawRequest.trim()) {
      throw new Error('Describe what you want the AI to do first.');
    }
    const settings = await getAiSettings();
    validateAiSettings(settings);
    return await optimizePrompt(request, settings);
  } catch (error) {
    throw new Error(friendlyError(error));
  }
});

ipcMain.handle('ai:executePrompt', async (_event, request: ExecutePromptRequest): Promise<ExecutePromptResponse> => {
  try {
    if (!request.selectedVariant) {
      throw new Error('Select a strategy first.');
    }
    if (!request.finalPrompt.trim()) {
      throw new Error('Final prompt is empty. Select a strategy first.');
    }
    const settings = await getAiSettings();
    validateAiSettings(settings);
    return await executePrompt(request.finalPrompt, request.projectContext, settings, {
      rawRequest: request.rawRequest,
      selectedVariant: request.selectedVariant,
      detectedIntent: request.detectedIntent,
      contextFiles: request.contextFiles,
      executionMode: request.executionMode,
    });
  } catch (error) {
    throw new Error(friendlyError(error));
  }
});

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
