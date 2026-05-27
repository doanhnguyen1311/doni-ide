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
}

export interface FolderPickerResult {
  canceled: boolean;
  folderPath?: string;
  scan?: ScanProjectResult;
}

export type PromptVariantId = string;

export interface PromptVariant {
  id: PromptVariantId;
  title: string;
  description: string;
  prompt: string;
}

export interface DetectedIntent {
  taskType: 'bugfix' | 'refactor' | 'ui' | 'feature' | 'explanation' | 'unknown';
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  needsProjectContext: boolean;
}

export interface OptimizePromptResponse {
  detectedIntent: DetectedIntent;
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

export interface OptimizePromptRequest {
  rawRequest: string;
  projectContext: ProjectContextSummary;
}

export type ExecutionMode = 'answer' | 'patch';

export type PatchRiskLevel = 'low' | 'medium' | 'high';

export interface PatchFileChange {
  relativePath: string;
  changeType: 'modify';
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
  status: 'applied' | 'skipped' | 'failed';
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
  status: 'restored' | 'failed';
  message?: string;
}

export interface RollbackPatchRequest {
  backupId: string;
}

export interface RollbackPatchResponse {
  success: boolean;
  restoredFiles: PatchRollbackFileResult[];
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
}

export interface ElectronApi {
  openProjectFolder: () => Promise<FolderPickerResult>;
  getSettings: () => Promise<AiSettings>;
  saveSettings: (settings: AiSettings) => Promise<AiSettings>;
  testConnection: (settings: AiSettings) => Promise<{ ok: boolean; error?: string }>;
  optimizePrompt: (request: OptimizePromptRequest) => Promise<OptimizePromptResponse>;
  executePrompt: (request: ExecutePromptRequest) => Promise<ExecutePromptResponse>;
  readProjectFiles: (request: ReadProjectFilesRequest) => Promise<ReadProjectFilesResponse>;
  applyPatch: (request: ApplyPatchRequest) => Promise<ApplyPatchResponse>;
  rollbackPatch: (request: RollbackPatchRequest) => Promise<RollbackPatchResponse>;
}
