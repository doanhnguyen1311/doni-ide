export interface ProjectFile {
  relativePath: string;
  absolutePath: string;
  extension: string;
  size: number;
}

export interface ScanProjectResult {
  folderPath: string;
  files: ProjectFile[];
  limitReached: boolean;
  summary: ProjectSummary;
}

export interface ProjectSummary {
  technologies: string[];
  frameworks: string[];
  entryPoints: string[];
  importantFiles: string[];
  structure: string[];
  runFlow: string[];
}

export interface FolderPickerResult {
  canceled: boolean;
  folderPath?: string;
  scan?: ScanProjectResult;
}

export interface ProjectScanRequest {
  folderPath: string;
}

export interface ProjectChangeSummaryRequest {
  folderPath: string;
}

export interface ProjectChangedFileSummary {
  relativePath: string;
  added: number;
  removed: number;
}

export interface ProjectChangeSummaryResponse {
  files: ProjectChangedFileSummary[];
  source: "git" | "unavailable";
}

export type PromptVariantId = string;

export interface PromptVariant {
  id: PromptVariantId;
  title: string;
  description: string;
  prompt: string;
  plan: string[];
  tradeoffs: string[];
  suggestedFiles: string[];
  estimatedRisk: "low" | "medium" | "high";
}

export interface DetectedIntent {
  taskType:
    | "bugfix"
    | "refactor"
    | "ui"
    | "feature"
    | "explanation"
    | "unknown";
  summary: string;
  riskLevel: "low" | "medium" | "high";
  needsProjectContext: boolean;
}

export interface OptimizePromptResponse {
  detectedIntent: DetectedIntent;
  refinedPrompt: string;
  executionPlan: string[];
  taskBreakdown: string[];
  implementationSuggestions: string[];
  variants: PromptVariant[];
}

export interface ProjectContextSummary {
  folderPath?: string;
  folderName: string;
  fileCount: number;
  topFiles: string[];
  extensions: Record<string, number>;
}

export interface ProjectContext extends ProjectContextSummary {
  folderPath: string;
}

export interface ProjectContextFile {
  relativePath: string;
  content: string;
  size: number;
  truncated: boolean;
}

export interface ReadProjectFilesRequest {
  folderPath: string;
  relativePaths: string[];
}

export interface ReadProjectFilesResponse {
  files: ProjectContextFile[];
}

export interface OpenInEditorRequest {
  folderPath: string;
  relativePath?: string;
}

export interface CodexCliStatus {
  available: boolean;
  version?: string;
  source?: string;
  remainingPercent?: number | null;
  remainingSource?: string;
  weeklyRemainingPercent?: number | null;
  weeklyRemainingSource?: string;
  fiveHourResetAt?: string;
  weeklyResetAt?: string;
  usedPercent?: number | null;
  usedSource?: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  reasoningOutputTokens?: number;
  totalTokens?: number;
  contextWindowTokens?: number;
  lastModel?: string;
  lastRunAt?: string;
  lastExitCode?: number | null;
  lastDurationMs?: number;
  promptCount?: number;
  authenticated?: boolean;
  lastProbeAt?: string;
  usageSummary?: string;
  error?: string;
}

export interface ProbeCodexCliRequest {
  folderPath?: string;
}

export interface RunCodexCliRequest {
  folderPath: string;
  prompt: string;
  model?: string;
  sandbox?: "read-only" | "workspace-write";
}

export interface RunCodexCliResponse {
  content: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  startedAt: string;
  finishedAt: string;
}

export interface OptimizePromptRequest {
  rawRequest: string;
  projectContext: ProjectContextSummary;
}

export type ExecutionMode = "answer" | "patch";

export type PatchRiskLevel = "low" | "medium" | "high";

export interface PatchFileChange {
  relativePath: string;
  changeType: "modify";
  oldContent: string;
  newContent: string;
  notes?: string;
}

export interface PatchPlan {
  summary: string;
  riskLevel: PatchRiskLevel;
  files: PatchFileChange[];
  warnings: string[];
}

export interface PatchApplyFileResult {
  relativePath: string;
  status: "applied" | "skipped" | "failed";
  message?: string;
}

export interface ApplyPatchRequest {
  folderPath: string;
  patchPlan: PatchPlan;
}

export interface ApplyPatchResponse {
  success: boolean;
  appliedAt: string;
  backupId: string;
  appliedFiles: PatchApplyFileResult[];
}

export interface PatchRollbackFileResult {
  relativePath: string;
  status: "restored" | "failed";
  message?: string;
}

export interface RollbackPatchRequest {
  backupId: string;
}

export interface RollbackPatchResponse {
  success: boolean;
  restoredFiles: PatchRollbackFileResult[];
}

export type CommandStatus =
  | "idle"
  | "running"
  | "success"
  | "failed"
  | "stopped"
  | "blocked";

export interface RunCommandRequest {
  folderPath: string;
  command: string;
}

export interface RunCommandResponse {
  startedAt: string;
}

export interface CommandOutputEvent {
  type: "stdout" | "stderr";
  data: string;
  timestamp: string;
}

export interface CommandErrorEvent {
  message: string;
}

export interface CommandExitEvent {
  exitCode: number | null;
  signal?: string;
  durationMs: number;
}

export type ErrorAnalysisConfidence = "low" | "medium" | "high";

export interface AnalyzeCommandErrorRequest {
  command: string;
  exitCode: number | null;
  output: string;
  projectContext: ProjectContext;
  loadedContextFiles?: ProjectContextFile[];
  rawRequest?: string;
  detectedIntent?: DetectedIntent;
  selectedVariant?: PromptVariant;
}

export interface ErrorAnalysisResult {
  summary: string;
  probableCauses: string[];
  relatedFiles: string[];
  suggestedNextActions: string[];
  suggestedPrompt: string;
  confidence: ErrorAnalysisConfidence;
}

export interface ProjectMemoryInfo {
  projectId: string;
  projectPath: string;
  projectName: string;
  doniPath: string;
  lastOpenedAt: string;
  createdAt: string;
  fileCount: number;
  extensionsSummary: Record<string, number>;
}

export interface VerifyCommandSummary {
  command: string;
  exitCode: number | null;
  status: CommandStatus;
  outputPreview: string;
  truncated: boolean;
}

export interface SessionChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  kind?: 'plan' | 'answer' | 'patch' | 'error';
}

export interface PatchPlanSummary {
  summary: string;
  riskLevel: PatchRiskLevel;
  changedFiles: string[];
}

export interface SessionItem {
  id: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  rawRequest: string;
  detectedIntent?: DetectedIntent | null;
  refinedPrompt?: string;
  executionPlan?: string[];
  taskBreakdown?: string[];
  implementationSuggestions?: string[];
  promptVariants?: PromptVariant[];
  selectedVariant?: PromptVariant | null;
  finalPrompt?: string;
  loadedContextFilePaths?: string[];
  executionMode?: ExecutionMode;
  executionResult?: string;
  patchPlanSummary?: PatchPlanSummary;
  applyResult?: ApplyPatchResponse | null;
  verifyCommand?: VerifyCommandSummary | null;
  errorAnalysis?: ErrorAnalysisResult | null;
  chatMessages?: SessionChatMessage[];
}

export interface SaveProjectMemoryRequest {
  projectPath: string;
  fileCount: number;
  extensionsSummary: Record<string, number>;
}

export interface CreateSessionRequest {
  projectId: string;
  initialData: Partial<SessionItem>;
}

export interface UpdateSessionRequest {
  projectId: string;
  sessionId: string;
  partialData: Partial<SessionItem>;
}

export interface SessionRequest {
  projectId: string;
  sessionId: string;
}

export interface ProjectSessionsRequest {
  projectId: string;
}

export interface ExecutePromptRequest {
  rawRequest: string;
  finalPrompt: string;
  selectedVariant: PromptVariant;
  detectedIntent: DetectedIntent;
  projectContext: ProjectContext;
  contextFiles?: ProjectContextFile[];
  executionMode?: ExecutionMode;
}

export interface ExecutePromptResponse {
  content: string;
  usage?: unknown;
  createdAt: string;
  patchPlan?: PatchPlan;
  patchWarnings?: string[];
}

export type ProviderCapability =
  | "chat"
  | "streaming"
  | "tools"
  | "vision"
  | "reasoning"
  | "webSearch"
  | "imageGeneration"
  | "audio"
  | "longContext"
  | "local";

export type ProviderAuthType = "apiKey" | "oauth" | "none" | "custom";

export type AiAuthMethodId =
  | "apiKey"
  | "oauthPkce"
  | "deviceCode"
  | "tokenImport"
  | "cookieSession"
  | "localNoAuth";

export interface ProviderAuthMethodMetadata {
  id: AiAuthMethodId;
  displayName: string;
  description?: string;
  requiresSecret: boolean;
  supportsRefresh: boolean;
  status: "available" | "future" | "experimental";
  requiresClientId?: boolean;
  scopes?: string[];
}

export interface ProviderModelDefinition {
  id: string;
  displayName: string;
  contextWindowTokens?: number;
  capabilities: ProviderCapability[];
}

export type ProviderCategory =
  | "oauth"
  | "free-tier"
  | "api-key"
  | "local"
  | "custom";

export type ProviderModelDiscoveryStrategy =
  | "openai-compatible"
  | "openrouter"
  | "gemini"
  | "anthropic"
  | "ollama"
  | "lm-studio"
  | "custom-openai-compatible"
  | "manual";

export interface ProviderModelDiscoveryDefinition {
  strategy: ProviderModelDiscoveryStrategy;
  endpoint?: string;
  supportsRemote: boolean;
  cacheable: boolean;
}

export interface DoniModelCapabilities {
  chat: boolean;
  code: boolean;
  vision: boolean;
  imageInput: boolean;
  imageOutput: boolean;
  toolCalling: boolean;
  functionCalling: boolean;
  streaming: boolean;
  reasoning: boolean;
  embedding: boolean;
  rerank: boolean;
}

export interface DoniModel {
  id: string;
  provider: string;
  accountId?: string;
  accountName?: string;
  displayName: string;
  rawId: string;
  family?: string;
  description?: string;
  capabilities: DoniModelCapabilities;
  limits?: {
    contextWindow?: number;
    maxOutputTokens?: number;
    inputTokenLimit?: number;
    outputTokenLimit?: number;
  };
  pricing?: {
    inputPerMillion?: number;
    outputPerMillion?: number;
    currency?: string;
  };
  availability: {
    available: boolean;
    reason?: string;
    source: "remote" | "local" | "merged" | "fallback";
  };
  fetchedAt?: string;
  raw?: unknown;
}

export interface ListDoniModelsRequest {
  providerId?: string;
  accountId?: string;
  refresh?: boolean;
  includeUnavailable?: boolean;
}

export interface DoniModelDiscoveryResult {
  models: DoniModel[];
  registry?: DoniModelRegistryProvider[];
  refreshedAt?: string;
  warnings?: string[];
}

export interface DoniModelRegistryAccount {
  accountId: string;
  accountName: string;
  status: AiAccountStatus;
  models: DoniModel[];
  refreshedAt?: string;
  warning?: string;
}

export interface DoniModelRegistryProvider {
  providerId: string;
  providerName: string;
  accounts: DoniModelRegistryAccount[];
}

export type ProviderAccountConnectionState =
  | "connected"
  | "error"
  | "disconnected";

export interface ProviderAccountConnectionSummary {
  accountId: string;
  providerId: string;
  displayName: string;
  status: ProviderAccountConnectionState;
  apiBase?: string;
  errorCode?: string;
  errorMessage?: string;
  errorTime?: string;
}

export interface ProviderConnectionSummary {
  providerId: string;
  totalAccounts: number;
  connectedAccounts: number;
  errorAccounts: number;
  disconnectedAccounts: number;
  lastErrorCode?: string;
  lastErrorTime?: string;
  label: string;
  readinessLabel: "No Connections" | "Ready" | "Degraded" | "Error";
  accounts: ProviderAccountConnectionSummary[];
}

export interface ProviderDefinition {
  id: string;
  displayName: string;
  icon: string;
  category: ProviderCategory;
  authType: ProviderAuthType;
  authMethods?: ProviderAuthMethodMetadata[];
  defaultApiBase?: string;
  modelDiscovery: ProviderModelDiscoveryDefinition;
  connectionSummary?: ProviderConnectionSummary;
  capabilities: ProviderCapability[];
  supportedModels: ProviderModelDefinition[];
}

export type AiAccountStatus = "active" | "disabled" | "cooldown" | "invalid";

export interface AiAccountQuota {
  remainingRequests?: number;
  remainingTokens?: number;
  resetsAt?: string;
}

export interface AiProviderAccount {
  id: string;
  providerId: string;
  displayName: string;
  authMethod?: AiAuthMethodId;
  status: AiAccountStatus;
  priority: number;
  healthScore: number;
  cooldownUntil?: string;
  lastError?: string;
  lastErrorCode?: string;
  lastErrorTime?: string;
  quota?: AiAccountQuota;
  lastUsed?: string;
  secretReference?: string;
  credentialReferences?: {
    apiKey?: string;
    accessToken?: string;
    refreshToken?: string;
    oauthClientSecret?: string;
    cookie?: string;
    copilotToken?: string;
  };
  authState?: {
    configured?: boolean;
    expiresAt?: string;
    refreshable?: boolean;
    lastRefreshAt?: string;
    clientId?: string;
    scopes?: string[];
  };
  metadata?: Record<string, string | number | boolean | null | undefined>;
  apiBase?: string;
  modelIds?: string[];
}

export interface AiModelSelection {
  providerId: string;
  accountId?: string;
  modelId: string;
}

export interface UpsertAiProviderAccountRequest {
  accountId?: string;
  providerId: string;
  displayName: string;
  apiBase?: string;
  modelIds?: string[];
  authMethod?: AiAuthMethodId;
  status?: AiAccountStatus;
  priority?: number;
  healthScore?: number;
  secretReference?: string;
  apiKey?: string;
  makeDefault?: boolean;
}

export interface DeleteAiProviderAccountRequest {
  accountId: string;
}

export interface TestAiProviderAccountRequest {
  accountId?: string;
  providerId: string;
  displayName: string;
  apiBase?: string;
  model: string;
  authMethod?: AiAuthMethodId;
  secretReference?: string;
  apiKey?: string;
}

export interface GetProviderAuthMetadataRequest {
  providerId: string;
}

export interface ProviderAuthMetadataResponse {
  providerId: string;
  known: boolean;
  errorCode?: "unknown_provider";
  message?: string;
  authMethods: ProviderAuthMethodMetadata[];
}

export interface StartProviderAuthRequest {
  providerId: string;
  authMethod: AiAuthMethodId;
  accountId?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scopes?: string[];
}

export interface PollProviderAuthRequest {
  sessionId: string;
}

export interface CancelProviderAuthRequest {
  sessionId: string;
}

export interface RefreshProviderAccountRequest {
  accountId: string;
}

export type ProviderAuthFlowStatus =
  | "started"
  | "pending"
  | "completed"
  | "cancelled"
  | "denied"
  | "slow_down"
  | "expired"
  | "not_implemented"
  | "not_refreshable"
  | "not_required"
  | "error";

export interface ProviderAuthFlowResponse {
  ok: boolean;
  status: ProviderAuthFlowStatus;
  providerId?: string;
  authMethod?: AiAuthMethodId;
  sessionId?: string;
  authorizationUrl?: string;
  verificationUri?: string;
  verificationUriComplete?: string;
  userCode?: string;
  expiresAt?: string;
  intervalSeconds?: number;
  accountId?: string;
  accountDisplayName?: string;
  message?: string;
}

export interface RefreshProviderAccountResponse {
  ok: boolean;
  status: ProviderAuthFlowStatus;
  accountId: string;
  providerId?: string;
  expiresAt?: string;
  message?: string;
}

export interface AiAccountHealthRecord {
  accountId: string;
  providerId: string;
  healthScore: number;
  failureCount: number;
  cooldownUntil?: string;
  lastFailureAt?: string;
  lastSuccessAt?: string;
  lastError?: string;
  lastErrorCode?: string;
  updatedAt: string;
}

export interface AiModelLockRecord {
  accountId: string;
  providerId: string;
  model: string;
  lockedUntil: string;
  reason: string;
  updatedAt: string;
}

export type AiTaskType =
  | "chat"
  | "quick-chat"
  | "code-edit"
  | "code-review"
  | "refactor"
  | "debug"
  | "explain"
  | "generate-test"
  | "commit-message";

export interface AiRoutingProfile {
  taskType: AiTaskType;
  providerId?: string;
  accountId?: string;
  model: string;
  modelSelection?: AiModelSelection;
  fallbackProviderIds?: string[];
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface ContextBundle {
  sources: Array<{
    type:
      | "currentFile"
      | "selection"
      | "openTab"
      | "projectTree"
      | "gitDiff"
      | "recentChange"
      | "diagnostic"
      | "terminal"
      | "searchResult"
      | "workspaceMemory"
      | "userMemory";
    label: string;
    content: string;
    score?: number;
    tokenEstimate?: number;
  }>;
  budget: {
    maxTokens: number;
    usedTokens: number;
    allocations: Record<string, number>;
  };
}

export interface ChatRequest {
  taskType: AiTaskType;
  messages: ChatMessage[];
  model?: string;
  providerId?: string;
  accountId?: string;
  contextBundle?: ContextBundle;
  stream?: boolean;
  temperature?: number;
}

export interface ChatResponse {
  content: string;
  usage?: unknown;
  providerId: string;
  accountId: string;
  model: string;
  createdAt: string;
  warnings?: string[];
}

export type ChatStreamEventType =
  | "start"
  | "text_delta"
  | "reasoning_delta"
  | "tool_call_delta"
  | "usage"
  | "warning"
  | "error"
  | "done"
  | "cancelled";

export interface ChatStreamEvent {
  type: ChatStreamEventType;
  timestamp: string;
  providerId?: string;
  accountId?: string;
  model?: string;
  delta?: string;
  usage?: unknown;
  warning?: string;
  error?: string;
}

export interface RouteDecision {
  providerId: string;
  accountId: string;
  model: string;
  reason: string;
  fallbackChain: Array<{
    providerId: string;
    accountId: string;
    model: string;
  }>;
}

export interface AiSettings {
  apiBase: string;
  apiKey: string;
  secretReference?: string;
  model: string;
  plannerModel: string;
  executorModel: string;
  plannerModelSelection?: AiModelSelection;
  executorModelSelection?: AiModelSelection;
  plannerModelIds?: string[];
  executorModelIds?: string[];
  customModels: string[];
  executorProvider: "custom" | "codex";
  selectedAccountId?: string;
  accounts?: AiProviderAccount[];
  routingProfiles?: AiRoutingProfile[];
  modelLibrary?: DoniModel[];
  visibleModels?: Record<string, string[]>;
  routingFallbackEnabled?: boolean;
  maxContextFiles: number;
  ignorePatterns: string[];
  autoBackup: boolean;
  diffMode: "inline" | "split";
  codexSandbox: "read-only" | "workspace-write";
}

export interface AntiProviderAccount {
  id: string;
  account: string;
  accessToken: string;
  refreshToken: string;
  accessTokenReference?: string;
  refreshTokenReference?: string;
  chatgptAccountId?: string;
}

export interface AntiProviderState {
  accounts: AntiProviderAccount[];
  selectedProviderId?: string;
  sourceFilePath?: string;
}

export interface AiNetworkEvent {
  id: string;
  startedAt: string;
  finishedAt?: string;
  method: "POST";
  url: string;
  model: string;
  status?: number;
  ok?: boolean;
  durationMs?: number;
  requestBytes: number;
  responseBytes?: number;
  error?: string;
}

export interface AiExecutionStreamEvent {
  source: "api" | "codex";
  type: "content" | "stdout" | "stderr" | "status";
  data: string;
  timestamp: string;
}

export type UpdaterPhase =
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

export interface UpdaterStatus {
  phase: UpdaterPhase;
  currentVersion: string;
  updateVersion?: string;
  message?: string;
  error?: string;
  isDev: boolean;
  checkedAt?: string;
}

export interface UpdaterProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

export interface UpdaterApi {
  status: () => Promise<UpdaterStatus>;
  check: () => Promise<UpdaterStatus>;
  download: () => Promise<UpdaterStatus>;
  install: () => Promise<void>;
  onStatus: (callback: (status: UpdaterStatus) => void) => () => void;
  onProgress: (callback: (progress: UpdaterProgress) => void) => () => void;
}

export interface ElectronApi {
  openProjectFolder: () => Promise<FolderPickerResult>;
  restoreLastProjectFolder: () => Promise<FolderPickerResult>;
  scanProjectFolder: (
    request: ProjectScanRequest,
  ) => Promise<ScanProjectResult>;
  getProjectChangeSummary: (
    request: ProjectChangeSummaryRequest,
  ) => Promise<ProjectChangeSummaryResponse>;
  getSettings: () => Promise<AiSettings>;
  saveSettings: (settings: AiSettings) => Promise<AiSettings>;
  listImportedAntiProviders: () => Promise<AntiProviderState>;
  importAntiProviders: () => Promise<AntiProviderAccount[]>;
  applyAntiProvider: (account: AntiProviderAccount) => Promise<void>;
  listAiProviders: () => Promise<ProviderDefinition[]>;
  listDoniModels: (
    request?: ListDoniModelsRequest,
  ) => Promise<DoniModelDiscoveryResult>;
  refreshDoniModels: (
    request?: ListDoniModelsRequest,
  ) => Promise<DoniModelDiscoveryResult>;
  listAiAuthMethods: () => Promise<ProviderAuthMethodMetadata[]>;
  getProviderAuthMetadata: (
    request: GetProviderAuthMetadataRequest,
  ) => Promise<ProviderAuthMetadataResponse>;
  startProviderAuth: (
    request: StartProviderAuthRequest,
  ) => Promise<ProviderAuthFlowResponse>;
  pollProviderAuth: (
    request: PollProviderAuthRequest,
  ) => Promise<ProviderAuthFlowResponse>;
  cancelProviderAuth: (
    request: CancelProviderAuthRequest,
  ) => Promise<ProviderAuthFlowResponse>;
  refreshProviderAccount: (
    request: RefreshProviderAccountRequest,
  ) => Promise<RefreshProviderAccountResponse>;
  upsertAiProviderAccount: (
    request: UpsertAiProviderAccountRequest,
  ) => Promise<AiSettings>;
  deleteAiProviderAccount: (
    request: DeleteAiProviderAccountRequest,
  ) => Promise<AiSettings>;
  testAiProviderAccount: (
    request: TestAiProviderAccountRequest,
  ) => Promise<{ ok: boolean; error?: string }>;
  testConnection: (
    settings: AiSettings,
  ) => Promise<{ ok: boolean; error?: string }>;
  getAiNetworkEvents: () => Promise<AiNetworkEvent[]>;
  clearAiNetworkEvents: () => Promise<void>;
  cancelActiveAi: () => Promise<void>;
  onAiNetworkEvent: (callback: (event: AiNetworkEvent) => void) => () => void;
  onAiExecutionStream: (
    callback: (event: AiExecutionStreamEvent) => void,
  ) => () => void;
  optimizePrompt: (
    request: OptimizePromptRequest,
  ) => Promise<OptimizePromptResponse>;
  executePrompt: (
    request: ExecutePromptRequest,
  ) => Promise<ExecutePromptResponse>;
  readProjectFiles: (
    request: ReadProjectFilesRequest,
  ) => Promise<ReadProjectFilesResponse>;
  openInVSCode: (request: OpenInEditorRequest) => Promise<void>;
  getCodexCliStatus: () => Promise<CodexCliStatus>;
  probeCodexCliStatus: (
    request?: ProbeCodexCliRequest,
  ) => Promise<CodexCliStatus>;
  runCodexCli: (request: RunCodexCliRequest) => Promise<RunCodexCliResponse>;
  stopCodexCli: () => Promise<void>;
  applyPatch: (request: ApplyPatchRequest) => Promise<ApplyPatchResponse>;
  rollbackPatch: (
    request: RollbackPatchRequest,
  ) => Promise<RollbackPatchResponse>;
  runProjectCommand: (
    request: RunCommandRequest,
  ) => Promise<RunCommandResponse>;
  stopProjectCommand: () => Promise<void>;
  onCommandOutput: (
    callback: (event: CommandOutputEvent) => void,
  ) => () => void;
  onCommandError: (callback: (event: CommandErrorEvent) => void) => () => void;
  onCommandExit: (callback: (event: CommandExitEvent) => void) => () => void;
  analyzeCommandError: (
    request: AnalyzeCommandErrorRequest,
  ) => Promise<ErrorAnalysisResult>;
  saveProjectMemory: (
    request: SaveProjectMemoryRequest,
  ) => Promise<ProjectMemoryInfo>;
  createSession: (request: CreateSessionRequest) => Promise<SessionItem>;
  updateSession: (request: UpdateSessionRequest) => Promise<SessionItem>;
  listSessions: (request: ProjectSessionsRequest) => Promise<SessionItem[]>;
  getSession: (request: SessionRequest) => Promise<SessionItem>;
  deleteSession: (request: SessionRequest) => Promise<void>;
  clearProjectSessions: (request: ProjectSessionsRequest) => Promise<void>;
  updater: UpdaterApi;
}
