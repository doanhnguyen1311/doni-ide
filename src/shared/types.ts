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

export interface AiSettings {
  apiBase: string;
  apiKey: string;
  model: string;
  plannerModel: string;
  executorModel: string;
  customModels: string[];
  executorProvider: "custom" | "codex";
  maxContextFiles: number;
  ignorePatterns: string[];
  autoBackup: boolean;
  diffMode: "inline" | "split";
  codexSandbox: "read-only" | "workspace-write";
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
  scanProjectFolder: (
    request: ProjectScanRequest,
  ) => Promise<ScanProjectResult>;
  getProjectChangeSummary: (
    request: ProjectChangeSummaryRequest,
  ) => Promise<ProjectChangeSummaryResponse>;
  getSettings: () => Promise<AiSettings>;
  saveSettings: (settings: AiSettings) => Promise<AiSettings>;
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
