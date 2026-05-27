import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { scanProject } from './fileScanner';
import { getAiSettings, saveAiSettings, validateAiSettings } from './aiSettingsService';
import { testConnection } from './aiClient';
import { optimizePrompt } from './promptOptimizerService';
import { executePrompt } from './executionAiService';
import { readProjectFiles } from './projectFileReaderService';
import { applyPatchPlan, rollbackPatch } from './patchApplyService';
import type {
  AiSettings,
  ApplyPatchRequest,
  ApplyPatchResponse,
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

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
let selectedProjectFolder: string | null = null;

function friendlyError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected AI error.';
}

function createMainWindow(): void {
  const window = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#05070b',
    title: 'Doni',
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

ipcMain.handle('settings:get', async (): Promise<AiSettings> => getAiSettings());

ipcMain.handle('settings:save', async (_event, settings: AiSettings): Promise<AiSettings> => saveAiSettings(settings));

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
      throw new Error('Select a prompt strategy first.');
    }
    if (!request.finalPrompt.trim()) {
      throw new Error('Final prompt is empty. Select a prompt strategy first.');
    }
    const settings = await getAiSettings();
    validateAiSettings(settings);
    return await executePrompt(request.finalPrompt, request.projectContext, settings, {
      rawRequest: request.rawRequest,
      selectedVariant: request.selectedVariant,
      detectedIntent: request.detectedIntent,
      contextFiles: request.contextFiles,
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
