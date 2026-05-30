import { app, BrowserWindow, Menu, dialog, ipcMain, shell } from 'electron';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { scanProject } from './fileScanner';
import { deleteAiProviderAccount, getAiSettings, saveAiSettings, upsertAiProviderAccount, validateAiSettings } from './aiSettingsService';
import { cancelActiveAiRequests, clearAiNetworkEvents, listAiNetworkEvents, testConnection } from './aiClient';
import { createChatCompletionWithRouting } from './aiCore/aiCoreClient';
import {
  cancelProviderAuth,
  getProviderAuthMetadata,
  listAiAuthMethods,
  pollProviderAuth,
  refreshProviderAccount,
  startProviderAuth,
} from './aiCore/providerAuthService';
import { optimizePrompt } from './promptOptimizerService';
import { executePrompt } from './executionAiService';
import { readProjectFiles } from './projectFileReaderService';
import { applyPatchPlan, rollbackPatch } from './patchApplyService';
import { runProjectCommand, stopProjectCommand } from './commandRunnerService';
import { getCodexCliStatus, probeCodexCliStatus, runCodexCli, stopCodexCli } from './codexCliService';
import { analyzeCommandError } from './errorAnalyzerService';
import { initAutoUpdater } from './updater';
import { applyAntiProvider, listImportedAntiProviders, readAntiProvidersFromJsonFile } from './antiProviderService';
import { listProviderDefinitions } from './aiCore/providerRegistry';
import { providerConnectionSummary } from './aiCore/providerConnectionSummary';
import { listDoniModels, refreshDoniModels } from './aiCore/modelDiscovery';
import {
  clearProjectSessions,
  createOrUpdateProjectMemory,
  createSession,
  deleteSession,
  getLastProjectPath,
  getSession,
  listSessions,
  updateSession,
} from './sessionMemoryService';
import type {
  AiSettings,
  AntiProviderAccount,
  AntiProviderState,
  AiExecutionStreamEvent,
  AiNetworkEvent,
  CancelProviderAuthRequest,
  GetProviderAuthMetadataRequest,
  PollProviderAuthRequest,
  ProviderAuthFlowResponse,
  ProviderAuthMetadataResponse,
  ProviderAuthMethodMetadata,
  RefreshProviderAccountRequest,
  RefreshProviderAccountResponse,
  StartProviderAuthRequest,
  AnalyzeCommandErrorRequest,
  ApplyPatchRequest,
  ApplyPatchResponse,
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
  RunCommandRequest,
  RunCommandResponse,
  CodexCliStatus,
  ProbeCodexCliRequest,
  RunCodexCliRequest,
  RunCodexCliResponse,
  ErrorAnalysisResult,
  CreateSessionRequest,
  DeleteAiProviderAccountRequest,
  ProjectMemoryInfo,
  ProjectSessionsRequest,
  SaveProjectMemoryRequest,
  SessionItem,
  SessionRequest,
  UpdateSessionRequest,
  ScanProjectResult,
  TestAiProviderAccountRequest,
  UpsertAiProviderAccountRequest,
} from '../shared/types';

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
let selectedProjectFolder: string | null = null;
const execFileAsync = promisify(execFile);

async function getGitChangeSummary(folderPath: string): Promise<ProjectChangeSummaryResponse> {
  try {
    const { stdout } = await execFileAsync('git', ['-C', folderPath, 'diff', '--numstat', '--'], { timeout: 10000 });
    const files = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [addedText, removedText, ...pathParts] = line.split(/\s+/);
        return {
          relativePath: pathParts.join(' '),
          added: Number.parseInt(addedText, 10) || 0,
          removed: Number.parseInt(removedText, 10) || 0,
        };
      })
      .filter((file) => file.relativePath);
    return { files, source: 'git' };
  } catch {
    return { files: [], source: 'unavailable' };
  }
}

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
    initAutoUpdater(window);
    return;
  }

  void window.loadFile(path.join(__dirname, '../renderer/index.html'));
  initAutoUpdater(window);
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

ipcMain.handle('project:restore-last-folder', async (): Promise<FolderPickerResult> => {
  const folderPath = await getLastProjectPath();
  if (!folderPath) {
    return { canceled: true };
  }

  try {
    const scan = await scanProject(folderPath);
    selectedProjectFolder = path.resolve(folderPath);
    return {
      canceled: false,
      folderPath,
      scan,
    };
  } catch {
    return { canceled: true };
  }
});

ipcMain.handle('project:scan-folder', async (_event, request: ProjectScanRequest): Promise<ScanProjectResult> => {
  if (!selectedProjectFolder || path.resolve(request.folderPath) !== selectedProjectFolder) {
    throw new Error('Open a project folder before refreshing the project tree.');
  }
  return await scanProject(request.folderPath);
});

ipcMain.handle('project:changeSummary', async (_event, request: ProjectChangeSummaryRequest): Promise<ProjectChangeSummaryResponse> => {
  if (!selectedProjectFolder || path.resolve(request.folderPath) !== selectedProjectFolder) {
    throw new Error('Open a project folder before reading changed files.');
  }
  return await getGitChangeSummary(request.folderPath);
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

function createExecutionStreamEvent(
  source: AiExecutionStreamEvent['source'],
  type: AiExecutionStreamEvent['type'],
  data: string,
): AiExecutionStreamEvent {
  return {
    source,
    type,
    data,
    timestamp: new Date().toISOString(),
  };
}

ipcMain.handle('codex:run', async (event, request: RunCodexCliRequest): Promise<RunCodexCliResponse> => {
  try {
    if (!selectedProjectFolder || path.resolve(request.folderPath) !== selectedProjectFolder) {
      throw new Error('Open a project folder before running Codex CLI.');
    }
    event.sender.send('ai:executionStream', createExecutionStreamEvent('codex', 'status', 'Starting Codex CLI...\n'));
    return await runCodexCli(request, {
      onOutput: (type, data) => event.sender.send('ai:executionStream', createExecutionStreamEvent('codex', type, data)),
    });
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

ipcMain.handle('anti:listImportedProviders', async (): Promise<AntiProviderState> => listImportedAntiProviders());

ipcMain.handle('anti:importProviders', async (): Promise<AntiProviderAccount[]> => {
  const result = await dialog.showOpenDialog({
    title: 'Import provider JSON',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return [];
  }
  return readAntiProvidersFromJsonFile(result.filePaths[0]);
});

ipcMain.handle('anti:applyProvider', async (_event, account: AntiProviderAccount): Promise<void> => {
  try {
    await applyAntiProvider(account);
  } catch (error) {
    console.error('[anti:applyProvider] failed', JSON.stringify({
      accountId: account.id,
      account: account.account,
      chatgptAccountId: account.chatgptAccountId,
      hasRawAccessToken: Boolean(account.accessToken),
      hasRawRefreshToken: Boolean(account.refreshToken),
      accessTokenReference: account.accessTokenReference,
      refreshTokenReference: account.refreshTokenReference,
      error: error instanceof Error
        ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
        : { value: String(error) },
    }, null, 2));
    throw error;
  }
});

ipcMain.handle('ai:listProviders', async () => {
  const settings = await getAiSettings();
  return listProviderDefinitions().map((provider) => ({
    ...provider,
    connectionSummary: providerConnectionSummary.summarize(settings, provider),
  }));
});

ipcMain.handle('ai:listDoniModels', async (_event, request = {}) =>
  listDoniModels(await getAiSettings(), request),
);

ipcMain.handle('ai:refreshDoniModels', async (_event, request = {}) =>
  refreshDoniModels(await getAiSettings(), request),
);

ipcMain.handle('ai:listAuthMethods', async (): Promise<ProviderAuthMethodMetadata[]> => listAiAuthMethods());

ipcMain.handle('ai:getProviderAuthMetadata', async (_event, request: GetProviderAuthMetadataRequest): Promise<ProviderAuthMetadataResponse> =>
  getProviderAuthMetadata(request),
);

ipcMain.handle('ai:startProviderAuth', async (_event, request: StartProviderAuthRequest): Promise<ProviderAuthFlowResponse> => {
  const response = await startProviderAuth(request);
  if (response.ok && response.authorizationUrl) {
    try {
      await shell.openExternal(response.authorizationUrl);
    } catch (error) {
      if (response.sessionId) {
        await cancelProviderAuth({ sessionId: response.sessionId });
      }
      return {
        ok: false,
        status: 'error',
        providerId: response.providerId,
        authMethod: response.authMethod,
        sessionId: response.sessionId,
        message: error instanceof Error ? `Could not open system browser: ${error.message}` : 'Could not open system browser.',
      };
    }
  }
  return response;
});

ipcMain.handle('ai:pollProviderAuth', async (_event, request: PollProviderAuthRequest): Promise<ProviderAuthFlowResponse> =>
  pollProviderAuth(request),
);

ipcMain.handle('ai:cancelProviderAuth', async (_event, request: CancelProviderAuthRequest): Promise<ProviderAuthFlowResponse> =>
  cancelProviderAuth(request),
);

ipcMain.handle('ai:refreshProviderAccount', async (_event, request: RefreshProviderAccountRequest): Promise<RefreshProviderAccountResponse> =>
  refreshProviderAccount(await getAiSettings(), request),
);

ipcMain.handle('ai:upsertProviderAccount', async (_event, request: UpsertAiProviderAccountRequest): Promise<AiSettings> => {
  try {
    return await upsertAiProviderAccount(request);
  } catch (error) {
    throw new Error(friendlyError(error));
  }
});

ipcMain.handle('ai:deleteProviderAccount', async (_event, request: DeleteAiProviderAccountRequest): Promise<AiSettings> => {
  try {
    return await deleteAiProviderAccount(request);
  } catch (error) {
    throw new Error(friendlyError(error));
  }
});

ipcMain.handle('ai:testProviderAccount', async (_event, request: TestAiProviderAccountRequest): Promise<{ ok: boolean; error?: string }> => {
  try {
    const settings = await getAiSettings();
    const accountId = request.accountId || 'test-provider-account';
    const model = request.model.trim();
    if (!model) {
      throw new Error('Model is required before testing a provider account.');
    }
    const response = await createChatCompletionWithRouting(
      {
        ...settings,
        apiKey: request.apiKey?.trim() ?? '',
        selectedAccountId: accountId,
        model,
        plannerModel: model,
        executorModel: model,
        accounts: [
          {
            id: accountId,
            providerId: request.providerId,
            displayName: request.displayName || request.providerId,
            status: 'active',
            priority: 100,
            healthScore: 1,
            secretReference: request.secretReference,
            apiBase: request.apiBase,
            modelIds: [model],
          },
        ],
      },
      [
        { role: 'system', content: 'You are a connection test. Reply with OK only.' },
        { role: 'user', content: 'Reply with OK only.' },
      ],
      {
        taskType: 'quick-chat',
        model,
        recordHealth: false,
      },
    );
    return response.content.trim().toUpperCase() === 'OK'
      ? { ok: true }
      : { ok: false, error: 'AI responded, but did not reply with OK.' };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
});

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

ipcMain.handle('ai:executePrompt', async (event, request: ExecutePromptRequest): Promise<ExecutePromptResponse> => {
  let settings: AiSettings | undefined;
  try {
    if (!request.selectedVariant) {
      throw new Error('Select a strategy first.');
    }
    if (!request.finalPrompt.trim()) {
      throw new Error('Final prompt is empty. Select a strategy first.');
    }
    settings = await getAiSettings();
    validateAiSettings(settings);
    event.sender.send('ai:executionStream', createExecutionStreamEvent('api', 'status', 'Starting executor stream...\n'));
    return await executePrompt(
      request.finalPrompt,
      request.projectContext,
      settings,
      {
        rawRequest: request.rawRequest,
        selectedVariant: request.selectedVariant,
        detectedIntent: request.detectedIntent,
        contextFiles: request.contextFiles,
        executionMode: request.executionMode,
      },
      {
        onStream: (chunk) => event.sender.send('ai:executionStream', createExecutionStreamEvent('api', 'content', chunk)),
      },
    );
  } catch (error) {
    console.error('[ai:executePrompt] failed', JSON.stringify({
      executionMode: request.executionMode,
      selectedVariantId: request.selectedVariant?.id,
      rawRequestPreview: request.rawRequest.slice(0, 160),
      settings: settings
        ? {
          model: settings.model,
          plannerModel: settings.plannerModel,
          executorModel: settings.executorModel,
          executorProvider: settings.executorProvider,
          selectedAccountId: settings.selectedAccountId,
          apiBase: settings.apiBase,
          secretReference: settings.secretReference,
          accounts: settings.accounts?.map((account) => ({
            id: account.id,
            providerId: account.providerId,
            displayName: account.displayName,
            authMethod: account.authMethod,
            status: account.status,
            apiBase: account.apiBase,
            secretReference: account.secretReference,
            credentialReferences: account.credentialReferences,
          })),
        }
        : undefined,
      error: error instanceof Error
        ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
        : { value: String(error) },
    }, null, 2));
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
