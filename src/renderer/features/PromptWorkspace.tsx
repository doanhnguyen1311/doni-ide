import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { useProjectStore } from "../stores/projectStore";
import { PromptVariantCard } from "../components/PromptVariantCard";
import { PatchPreview } from "../components/PatchPreview";
import { createUnifiedDiff } from "../services/diff";
import type {
  AiSettings,
  AiNetworkEvent,
  DetectedIntent,
  DoniModel,
  ProjectContext,
  ProjectContextFile,
  ProjectContextSummary,
  ProjectChangedFileSummary,
  ProjectFile,
  PromptVariant,
  SessionChatMessage,
} from "../../shared/types";
import {
  getCatalogModel,
  getVisibleModelIds,
  type CatalogModelDefinition,
} from "../../shared/modelCatalog";
import {
  createModelSelectionKey,
  legacyModelSelectionKey,
  modelSelectionKey,
} from "../../shared/modelSelection";

type RequestStyle = "direct" | "planned";
type WorkMode = "quick" | "edit" | "agent";
type ChatMessage = SessionChatMessage;

type DroppedComposerFile = {
  relativePath: string;
  name: string;
  extension: string;
  size: number;
  isProjectFile: boolean;
};

type ProcessingStage =
  | "idle"
  | "planning"
  | "loading-context"
  | "editing"
  | "summarizing";

type ComposerModelOption = CatalogModelDefinition & {
  accountId?: string;
  accountName?: string;
  kind?: "model" | "codexCli";
};
type ComposerModelRole = "planner" | "executor";

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  anthropic: "Anthropic",
  openrouter: "OpenRouter",
  "openai-compatible": "OpenAI Compatible",
  "openai-compatible-local": "OpenAI Compatible Local",
  "custom-endpoint": "Custom Endpoint",
  "user-defined": "User Defined",
  ollama: "Ollama",
  "lm-studio": "LM Studio",
  "openai-codex": "OpenAI Codex",
  "claude-code": "Claude Code",
  "github-copilot": "GitHub Copilot",
  "gemini-cli": "Gemini CLI",
  "kiro-ai": "Kiro AI",
  "nvidia-nim": "NVIDIA NIM",
  "azure-openai": "Azure OpenAI",
  cerebras: "Cerebras",
  "codex-cli": "Codex CLI",
};

const PROVIDER_ICONS: Record<string, string> = {
  openai: "AI",
  gemini: "G",
  anthropic: "C",
  openrouter: "OR",
  "openai-compatible": "AI",
  "openai-compatible-local": "AI",
  "custom-endpoint": "{}",
  "user-defined": "{}",
  ollama: "OL",
  "lm-studio": "LM",
  "openai-codex": "CX",
  "claude-code": "CC",
  "github-copilot": "GH",
  "gemini-cli": "G",
  "kiro-ai": "KI",
  "nvidia-nim": "NV",
  "azure-openai": "AZ",
  cerebras: "CB",
  "codex-cli": "CX",
};

const WORK_MODES: Array<{
  id: WorkMode;
  label: string;
  description: string;
}> = [
  {
    id: "quick",
    label: "Quick Ask",
    description: "Ask directly without planning",
  },
  { id: "edit", label: "Edit No Plan", description: "Create a patch directly" },
  {
    id: "agent",
    label: "Agent",
    description: "Let the coding agent plan and run",
  },
];

const EDIT_CONTEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".css",
  ".scss",
  ".html",
  ".md",
  ".yml",
  ".yaml",
]);

const DEFAULT_ENDPOINT_PROVIDER_IDS = new Set([
  "openai",
  "openrouter",
  "anthropic",
  "gemini",
  "ollama",
  "lm-studio",
  "nvidia-nim",
  "cerebras",
]);

const LOCAL_NO_AUTH_PROVIDER_IDS = new Set([
  "ollama",
  "lm-studio",
  "openai-compatible-local",
]);

function hasRunnableAiSettings(settings: AiSettings): boolean {
  const hasLegacyCredential = Boolean(
    settings.apiBase.trim() &&
    (settings.apiKey.trim() || settings.secretReference?.trim()),
  );
  const hasProviderAccount = settings.accounts?.some((account) => {
    const hasEndpoint =
      Boolean(account.apiBase?.trim()) ||
      DEFAULT_ENDPOINT_PROVIDER_IDS.has(account.providerId);
    const hasCredential =
      LOCAL_NO_AUTH_PROVIDER_IDS.has(account.providerId) ||
      account.authState?.configured ||
      Boolean(
        account.credentialReferences?.apiKey ||
        account.credentialReferences?.accessToken ||
        account.secretReference,
      );
    return (
      account.status !== "disabled" &&
      account.status !== "invalid" &&
      hasEndpoint &&
      hasCredential
    );
  });

  return hasLegacyCredential || Boolean(hasProviderAccount);
}

function buildProjectContext(
  selectedFolder: string,
  files: { relativePath: string; extension: string }[],
): ProjectContextSummary {
  const extensions = files.reduce<Record<string, number>>((acc, file) => {
    const key = file.extension || "[none]";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return {
    folderName:
      selectedFolder.split(/[\\/]/).filter(Boolean).pop() ?? selectedFolder,
    fileCount: files.length,
    topFiles: files.slice(0, 50).map((file) => file.relativePath),
    extensions,
  };
}

function buildExecutionProjectContext(
  selectedFolder: string,
  files: { relativePath: string; extension: string }[],
): ProjectContext {
  const baseContext = buildProjectContext(selectedFolder, files);
  return {
    ...baseContext,
    folderPath: selectedFolder,
    topFiles: files.slice(0, 100).map((file) => file.relativePath),
  };
}

function uniqueFilePaths(filePaths: string[]): string[] {
  return Array.from(
    new Set(
      filePaths
        .map((filePath) => filePath.replace(/\\/g, "/").trim())
        .filter(Boolean),
    ),
  );
}

function FormattedAiResponse({ content }: { content: string }): JSX.Element {
  const parts = content.split(/```([\w.+-]*)\n?([\s\S]*?)```/g);
  return (
    <div className="space-y-4 text-sm leading-7 text-slate-200">
      {parts.map((part, index) => {
        if (index % 3 === 1) return null;
        if (index % 3 === 2) {
          const language = parts[index - 1]?.trim();
          return (
            <div
              key={`${index}-${part.slice(0, 12)}`}
              className="overflow-hidden rounded-2xl border border-white/10 bg-ink/80"
            >
              {language ? (
                <div className="border-b border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {language}
                </div>
              ) : null}
              <pre className="overflow-x-auto p-4 text-xs leading-6 text-slate-100">
                <code>{part.trim()}</code>
              </pre>
            </div>
          );
        }
        return part
          .split(/\n{2,}/)
          .filter(Boolean)
          .map((block, blockIndex) => (
            <p key={`${index}-${blockIndex}`} className="whitespace-pre-wrap">
              {block}
            </p>
          ));
      })}
    </div>
  );
}

function statusToneClass(
  status: "idle" | "active" | "done" | "blocked",
): string {
  if (status === "active")
    return "border-skyglass/40 bg-skyglass/10 text-skyglass";
  if (status === "done") return "border-mint/30 bg-mint/10 text-mint";
  if (status === "blocked") return "border-ember/30 bg-ember/10 text-ember";
  return "border-white/10 bg-white/[0.03] text-slate-400";
}

function compactStreamLines(messages: ChatMessage[]): string[] {
  const latestAssistant = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");
  if (!latestAssistant?.content) return [];
  return latestAssistant.content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("{"))
    .slice(-10);
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function getFileName(filePath: string): string {
  return filePath.split(/[\\/]/).filter(Boolean).pop() ?? filePath;
}

function fileChipTone(extension: string): string {
  const normalized = extension.toLowerCase();
  if (normalized === ".ts" || normalized === ".tsx") {
    return "border-skyglass/40 bg-skyglass/10 text-skyglass shadow-[0_0_28px_rgba(143,211,255,0.13)]";
  }
  if (normalized === ".js" || normalized === ".jsx" || normalized === ".css") {
    return "border-mint/35 bg-mint/10 text-mint shadow-[0_0_28px_rgba(76,224,179,0.12)]";
  }
  return "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-200 shadow-[0_0_28px_rgba(216,180,254,0.11)]";
}

function toComposerFile(projectFile: ProjectFile): DroppedComposerFile {
  return {
    relativePath: projectFile.relativePath,
    name: getFileName(projectFile.relativePath),
    extension: projectFile.extension || "",
    size: projectFile.size,
    isProjectFile: true,
  };
}

function countChangedLines(
  oldContent: string,
  newContent: string,
): { added: number; removed: number } {
  const oldLines = oldContent.split(/\r?\n/);
  const newLines = newContent.split(/\r?\n/);
  const maxLength = Math.max(oldLines.length, newLines.length);
  let added = 0;
  let removed = 0;

  for (let index = 0; index < maxLength; index += 1) {
    const oldLine = oldLines[index];
    const newLine = newLines[index];
    if (oldLine === newLine) continue;
    if (typeof oldLine === "undefined") added += 1;
    else if (typeof newLine === "undefined") removed += 1;
    else {
      added += 1;
      removed += 1;
    }
  }

  return { added, removed };
}

function formatChangedFilesSummary(files: ProjectChangedFileSummary[]): string {
  if (!files.length) return "";
  return [
    "Mình đã xử lý các thay đổi sau:",
    ...files.map(
      (file) =>
        `- ${file.relativePath}: +${file.added} / -${file.removed} dòng`,
    ),
  ].join("\n");
}

function processingStageText(stage: ProcessingStage): string {
  if (stage === "planning") return "Đang đọc yêu cầu và lập hướng xử lý";
  if (stage === "loading-context")
    return "Đang tải file context để chuẩn bị sửa";
  if (stage === "editing") return "Đang chỉnh sửa và tạo thay đổi";
  if (stage === "summarizing") return "Đang tổng hợp file đã sửa";
  return "Đang xử lý";
}

function modelOptionFromId(
  providerId: string,
  modelId: string,
  accountId?: string,
): ComposerModelOption {
  const catalogModel = getCatalogModel(modelId, providerId);
  if (catalogModel) return { ...catalogModel, accountId };
  return {
    id: modelId,
    displayName: modelId,
    providerId,
    providerName: PROVIDER_DISPLAY_NAMES[providerId] ?? providerId,
    providerIcon:
      PROVIDER_ICONS[providerId] ?? providerId.slice(0, 2).toUpperCase(),
    capabilities: ["chat"],
    accountId,
    description: accountId ? "Configured on this provider account." : undefined,
  };
}

function modelOptionFromDoni(model: DoniModel): ComposerModelOption {
  const capabilities: CatalogModelDefinition["capabilities"] = [];
  if (model.capabilities.chat) capabilities.push("chat");
  if (model.capabilities.streaming) capabilities.push("streaming");
  if (model.capabilities.toolCalling || model.capabilities.functionCalling)
    capabilities.push("tools");
  if (model.capabilities.vision || model.capabilities.imageInput)
    capabilities.push("vision");
  if (model.capabilities.reasoning) capabilities.push("reasoning");
  if (model.limits?.contextWindow && model.limits.contextWindow >= 128_000)
    capabilities.push("longContext");
  return {
    id: model.rawId,
    displayName: model.displayName || model.rawId,
    providerId: model.provider,
    providerName: PROVIDER_DISPLAY_NAMES[model.provider] ?? model.provider,
    providerIcon:
      PROVIDER_ICONS[model.provider] ??
      model.provider.slice(0, 2).toUpperCase(),
    capabilities: capabilities.length ? capabilities : ["chat"],
    accountId: model.accountId,
    accountName: model.accountName,
    description:
      model.description ||
      (model.accountName
        ? `${model.accountName} · ${model.availability.source}`
        : model.availability.source),
  };
}

function codexCliModelOption(): ComposerModelOption {
  return {
    id: "codex-cli",
    displayName: "Codex CLI",
    providerId: "codex-cli",
    providerName: "Codex CLI",
    providerIcon: "CX",
    capabilities: ["chat", "tools", "local"],
    kind: "codexCli",
    description: "Run through the local Codex CLI with the configured sandbox.",
  };
}

function modelOptionKey(model: ComposerModelOption): string {
  return createModelSelectionKey(model.providerId, model.id, model.accountId);
}

function modelOptionLegacyKey(model: ComposerModelOption): string {
  return legacyModelSelectionKey(model.providerId, model.id);
}

function modelOptionKeys(model: ComposerModelOption): string[] {
  const keys = [modelOptionKey(model)];
  const legacyKey = modelOptionLegacyKey(model);
  if (legacyKey !== keys[0]) keys.push(legacyKey);
  return keys;
}

function modelOptionMatchesKey(
  model: ComposerModelOption,
  key: string | undefined,
): boolean {
  return Boolean(key && modelOptionKeys(model).includes(key));
}

function buildComposerModelOptions(
  settings: AiSettings | null,
  discoveredModels: DoniModel[] = [],
): ComposerModelOption[] {
  if (!settings) return [];
  const byKey = new Map<string, ComposerModelOption>();

  const addModel = (model: ComposerModelOption): void => {
    byKey.set(modelOptionKey(model), model);
  };

  addModel(codexCliModelOption());

  const visibleProviderIds = Object.keys(settings.visibleModels ?? {});
  const accountProviderIds = (settings.accounts ?? []).map(
    (account) => account.providerId,
  );
  const providerIds = Array.from(
    new Set(["gemini", ...visibleProviderIds, ...accountProviderIds]),
  );

  providerIds.forEach((providerId) => {
    getVisibleModelIds(providerId, settings.visibleModels).forEach((modelId) =>
      addModel(modelOptionFromId(providerId, modelId)),
    );
  });

  discoveredModels
    .filter((model) => model.availability.available)
    .filter((model) => model.capabilities.chat || model.capabilities.code)
    .forEach((model) => addModel(modelOptionFromDoni(model)));

  const accountProviderSet = new Set(accountProviderIds);
  (settings.modelLibrary ?? [])
    .filter((model) => accountProviderSet.has(model.provider))
    .filter((model) => model.capabilities.chat || model.capabilities.code)
    .forEach((model) => addModel(modelOptionFromDoni(model)));

  (settings.accounts ?? [])
    .filter(
      (account) =>
        account.status !== "disabled" && account.status !== "invalid",
    )
    .forEach((account) => {
      const visibleIds = getVisibleModelIds(
        account.providerId,
        settings.visibleModels,
      );
      const hasVisibilityConfig =
        account.providerId === "gemini" ||
        Boolean(settings.visibleModels?.[account.providerId]);
      (account.modelIds ?? []).forEach((modelId) => {
        if (hasVisibilityConfig && !visibleIds.includes(modelId)) return;
        addModel(modelOptionFromId(account.providerId, modelId, account.id));
      });
    });

  [
    ...settings.customModels,
    settings.model,
    settings.plannerModel,
    settings.executorModel,
  ]
    .map((modelId) => modelId.trim())
    .filter(Boolean)
    .forEach((modelId) =>
      addModel(modelOptionFromId("custom-endpoint", modelId)),
    );

  return [...byKey.values()];
}

function groupModelOptions(
  models: ComposerModelOption[],
): Array<[string, ComposerModelOption[]]> {
  const groups = new Map<string, ComposerModelOption[]>();
  models.forEach((model) => {
    const group = groups.get(model.providerId) ?? [];
    group.push(model);
    groups.set(model.providerId, group);
  });
  return [...groups.entries()].map(([providerId, providerModels]) => [
    providerId,
    providerModels.sort((left, right) =>
      left.displayName.localeCompare(right.displayName),
    ),
  ]);
}

function selectedModelForMode(
  settings: AiSettings | null,
  role: ComposerModelRole,
): string {
  if (!settings) return "";
  if (role === "executor" && settings.executorProvider === "codex") {
    return "codex-cli";
  }
  if (role === "planner" && settings.plannerModelSelection?.modelId) {
    return settings.plannerModelSelection.modelId;
  }
  if (role === "executor" && settings.executorModelSelection?.modelId) {
    return settings.executorModelSelection.modelId;
  }
  if (role === "planner")
    return settings.plannerModel || settings.model || settings.executorModel;
  return settings.executorModel || settings.model || settings.plannerModel;
}

export function PromptWorkspace(): JSX.Element {
  const [requestStyle, setRequestStyle] = useState<RequestStyle>("direct");
  const [workMode, setWorkModeState] = useState<WorkMode>("quick");
  const [draftRequest, setDraftRequest] = useState("");
  const [droppedComposerFiles, setDroppedComposerFiles] = useState<
    DroppedComposerFile[]
  >([]);
  const [composerDragActive, setComposerDragActive] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [processingStage, setProcessingStage] =
    useState<ProcessingStage>("idle");
  const [changedFilesSummary, setChangedFilesSummary] = useState<
    ProjectChangedFileSummary[]
  >([]);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState("");
  const [terminalSessionActive, setTerminalSessionActive] = useState(false);
  const [lastNetworkEvent, setLastNetworkEvent] =
    useState<AiNetworkEvent | null>(null);
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null);
  const [discoveredModels, setDiscoveredModels] = useState<DoniModel[]>([]);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [modelSelectorRole, setModelSelectorRole] =
    useState<ComposerModelRole>("executor");
  const [modelSearch, setModelSearch] = useState("");
  const [focusedModelIndex, setFocusedModelIndex] = useState(0);
  const [pendingModelKey, setPendingModelKey] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<string | null>(null);
  const modelSelectorRef = useRef<HTMLDivElement | null>(null);
  const executionStreamRef = useRef("");
  const activeExecutionMessageIdRef = useRef<string | null>(null);
  const chatMessagesRef = useRef<ChatMessage[]>([]);
  const [stopping, setStopping] = useState(false);
  const {
    selectedFolder,
    scannedFiles,
    projectSummary,
    rawRequest,
    selectedPromptVariant,
    promptVariants,
    detectedIntent,
    refinedPrompt,
    executionPlan,
    taskBreakdown,
    implementationSuggestions,
    isLoading,
    isOptimizing,
    executionResult,
    executionLoading,
    executionMode,
    executionError,
    executionStartedAt,
    executionFinishedAt,
    loadedContextFiles,
    selectedContextFilePaths,
    patchPlan,
    patchLoading,
    patchError,
    patchWarnings,
    diffTextByFile,
    applyLoading,
    applyError,
    lastApplyResult,
    rollbackLoading,
    rollbackError,
    rollbackResult,
    activeProjectId,
    activeSessionId,
    sessions,
    error,
    setSelectedFolder,
    setScannedFiles,
    setProjectSummary,
    restoreLastProjectFolder,
    refreshProjectScan,
    setRawRequest,
    setPromptOptimization,
    setSelectedPromptVariant,
    setLoading,
    setOptimizing,
    setExecutionResult,
    setExecutionMode,
    setExecutionLoading,
    setExecutionError,
    setExecutionStartedAt,
    setExecutionFinishedAt,
    clearExecution,
    setPatchPlan,
    setPatchLoading,
    clearPatchPlan,
    setPatchError,
    applyPatch,
    rollbackLastPatch,
    clearApplyResult,
    addContextFile,
    toggleContextFile,
    loadContextFiles,
    clearContextFiles,
    saveProjectMemory,
    createCurrentSession,
    updateCurrentSession,
    startNewChat,
    openSession,
    loadProjectSessions,
    setError,
    refreshCodexStatus,
  } = useProjectStore();

  useEffect(() => {
    if (!selectedFolder) {
      void restoreLastProjectFolder();
    }
  }, [restoreLastProjectFolder, selectedFolder]);

  useEffect(() => {
    if (typeof window.doni.onAiNetworkEvent !== "function") return;
    return window.doni.onAiNetworkEvent((event) => setLastNetworkEvent(event));
  }, []);

  useEffect(() => {
    if (typeof window.doni.getSettings !== "function") return;
    void window.doni
      .getSettings()
      .then(setAiSettings)
      .catch(() => undefined);
    const onSettingsUpdated = (event: Event): void => {
      const nextSettings = (event as CustomEvent<AiSettings>).detail;
      if (nextSettings) setAiSettings(nextSettings);
    };
    window.addEventListener("doni-settings-updated", onSettingsUpdated);
    return () =>
      window.removeEventListener("doni-settings-updated", onSettingsUpdated);
  }, []);

  useEffect(() => {
    if (!aiSettings || typeof window.doni.listDoniModels !== "function") return;
    void window.doni
      .listDoniModels()
      .then((result) => setDiscoveredModels(result.models))
      .catch(() => undefined);
  }, [aiSettings?.accounts, aiSettings?.selectedAccountId]);

  useEffect(() => {
    if (!modelSelectorOpen) return;
    const onPointerDown = (event: PointerEvent): void => {
      if (
        modelSelectorRef.current &&
        event.target instanceof Node &&
        !modelSelectorRef.current.contains(event.target)
      ) {
        setModelSelectorOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [modelSelectorOpen]);

  useEffect(() => {
    if (typeof window.doni.onAiExecutionStream !== "function") return;
    return window.doni.onAiExecutionStream((event) => {
      if (event.source === "codex") {
        const prefix =
          event.type === "stderr"
            ? "[stderr] "
            : event.type === "status"
              ? "[status] "
              : "";
        setTerminalOutput((current) =>
          `${current}${prefix}${event.data}`.slice(-80000),
        );
        return;
      }
      const chunk =
        event.type === "stderr" ? `[stderr] ${event.data}` : event.data;
      executionStreamRef.current = `${executionStreamRef.current}${chunk}`;
      appendExecutionStreamMessage(chunk);
    });
  }, []);

  useEffect(() => {
    if (!activeSessionId) {
      chatMessagesRef.current = [];
      setChatMessages([]);
      setSubmittedMessage("");
      setDraftRequest("");
      setChangedFilesSummary([]);
      setTerminalOpen(false);
      setTerminalOutput("");
      setTerminalSessionActive(false);
      setProcessingStage("idle");
      clearExecutionStream();
      return;
    }
    const session = sessions.find((item) => item.id === activeSessionId);
    if (!session) return;
    const restoredMessages: ChatMessage[] = session.chatMessages?.length
      ? session.chatMessages
      : [
          ...(session.rawRequest.trim()
            ? [
                {
                  id: `${session.id}-user`,
                  role: "user" as const,
                  content: session.rawRequest,
                },
              ]
            : []),
          ...(session.executionResult?.trim()
            ? [
                {
                  id: `${session.id}-assistant`,
                  role: "assistant" as const,
                  kind:
                    session.executionMode === "patch"
                      ? ("patch" as const)
                      : ("answer" as const),
                  content: session.executionResult,
                },
              ]
            : []),
        ];
    chatMessagesRef.current = restoredMessages;
    setChatMessages(restoredMessages);
    setSubmittedMessage(session.rawRequest);
    setDraftRequest("");
    setChangedFilesSummary([]);
    setTerminalOpen(false);
    setTerminalOutput("");
    setProcessingStage("idle");
    clearExecutionStream();
  }, [activeSessionId]);

  const createChatMessageId = (): string =>
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const persistChatMessages = (
    messages = chatMessagesRef.current,
    extra: Parameters<typeof updateCurrentSession>[0] = {},
  ): void => {
    if (!activeProjectId) return;
    void updateCurrentSession({ ...extra, chatMessages: messages });
  };

  const replaceChatMessages = (messages: ChatMessage[]): ChatMessage[] => {
    chatMessagesRef.current = messages;
    setChatMessages(messages);
    return messages;
  };

  const appendChatMessage = (
    message: Omit<ChatMessage, "id">,
    persist = false,
    extraSessionData: Parameters<typeof updateCurrentSession>[0] = {},
  ): { id: string; messages: ChatMessage[] } => {
    const id = createChatMessageId();
    const messages = replaceChatMessages([
      ...chatMessagesRef.current,
      {
        ...message,
        id,
      },
    ]);
    if (persist) {
      void updateCurrentSession({
        ...extraSessionData,
        chatMessages: messages,
      });
    }
    return { id, messages };
  };

  const updateChatMessage = (
    id: string,
    update: Partial<Omit<ChatMessage, "id">>,
    persist = false,
    extraSessionData: Parameters<typeof updateCurrentSession>[0] = {},
  ): ChatMessage[] => {
    const messages = replaceChatMessages(
      chatMessagesRef.current.map((message) =>
        message.id === id ? { ...message, ...update } : message,
      ),
    );
    if (persist) {
      void updateCurrentSession({
        ...extraSessionData,
        chatMessages: messages,
      });
    }
    return messages;
  };

  const appendExecutionStreamMessage = (chunk: string): void => {
    const messageId =
      activeExecutionMessageIdRef.current ??
      appendChatMessage({
        role: "assistant",
        kind: "answer",
        content: "",
      }).id;
    activeExecutionMessageIdRef.current = messageId;
    replaceChatMessages(
      chatMessagesRef.current.map((message) =>
        message.id === messageId
          ? { ...message, content: `${message.content}${chunk}` }
          : message,
      ),
    );
  };

  const finishExecutionChatMessage = (
    content: string,
    kind: ChatMessage["kind"] = "answer",
  ): ChatMessage[] => {
    const messageId = activeExecutionMessageIdRef.current;
    if (messageId) {
      const messages = updateChatMessage(messageId, {
        role: "assistant",
        kind,
        content,
      });
      activeExecutionMessageIdRef.current = null;
      return messages;
    }
    return appendChatMessage({
      role: "assistant",
      kind,
      content,
    }).messages;
  };

  const clearExecutionStream = (): void => {
    executionStreamRef.current = "";
    activeExecutionMessageIdRef.current = null;
  };

  const openProjectFolder = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.doni.openProjectFolder();
      if (result.canceled || !result.folderPath || !result.scan) return;
      setSelectedFolder(result.folderPath);
      setScannedFiles(result.scan.files);
      setProjectSummary(result.scan.summary);
      clearContextFiles();
      clearExecution();
      clearApplyResult();
      await saveProjectMemory(result.folderPath, result.scan.files);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể mở thư mục dự án.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const planTask = async (requestText = rawRequest): Promise<void> => {
    const trimmedRequest = requestText.trim();
    if (!selectedFolder) {
      setError("Hãy mở thư mục dự án trước khi lập kế hoạch.");
      return;
    }
    if (!trimmedRequest) {
      setError("Hãy mô tả việc bạn muốn AI làm trước.");
      return;
    }

    if (
      typeof window.doni.getSettings !== "function" ||
      typeof window.doni.optimizePrompt !== "function"
    ) {
      setError(
        "Electron preload API đã cũ. Hãy khởi động lại toàn bộ app, không chỉ refresh React.",
      );
      return;
    }

    setError(null);
    setSelectedPromptVariant(null);
    clearExecution();
    setOptimizing(true);
    setProcessingStage("planning");
    try {
      const settings = await window.doni.getSettings();
      if (
        !hasRunnableAiSettings(settings) ||
        !(settings.plannerModel || settings.model).trim()
      ) {
        throw new Error(
          "Thiếu cài đặt planner. Hãy điền URL API Base, Khóa API và Model A lập kế hoạch.",
        );
      }
      const result = await window.doni.optimizePrompt({
        rawRequest: trimmedRequest,
        projectContext: buildProjectContext(selectedFolder, scannedFiles),
      });
      setPromptOptimization(
        result.detectedIntent,
        result.variants,
        result.refinedPrompt,
        result.executionPlan,
        result.taskBreakdown,
        result.implementationSuggestions,
      );
      await createCurrentSession();
      await updateCurrentSession({
        rawRequest: trimmedRequest,
        detectedIntent: result.detectedIntent,
        refinedPrompt: result.refinedPrompt,
        executionPlan: result.executionPlan,
        taskBreakdown: result.taskBreakdown,
        implementationSuggestions: result.implementationSuggestions,
        promptVariants: result.variants,
        chatMessages: chatMessagesRef.current,
      });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Lập kế hoạch thất bại.";
      setError(
        message.replace(
          /^Error invoking remote method 'optimize-prompt': Error: /,
          "",
        ),
      );
    } finally {
      setOptimizing(false);
      setProcessingStage("idle");
    }
  };

  const buildDirectIntent = (requestText: string): DetectedIntent => ({
    taskType: "unknown",
    summary: requestText.trim() || "Không lập kế hoạch",
    riskLevel: "medium",
    needsProjectContext: true,
  });
  const buildDirectVariant = (requestText: string): PromptVariant => ({
    id: "direct-question",
    title: "Không lập kế hoạch",
    description:
      "Gửi nguyên yêu cầu cho executor, không qua bước lập kế hoạch.",
    prompt: requestText.trim(),
    plan: [],
    tradeoffs: [],
    suggestedFiles: [],
    estimatedRisk: "medium",
  });
  const buildPlannedFallbackVariant = (requestText: string): PromptVariant => ({
    id: "generated-plan",
    title: "Kế hoạch đã generate",
    description:
      "Chạy theo kế hoạch đã tạo mà không cần chọn một strategy riêng.",
    prompt: (refinedPrompt || requestText).trim(),
    plan: executionPlan,
    tradeoffs: [],
    suggestedFiles: uniqueFilePaths(
      promptVariants.flatMap((variant) => variant.suggestedFiles),
    ),
    estimatedRisk: detectedIntent?.riskLevel ?? "medium",
  });
  const activeRequestText = submittedMessage || rawRequest;
  const directIntent = buildDirectIntent(activeRequestText);
  const directVariant = buildDirectVariant(activeRequestText);
  const plannedFallbackVariant =
    requestStyle === "planned" && detectedIntent && activeRequestText.trim()
      ? buildPlannedFallbackVariant(activeRequestText)
      : undefined;
  const plannedVariant = promptVariants.find(
    (variant) => variant.id === selectedPromptVariant,
  );
  const selectedVariant =
    requestStyle === "direct"
      ? activeRequestText.trim()
        ? directVariant
        : undefined
      : (plannedVariant ?? plannedFallbackVariant);
  const executionIntent =
    requestStyle === "direct" ? directIntent : detectedIntent;
  const canRunTask = Boolean(
    selectedFolder &&
    activeRequestText.trim() &&
    selectedVariant?.prompt.trim() &&
    (requestStyle === "direct" || detectedIntent),
  );
  async function loadEditContextFiles(
    settingsMaxContextFiles: number,
    contextVariant = selectedVariant,
  ): Promise<ProjectContextFile[]> {
    if (!selectedFolder) return [];
    if (loadedContextFiles.length) return loadedContextFiles;

    const scannedPathSet = new Set(
      scannedFiles.map((file) => file.relativePath),
    );
    const fallbackPaths = uniqueFilePaths([
      ...selectedContextFilePaths,
      ...(contextVariant?.suggestedFiles ?? []),
      ...(projectSummary?.importantFiles ?? []),
      ...(projectSummary?.entryPoints ?? []),
      ...scannedFiles
        .filter((file) =>
          EDIT_CONTEXT_EXTENSIONS.has(file.extension.toLowerCase()),
        )
        .map((file) => file.relativePath),
    ])
      .filter((filePath) => scannedPathSet.has(filePath))
      .slice(0, Math.max(1, Math.min(30, settingsMaxContextFiles || 10)));

    if (!fallbackPaths.length) {
      throw new Error(
        "Không tìm thấy tệp phù hợp để tạo bản chỉnh sửa. Hãy mở đúng thư mục dự án hoặc lập kế hoạch trước.",
      );
    }

    const result = await window.doni.readProjectFiles({
      folderPath: selectedFolder,
      relativePaths: fallbackPaths,
    });
    return result.files;
  }

  const runTask = async (
    requestText = rawRequest,
    variantOverride?: PromptVariant,
  ): Promise<void> => {
    const trimmedRequest = requestText.trim();
    const effectiveVariant =
      requestStyle === "direct"
        ? buildDirectVariant(trimmedRequest)
        : (variantOverride ?? selectedVariant);
    const effectiveIntent =
      requestStyle === "direct"
        ? buildDirectIntent(trimmedRequest)
        : executionIntent;
    if (!selectedFolder) {
      setExecutionError("Hãy mở thư mục dự án trước khi chạy tác vụ.");
      return;
    }
    if (!effectiveIntent || !effectiveVariant) {
      setExecutionError("Hãy chọn chiến lược trước.");
      return;
    }
    if (!effectiveVariant.prompt.trim()) {
      setExecutionError("Prompt cuối đang trống. Hãy chọn chiến lược trước.");
      return;
    }
    if (typeof window.doni.executePrompt !== "function") {
      setExecutionError(
        "Electron preload API đã cũ. Hãy khởi động lại toàn bộ app, không chỉ refresh React.",
      );
      return;
    }

    const startedAt = new Date().toISOString();
    setExecutionLoading(true);
    setPatchLoading(executionMode === "patch");
    setExecutionError(null);
    setPatchError(null);
    clearApplyResult();
    setExecutionResult(null);
    clearExecutionStream();
    clearPatchPlan();
    setChangedFilesSummary([]);
    setTerminalOutput("");
    setTerminalOpen(false);
    setTerminalSessionActive(false);
    setExecutionStartedAt(startedAt);
    setExecutionFinishedAt(null);
    setProcessingStage(
      executionMode === "patch" ? "loading-context" : "editing",
    );

    try {
      const settings = await window.doni.getSettings();
      if (settings.executorProvider === "codex" && workMode !== "quick") {
        const canWrite = settings.codexSandbox === "workspace-write";
        if (executionMode === "patch") {
          if (!canWrite) {
            throw new Error(
              "Edit No Plan đang dùng Codex nhưng sandbox đang là read-only, nên Codex không được phép sửa file. Hãy chuyển Codex sandbox sang workspace-write trong Settings, hoặc đổi Executor Provider sang Custom để tạo patch preview rồi bấm Apply.",
            );
          }
          setTerminalSessionActive(true);
          setProcessingStage("editing");
          const response = await window.doni.runCodexCli({
            folderPath: selectedFolder,
            sandbox: "workspace-write",
            prompt: [
              "You are being called from Doni in Edit No Plan mode.",
              "Modify files directly in the workspace when the request clearly requires a code change.",
              "Do not only describe a patch. Keep edits small, preserve existing style, and summarize changed files plus verification steps.",
              "",
              `Yêu cầu gốc:\n${trimmedRequest}`,
              "",
              `Prompt:\n${effectiveVariant.prompt}`,
            ].join("\n"),
          });
          setExecutionResult({
            content: response.content,
            createdAt: response.finishedAt,
          });
          setProcessingStage("summarizing");
          const changeSummary = await window.doni.getProjectChangeSummary({
            folderPath: selectedFolder,
          });
          setChangedFilesSummary(changeSummary.files);
          await refreshProjectScan(selectedFolder);
          const changeSummaryText = formatChangedFilesSummary(
            changeSummary.files,
          );
          const savedExecutionResult = response.content.trim();
          const nextMessages = finishExecutionChatMessage(
            changeSummaryText
              ? `${savedExecutionResult}\n\n${changeSummaryText}`
              : savedExecutionResult,
          );
          await updateCurrentSession({
            rawRequest: trimmedRequest,
            detectedIntent: effectiveIntent,
            selectedVariant: effectiveVariant,
            finalPrompt: effectiveVariant.prompt,
            executionMode: "answer",
            executionResult: changeSummaryText
              ? `${savedExecutionResult}\n\n${changeSummaryText}`
              : savedExecutionResult,
            chatMessages: nextMessages,
          });
          return;
        }
        setTerminalSessionActive(true);
        const response = await window.doni.runCodexCli({
          folderPath: selectedFolder,
          sandbox: settings.codexSandbox,
          prompt: [
            "You are being called from Doni, a desktop AI coding companion.",
            canWrite
              ? "You may modify files inside the workspace if that is necessary. Keep edits small and summarize every changed file."
              : "Do not modify files. Analyze the project and return a reviewable plan plus unified diff suggestions if code should change.",
            canWrite
              ? "After editing, include verification commands the user should run."
              : "The user will review/apply changes in Doni, so do not claim that edits were applied.",
            "",
            `Yêu cầu gốc:\n${trimmedRequest}`,
            "",
            `${requestStyle === "direct" ? "Prompt" : "Chiến lược đã chọn"}:\n${effectiveVariant.title}\n${effectiveVariant.prompt}`,
          ].join("\n"),
        });
        setExecutionResult({
          content: response.content,
          createdAt: response.finishedAt,
        });
        const savedExecutionResult = response.content.trim();
        const nextMessages = finishExecutionChatMessage(savedExecutionResult);
        await updateCurrentSession({
          rawRequest: trimmedRequest,
          detectedIntent: effectiveIntent,
          selectedVariant: effectiveVariant,
          finalPrompt: effectiveVariant.prompt,
          executionMode: "answer",
          executionResult: savedExecutionResult,
          chatMessages: nextMessages,
        });
        return;
      }
      if (
        !hasRunnableAiSettings(settings) ||
        !(
          workMode === "quick"
            ? settings.plannerModel || settings.model
            : settings.executorModel || settings.model
        ).trim()
      ) {
        throw new Error(
          workMode === "quick"
            ? "Thiếu cài đặt planner. Hãy điền URL API Base, Khóa API và Model A lập kế hoạch."
            : "Thiếu cài đặt executor. Hãy điền URL API Base, Khóa API và Model B executor.",
        );
      }
      const contextFiles =
        executionMode === "patch"
          ? await loadEditContextFiles(
              settings.maxContextFiles,
              effectiveVariant,
            )
          : loadedContextFiles;
      setProcessingStage("editing");
      const result = await window.doni.executePrompt({
        rawRequest: trimmedRequest,
        finalPrompt: effectiveVariant.prompt,
        selectedVariant: effectiveVariant,
        detectedIntent: effectiveIntent,
        projectContext: buildExecutionProjectContext(
          selectedFolder,
          scannedFiles,
        ),
        contextFiles,
        executionMode,
      });
      setExecutionResult(result);
      const lineSummary =
        executionMode === "patch" && result.patchPlan
          ? result.patchPlan.files.map((file) => ({
              relativePath: file.relativePath,
              ...countChangedLines(file.oldContent, file.newContent),
            }))
          : [];
      if (lineSummary.length) {
        setChangedFilesSummary(lineSummary);
      }
      const lineSummaryText = formatChangedFilesSummary(lineSummary);
      const nextMessages = finishExecutionChatMessage(
        executionMode === "patch"
          ? `Mình đã tạo bản chỉnh sửa xem trước bên dưới.${lineSummaryText ? `\n\n${lineSummaryText}` : ""}`
          : result.content,
        executionMode === "patch" ? "patch" : "answer",
      );
      await updateCurrentSession({
        rawRequest: trimmedRequest,
        detectedIntent: effectiveIntent,
        selectedVariant: effectiveVariant,
        finalPrompt: effectiveVariant.prompt,
        executionMode,
        executionResult:
          executionMode === "patch" && lineSummaryText
            ? `${result.content}\n\n${lineSummaryText}`
            : result.content,
        loadedContextFilePaths: contextFiles.map((file) => file.relativePath),
        chatMessages: nextMessages,
      });
      if (executionMode === "patch") {
        if (!result.patchPlan) {
          setPatchError(
            result.patchWarnings?.join("\n") ??
              "AI không trả về patch plan hợp lệ. Nội dung phản hồi đã được giữ trong chat.",
          );
          return;
        }
        const diffs = Object.fromEntries(
          result.patchPlan.files.map((file) => [
            file.relativePath,
            createUnifiedDiff(
              file.relativePath,
              file.oldContent,
              file.newContent,
            ),
          ]),
        );
        setPatchPlan(
          result.patchPlan,
          result.patchWarnings ?? result.patchPlan.warnings,
          diffs,
        );
        await updateCurrentSession({
          patchPlanSummary: {
            summary: result.patchPlan.summary,
            riskLevel: result.patchPlan.riskLevel,
            changedFiles: result.patchPlan.files.map(
              (file) => file.relativePath,
            ),
          },
        });
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Chạy tác vụ thất bại.";
      const cleanMessage = message.replace(
        /^Error invoking remote method 'ai:executePrompt': Error: /,
        "",
      );
      if (executionMode === "patch") {
        setPatchError(cleanMessage);
      } else {
        setExecutionError(cleanMessage);
      }
      const nextMessages = finishExecutionChatMessage(cleanMessage, "error");
      await updateCurrentSession({
        rawRequest: trimmedRequest,
        executionMode,
        chatMessages: nextMessages,
      });
    } finally {
      setExecutionLoading(false);
      setPatchLoading(false);
      if (selectedFolder) {
        await refreshProjectScan(selectedFolder).catch(() => undefined);
      }
      setProcessingStage("idle");
      setExecutionFinishedAt(new Date().toISOString());
    }
  };

  const runCodexTask = async (): Promise<void> => {
    if (!selectedFolder) {
      setExecutionError("Hãy mở thư mục dự án trước khi chạy Codex CLI.");
      return;
    }
    if (!selectedVariant) {
      setExecutionError("Hãy chọn chiến lược trước.");
      return;
    }
    const startedAt = new Date().toISOString();
    setExecutionLoading(true);
    setExecutionError(null);
    setExecutionResult(null);
    clearExecutionStream();
    clearPatchPlan();
    setExecutionStartedAt(startedAt);
    setExecutionFinishedAt(null);
    setTerminalOutput("");
    setTerminalOpen(false);
    setTerminalSessionActive(true);
    setProcessingStage("editing");
    setChangedFilesSummary([]);
    try {
      const settings = await window.doni.getSettings();
      const canWrite = settings.codexSandbox === "workspace-write";
      const response = await window.doni.runCodexCli({
        folderPath: selectedFolder,
        sandbox: settings.codexSandbox,
        prompt: [
          "You are being called from Doni, a desktop AI coding companion.",
          canWrite
            ? "You may modify files inside the workspace if that is necessary. Keep edits small and summarize every changed file."
            : "Do not modify files. Analyze the project and return a reviewable plan plus unified diff suggestions if code should change.",
          canWrite
            ? "After editing, include verification commands the user should run."
            : "The user will review/apply changes in Doni, so do not claim that edits were applied.",
          "",
          `Yêu cầu gốc:\n${rawRequest.trim()}`,
          "",
          `${requestStyle === "direct" ? "Prompt" : "Chiến lược đã chọn"}:\n${selectedVariant.title}\n${selectedVariant.prompt}`,
        ].join("\n"),
      });
      setExecutionResult({
        content: response.content,
        createdAt: response.finishedAt,
      });
      setProcessingStage("summarizing");
      const changeSummary = canWrite
        ? await window.doni.getProjectChangeSummary({
            folderPath: selectedFolder,
          })
        : { files: [] };
      setChangedFilesSummary(changeSummary.files);
      if (canWrite) {
        await refreshProjectScan(selectedFolder);
      }
      const changeSummaryText = formatChangedFilesSummary(changeSummary.files);
      const savedExecutionResult = response.content.trim();
      finishExecutionChatMessage(
        changeSummaryText
          ? `${savedExecutionResult}\n\n${changeSummaryText}`
          : savedExecutionResult,
      );
      await updateCurrentSession({
        rawRequest: rawRequest.trim(),
        detectedIntent: executionIntent ?? undefined,
        selectedVariant,
        finalPrompt: selectedVariant.prompt,
        executionMode: "answer",
        executionResult: changeSummaryText
          ? `${savedExecutionResult}\n\n${changeSummaryText}`
          : savedExecutionResult,
      });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Codex CLI thất bại.";
      setExecutionError(
        message.replace(
          /^Error invoking remote method 'codex:run': Error: /,
          "",
        ),
      );
      finishExecutionChatMessage(
        message.replace(
          /^Error invoking remote method 'codex:run': Error: /,
          "",
        ),
        "error",
      );
    } finally {
      setExecutionLoading(false);
      if (selectedFolder) {
        await refreshProjectScan(selectedFolder).catch(() => undefined);
      }
      setProcessingStage("idle");
      setExecutionFinishedAt(new Date().toISOString());
      await refreshCodexStatus();
    }
  };

  const addDroppedComposerFiles = async (
    filesToAdd: DroppedComposerFile[],
  ): Promise<void> => {
    if (!filesToAdd.length) return;
    setDroppedComposerFiles((current) => {
      const byPath = new Map(current.map((file) => [file.relativePath, file]));
      filesToAdd.forEach((file) => byPath.set(file.relativePath, file));
      return Array.from(byPath.values()).slice(0, 6);
    });
    const projectFiles = filesToAdd.filter((file) => file.isProjectFile);
    projectFiles.forEach((file) => addContextFile(file.relativePath));
    if (selectedFolder && projectFiles.length) {
      await loadContextFiles(selectedFolder);
    }
  };

  const handleComposerDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setComposerDragActive(false);
    const projectEntryKind = event.dataTransfer.getData(
      "application/x-doni-project-entry-kind",
    );
    const projectPath =
      event.dataTransfer.getData("application/x-doni-project-file") ||
      event.dataTransfer.getData("text/plain");
    const droppedPaths = projectPath
      .split(/\r?\n/)
      .map((path) => path.replace(/\\/g, "/").trim())
      .filter(Boolean);
    const byRelativePath = new Map(
      scannedFiles.map((file) => [file.relativePath, file]),
    );
    const projectFiles = uniqueFilePaths(
      droppedPaths.flatMap((path) => {
        const directFile = byRelativePath.get(path);
        if (directFile) return [directFile.relativePath];
        if (projectEntryKind === "folder" || !path.includes(".")) {
          const folderPrefix = `${path.replace(/\/$/, "")}/`;
          return scannedFiles
            .filter((file) => file.relativePath.startsWith(folderPrefix))
            .map((file) => file.relativePath);
        }
        return [];
      }),
    )
      .map((path) => byRelativePath.get(path))
      .filter((file): file is ProjectFile => Boolean(file));
    const externalFiles = Array.from(event.dataTransfer.files)
      .filter(
        (file) =>
          !projectFiles.some(
            (projectFile) =>
              getFileName(projectFile.relativePath) === file.name,
          ),
      )
      .map((file) => ({
        relativePath: file.name,
        name: file.name,
        extension: file.name.includes(".")
          ? `.${file.name.split(".").pop() ?? ""}`
          : "",
        size: file.size,
        isProjectFile: false,
      }));

    void addDroppedComposerFiles([
      ...projectFiles.map(toComposerFile),
      ...externalFiles,
    ]);
  };

  const removeDroppedComposerFile = (relativePath: string): void => {
    setDroppedComposerFiles((current) =>
      current.filter((file) => file.relativePath !== relativePath),
    );
    if (selectedContextFilePaths.includes(relativePath)) {
      toggleContextFile(relativePath);
    }
  };

  const primaryAction = async (): Promise<void> => {
    const freshDraft = draftRequest.trim();
    const message = freshDraft || submittedMessage.trim() || rawRequest.trim();
    if (!message) return;
    const shouldAppendUserMessage = Boolean(
      freshDraft || !submittedMessage.trim(),
    );
    if (freshDraft && requestStyle === "planned") {
      setSelectedPromptVariant(null);
      clearPatchPlan();
      clearExecution();
    }
    setSubmittedMessage(message);
    setRawRequest(message);
    setDraftRequest("");
    setDroppedComposerFiles([]);
    setLastNetworkEvent(null);
    let nextMessages = chatMessagesRef.current;
    if (shouldAppendUserMessage) {
      nextMessages = appendChatMessage({
        role: "user",
        content: message,
      }).messages;
    }
    const willPlan =
      requestStyle === "planned" && (freshDraft || !selectedVariant);
    if (!willPlan) {
      persistChatMessages(nextMessages, { rawRequest: message });
    }
    if (willPlan) {
      await planTask(message);
      return;
    }
    await runTask(message);
  };

  const selectPlanAndRun = async (variantId: string): Promise<void> => {
    const variant = promptVariants.find((item) => item.id === variantId);
    const message = submittedMessage.trim() || rawRequest.trim();
    if (!variant || !message) return;
    setSelectedPromptVariant(variantId);
    await runTask(message, variant);
  };

  const stopActiveRun = async (): Promise<void> => {
    setStopping(true);
    try {
      await window.doni.cancelActiveAi();
      setError("Đã dừng request đang chạy.");
      setExecutionError("Đã dừng request đang chạy.");
      setOptimizing(false);
      setExecutionLoading(false);
      setPatchLoading(false);
    } finally {
      setStopping(false);
    }
  };

  const openProjectInVSCode = async (): Promise<void> => {
    if (!selectedFolder) return;
    await window.doni.openInVSCode({ folderPath: selectedFolder });
  };

  const backToStrategies = (): void => {
    clearExecution();
    clearPatchPlan();
    setSelectedPromptVariant(null);
  };

  const copyPatchJson = async (): Promise<void> => {
    if (!patchPlan) return;
    await navigator.clipboard.writeText(JSON.stringify(patchPlan, null, 2));
  };

  const copyDiff = async (): Promise<void> => {
    const diffText = Object.values(diffTextByFile).join("\n\n");
    if (!diffText) return;
    await navigator.clipboard.writeText(diffText);
  };

  const rejectPatchFile = (relativePath: string): void => {
    if (!patchPlan) return;
    const nextPlan = {
      ...patchPlan,
      files: patchPlan.files.filter(
        (file) => file.relativePath !== relativePath,
      ),
    };
    const nextDiffs = Object.fromEntries(
      nextPlan.files.map((file) => [
        file.relativePath,
        createUnifiedDiff(file.relativePath, file.oldContent, file.newContent),
      ]),
    );
    setPatchPlan(nextPlan, patchWarnings, nextDiffs);
  };

  const applyPatchFile = async (relativePath: string): Promise<void> => {
    if (!selectedFolder) return;
    await applyPatch(selectedFolder, [relativePath]);
  };

  const copyPatchFileContent = async (relativePath: string): Promise<void> => {
    const file = patchPlan?.files.find(
      (item) => item.relativePath === relativePath,
    );
    if (!file) return;
    await navigator.clipboard.writeText(file.newContent);
  };

  const hasBlockingPatchWarning = patchWarnings.some((warning) =>
    /not loaded as context|removed from the preview|oldContent does not match|not safe to apply|stale/i.test(
      warning,
    ),
  );
  const canApplyPatch = Boolean(
    selectedFolder &&
    patchPlan?.files.length &&
    !hasBlockingPatchWarning &&
    !applyLoading &&
    !executionLoading,
  );
  const composerMessage =
    draftRequest.trim() || submittedMessage.trim() || rawRequest.trim();
  const setWorkMode = (mode: WorkMode): void => {
    setWorkModeState(mode);
    setError(null);
    setPatchError(null);
    if (mode === "quick") {
      setRequestStyle("direct");
      setExecutionMode("answer");
      setSelectedPromptVariant(null);
    } else if (mode === "edit") {
      setRequestStyle("direct");
      setExecutionMode("patch");
    } else {
      setRequestStyle("planned");
      setExecutionMode("answer");
    }
    clearExecution();
    clearPatchPlan();
  };
  const currentIntent = submittedMessage.trim() || rawRequest.trim();
  const taskStatus: "idle" | "active" | "done" | "blocked" =
    isOptimizing || executionLoading || patchLoading
      ? "active"
      : executionError || patchError || error
        ? "blocked"
        : executionResult || patchPlan
          ? "done"
          : "idle";
  const streamLines = compactStreamLines(chatMessages);
  const projectName =
    selectedFolder?.split(/[\\/]/).filter(Boolean).pop() ?? "No project";
  const activeSessionTitle =
    sessions.find((session) => session.id === activeSessionId)?.title ??
    "Chat mới";
  const allComposerModels = useMemo(
    () => buildComposerModelOptions(aiSettings, discoveredModels),
    [aiSettings, discoveredModels],
  );
  const visibleModelRole: ComposerModelRole =
    workMode === "quick" ? "planner" : "executor";
  const activeModelRole =
    workMode === "agent" ? modelSelectorRole : visibleModelRole;
  const plannerComposerModels = useMemo(() => {
    const allModels = buildComposerModelOptions(aiSettings, discoveredModels);
    if (!aiSettings) return allModels;
    const defaultPlannerKeys = getVisibleModelIds(
      "gemini",
      aiSettings.visibleModels,
    ).map((modelId) => `gemini:${modelId}`);
    const allowedKeys = aiSettings.plannerModelIds?.length
      ? aiSettings.plannerModelIds
      : defaultPlannerKeys;
    const allowedKeySet = new Set(allowedKeys);
    const discoveredKeySet = new Set(
      discoveredModels.flatMap((model) => [
        createModelSelectionKey(model.provider, model.rawId, model.accountId),
        legacyModelSelectionKey(model.provider, model.rawId),
      ]),
    );
    const libraryKeySet = new Set(
      (aiSettings.modelLibrary ?? []).flatMap((model) => [
        createModelSelectionKey(model.provider, model.rawId, model.accountId),
        legacyModelSelectionKey(model.provider, model.rawId),
      ]),
    );
    return allModels.filter(
      (model) =>
        model.kind !== "codexCli" &&
        (modelOptionKeys(model).some((key) => allowedKeySet.has(key)) ||
          modelOptionKeys(model).some((key) => discoveredKeySet.has(key)) ||
          modelOptionKeys(model).some((key) => libraryKeySet.has(key))),
    );
  }, [aiSettings, discoveredModels]);
  const executorComposerModels = useMemo(() => {
    if (!aiSettings) return allComposerModels;
    const defaultPlannerKeys = getVisibleModelIds(
      "gemini",
      aiSettings.visibleModels,
    ).map((modelId) => `gemini:${modelId}`);
    const defaultExecutorKeys = [...defaultPlannerKeys, "codex-cli:codex-cli"];
    const allowedKeys = aiSettings.executorModelIds?.length
      ? aiSettings.executorModelIds
      : defaultExecutorKeys;
    const allowedKeySet = new Set(allowedKeys);
    const discoveredKeySet = new Set(
      discoveredModels.flatMap((model) => [
        createModelSelectionKey(model.provider, model.rawId, model.accountId),
        legacyModelSelectionKey(model.provider, model.rawId),
      ]),
    );
    const libraryKeySet = new Set(
      (aiSettings.modelLibrary ?? []).flatMap((model) => [
        createModelSelectionKey(model.provider, model.rawId, model.accountId),
        legacyModelSelectionKey(model.provider, model.rawId),
      ]),
    );
    return allComposerModels.filter(
      (model) =>
        modelOptionKeys(model).some((key) => allowedKeySet.has(key)) ||
        modelOptionKeys(model).some((key) => discoveredKeySet.has(key)) ||
        modelOptionKeys(model).some((key) => libraryKeySet.has(key)),
    );
  }, [aiSettings, allComposerModels, discoveredModels]);
  const composerModels =
    activeModelRole === "planner"
      ? plannerComposerModels
      : executorComposerModels;
  const selectedPlannerModelId = selectedModelForMode(aiSettings, "planner");
  const selectedExecutorModelId = selectedModelForMode(aiSettings, "executor");
  const selectedPlannerSelectionKey = aiSettings?.plannerModelSelection
    ? modelSelectionKey(aiSettings.plannerModelSelection)
    : undefined;
  const selectedExecutorSelectionKey = aiSettings?.executorModelSelection
    ? modelSelectionKey(aiSettings.executorModelSelection)
    : undefined;
  const selectedPlannerModel =
    plannerComposerModels.find((model) =>
      selectedPlannerSelectionKey
        ? modelOptionMatchesKey(model, selectedPlannerSelectionKey)
        : model.id === selectedPlannerModelId,
    ) ??
    (selectedPlannerModelId
      ? (getCatalogModel(selectedPlannerModelId) ??
        modelOptionFromId("custom-endpoint", selectedPlannerModelId))
      : undefined);
  const selectedExecutorModel =
    executorComposerModels.find((model) =>
      selectedExecutorSelectionKey
        ? modelOptionMatchesKey(model, selectedExecutorSelectionKey)
        : model.id === selectedExecutorModelId,
    ) ??
    (selectedExecutorModelId
      ? selectedExecutorModelId === "codex-cli"
        ? codexCliModelOption()
        : (getCatalogModel(selectedExecutorModelId) ??
          modelOptionFromId("custom-endpoint", selectedExecutorModelId))
      : undefined);
  const selectedComposerModel =
    activeModelRole === "planner"
      ? selectedPlannerModel
      : selectedExecutorModel;
  const primaryModelRole: ComposerModelRole =
    workMode === "quick" ? "planner" : "executor";
  const primaryDisplayModel =
    primaryModelRole === "planner"
      ? selectedPlannerModel
      : selectedExecutorModel;
  const selectedPlannerModelKey = selectedPlannerModel
    ? modelOptionKey(selectedPlannerModel)
    : undefined;
  const primaryDisplayModelKey = primaryDisplayModel
    ? modelOptionKey(primaryDisplayModel)
    : undefined;
  const selectedComposerModelKey = selectedComposerModel
    ? modelOptionKey(selectedComposerModel)
    : undefined;
  const filteredComposerModels = composerModels.filter((model) => {
    const query = modelSearch.trim().toLowerCase();
    if (!query) return true;
    return [model.displayName, model.id, model.providerName, model.description]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(query));
  });
  const groupedComposerModels = groupModelOptions(filteredComposerModels);
  const focusedComposerModel = filteredComposerModels[focusedModelIndex];
  const pendingComposerModel =
    composerModels.find((model) => modelOptionKey(model) === pendingModelKey) ??
    focusedComposerModel ??
    selectedComposerModel;

  const selectComposerModel = async (
    model: ComposerModelOption,
    role: ComposerModelRole = activeModelRole,
  ): Promise<void> => {
    if (!aiSettings || typeof window.doni.saveSettings !== "function") return;
    if (model.kind === "codexCli") {
      if (role !== "executor") return;
      const nextSettings: AiSettings = {
        ...aiSettings,
        executorProvider: "codex",
        executorModelSelection: undefined,
      };
      if (workMode === "quick") {
        setWorkMode("agent");
      }
      setAiSettings(nextSettings);
      setModelSelectorOpen(false);
      setModelSearch("");
      setFocusedModelIndex(0);
      setPendingModelKey(null);
      const savedSettings = await window.doni.saveSettings(nextSettings);
      setAiSettings(savedSettings);
      window.dispatchEvent(
        new CustomEvent("doni-settings-updated", { detail: savedSettings }),
      );
      setModelStatus("Main model set to Codex CLI.");
      return;
    }

    const selectedAccountForProvider = aiSettings.accounts?.find(
      (account) =>
        account.id === aiSettings.selectedAccountId &&
        account.providerId === model.providerId,
    )?.id;
    const matchingAccount =
      model.accountId ??
      selectedAccountForProvider ??
      aiSettings.accounts?.find(
        (account) => account.providerId === model.providerId,
      )?.id;
    const nextSelection = {
      providerId: model.providerId,
      ...(matchingAccount ? { accountId: matchingAccount } : {}),
      modelId: model.id,
    };
    const nextSettings: AiSettings = {
      ...aiSettings,
      executorProvider:
        role === "executor" ? "custom" : aiSettings.executorProvider,
      selectedAccountId: matchingAccount,
      model: model.id,
      plannerModel:
        role === "planner" ? model.id : aiSettings.plannerModel || model.id,
      executorModel:
        role === "executor" ? model.id : aiSettings.executorModel || model.id,
      plannerModelSelection:
        role === "planner"
          ? nextSelection
          : (aiSettings.plannerModelSelection ?? nextSelection),
      executorModelSelection:
        role === "executor"
          ? nextSelection
          : (aiSettings.executorModelSelection ?? nextSelection),
      customModels: Array.from(new Set([...aiSettings.customModels, model.id])),
    };
    setAiSettings(nextSettings);
    setModelSelectorOpen(false);
    setModelSearch("");
    setFocusedModelIndex(0);
    setPendingModelKey(null);
    const savedSettings = await window.doni.saveSettings(nextSettings);
    setAiSettings(savedSettings);
    window.dispatchEvent(
      new CustomEvent("doni-settings-updated", { detail: savedSettings }),
    );
    setModelStatus(
      `${role === "planner" ? "Planner" : "Main"} model set to ${model.displayName}.`,
    );
  };

  useEffect(() => {
    if (!modelStatus) return;
    const timer = window.setTimeout(() => setModelStatus(null), 2200);
    return () => window.clearTimeout(timer);
  }, [modelStatus]);

  return (
    <main className="flex-1 overflow-hidden">
      <section className="flex h-full min-h-0 flex-col bg-[#070a10]">
        <div className="border-b border-white/10 bg-ink/85 px-5 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${statusToneClass(taskStatus)}`}
                >
                  {taskStatus}
                </span>
                <h1 className="truncate font-display text-lg font-semibold text-white">
                  Doni Chat
                </h1>
              </div>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                <span>{projectName}</span>
                <span>{scannedFiles.length} indexed files</span>
                <span>{patchPlan?.files.length ?? 0} patch files</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={startNewChat}
                className="rounded-full border border-mint/30 bg-mint/10 px-3 py-2 text-xs font-bold text-mint transition hover:bg-mint/15"
              >
                New chat
              </button>
              <select
                value={activeSessionId ?? ""}
                onChange={(event) => {
                  const sessionId = event.target.value;
                  if (!sessionId) {
                    startNewChat();
                    return;
                  }
                  void openSession(sessionId);
                }}
                onFocus={() => {
                  if (sessions.length || !selectedFolder) return;
                  void loadProjectSessions();
                }}
                title={activeSessionTitle}
                className="max-w-48 rounded-full border border-white/10 bg-ink/80 px-3 py-2 text-xs font-bold text-slate-300 outline-none transition hover:border-skyglass/40 focus:border-skyglass/50"
              >
                <option value="">Chat mới</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={openProjectFolder}
                disabled={isLoading}
                className="rounded-md border border-white/10 px-3 py-2 text-xs font-bold text-white transition hover:border-mint/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "Indexing..." : "Open Project"}
              </button>
              <button
                type="button"
                onClick={openProjectInVSCode}
                disabled={!selectedFolder}
                className="rounded-md border border-white/10 px-3 py-2 text-xs font-bold text-white transition hover:border-mint/50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                VS Code
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-7">
            {chatMessages.length ? (
              chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" ? (
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-skyglass/30 bg-skyglass/10 font-display text-xs font-black text-skyglass">
                      D
                    </div>
                  ) : null}
                  <div
                    className={`max-w-[82%] rounded-2xl px-5 py-4 text-sm leading-7 shadow-glow ${
                      message.role === "user"
                        ? "rounded-br-md bg-skyglass text-ink"
                        : message.kind === "error"
                          ? "rounded-bl-md border border-ember/30 bg-ember/10 text-ember"
                          : "rounded-bl-md border border-white/10 bg-panel/80 text-slate-200"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <FormattedAiResponse content={message.content} />
                    ) : (
                      <p className="whitespace-pre-wrap font-semibold">
                        {message.content}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="mx-auto flex max-w-2xl flex-col items-center py-16 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full border border-skyglass/30 bg-skyglass/10 font-display text-lg font-black text-skyglass shadow-glow">
                  D
                </div>
                <h2 className="mt-5 font-display text-3xl font-semibold text-white">
                  Rất vui được gặp bạn.
                </h2>
                <p className="mt-3 text-base leading-7 text-slate-400">
                  Mình có thể giúp gì cho bạn hôm nay?
                </p>
              </div>
            )}

            {requestStyle === "planned" &&
            promptVariants.length &&
            !executionResult &&
            !patchPlan ? (
              <div className="flex gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-skyglass/30 bg-skyglass/10 font-display text-xs font-black text-skyglass">
                  D
                </div>
                <div className="w-full max-w-[96%] rounded-2xl rounded-bl-md border border-white/10 bg-panel/80 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        Chọn một hướng xử lý
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Planner đã chuẩn bị các lựa chọn để chạy tiếp.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={backToStrategies}
                      className="rounded-md border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-skyglass/50 hover:text-skyglass"
                    >
                      Reset
                    </button>
                  </div>
                  <div className="grid gap-3 xl:grid-cols-3">
                    {promptVariants.map((variant) => (
                      <PromptVariantCard
                        key={variant.id}
                        variant={variant}
                        isSelected={selectedPromptVariant === variant.id}
                        onSelect={(variantId) =>
                          void selectPlanAndRun(variantId)
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {patchPlan ? (
              <div className="flex gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-skyglass/30 bg-skyglass/10 font-display text-xs font-black text-skyglass">
                  D
                </div>
                <div className="w-full max-w-[96%]">
                  <PatchPreview
                    patchPlan={patchPlan}
                    warnings={patchWarnings}
                    diffTextByFile={diffTextByFile}
                    applyLoading={applyLoading}
                    applyError={applyError}
                    lastApplyResult={lastApplyResult}
                    rollbackLoading={rollbackLoading}
                    rollbackError={rollbackError}
                    rollbackResult={rollbackResult}
                    canApply={canApplyPatch}
                    onCopyPatchJson={copyPatchJson}
                    onCopyDiff={copyDiff}
                    onDiscard={clearPatchPlan}
                    onRejectFile={rejectPatchFile}
                    onApplyFile={applyPatchFile}
                    onCopyFileContent={copyPatchFileContent}
                    onApply={async () => {
                      if (!selectedFolder) return;
                      await applyPatch(selectedFolder);
                    }}
                    onRollback={rollbackLastPatch}
                  />
                </div>
              </div>
            ) : null}

            {changedFilesSummary.length && !patchPlan ? (
              <div className="ml-11 max-w-3xl rounded-2xl border border-mint/20 bg-mint/10 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-mint">
                  Changed files
                </div>
                <div className="mt-3 flex flex-col gap-[12px]">
                  {changedFilesSummary.map((file) => (
                    <div
                      key={file.relativePath}
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-ink/50 px-3 py-2 text-xs"
                    >
                      <span className="truncate font-mono text-slate-200">
                        {file.relativePath}
                      </span>
                      <span className="shrink-0 font-bold text-mint">
                        +{file.added} / -{file.removed}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {isOptimizing || executionLoading || patchLoading ? (
              <div className="flex gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-skyglass/30 bg-skyglass/10 font-display text-xs font-black text-skyglass">
                  D
                </div>
                <div className="rounded-2xl rounded-bl-md border border-white/10 bg-panel/80 px-5 py-4 text-sm text-slate-300 shadow-glow">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-mint [animation-delay:-0.2s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-skyglass [animation-delay:-0.1s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-fuchsia-300" />
                    </span>
                    <span>{processingStageText(processingStage)}</span>
                  </div>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-1/2 animate-pulse rounded-full bg-mint/80" />
                  </div>
                </div>
              </div>
            ) : null}

            {terminalSessionActive || terminalOutput ? (
              <div className="ml-11 max-w-4xl">
                <button
                  type="button"
                  onClick={() => setTerminalOpen((value) => !value)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-skyglass/50 hover:text-skyglass"
                >
                  {terminalOpen ? "Ẩn terminal" : "Xem terminal"}
                </button>
                {terminalOpen ? (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black/70 shadow-glow">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-slate-500">
                      <span>Codex CLI terminal</span>
                      <span>{executionLoading ? "running" : "idle"}</span>
                    </div>
                    <pre className="max-h-80 overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-5 text-slate-300">
                      {terminalOutput || "Đang chờ Codex CLI ghi output..."}
                    </pre>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* {streamLines.length ? (
              <div className="ml-11 max-w-3xl space-y-2">
                {streamLines.map((line, index) => (
                  <div
                    key={`${index}-${line.slice(0, 18)}`}
                    className="rounded-md border border-white/10 bg-ink/60 px-3 py-2 font-mono text-xs leading-5 text-slate-500"
                  >
                    {line}
                  </div>
                ))}
              </div>
            ) : null} */}

            {error || executionError || patchError ? (
              <div className="ml-11 rounded-2xl border border-ember/30 bg-ember/10 p-4 text-sm font-medium text-ember">
                {error || executionError || patchError}
              </div>
            ) : null}
            {modelStatus ? (
              <div className="ml-11 w-fit rounded-full border border-mint/30 bg-mint/10 px-4 py-2 text-xs font-bold text-mint shadow-glow">
                {modelStatus}
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t border-white/10 bg-panel/95 px-5 py-4">
          <div className="mx-auto max-w-5xl">
            <div
              onDragEnter={(event) => {
                event.preventDefault();
                setComposerDragActive(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
                setComposerDragActive(true);
              }}
              onDragLeave={(event) => {
                const nextTarget = event.relatedTarget;
                if (
                  !(nextTarget instanceof Node) ||
                  !event.currentTarget.contains(nextTarget)
                ) {
                  setComposerDragActive(false);
                }
              }}
              onDrop={handleComposerDrop}
              className={`relative rounded-2xl border bg-ink/90 p-3 shadow-glow backdrop-blur transition focus-within:border-mint/40 ${
                composerDragActive
                  ? "border-skyglass/50 bg-skyglass/[0.06]"
                  : "border-white/10"
              }`}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(143,211,255,0.12),transparent_34%),radial-gradient(circle_at_82%_100%,rgba(216,180,254,0.1),transparent_30%)]" />
              <div className="relative">
                <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
                  {WORK_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      title={mode.description}
                      onClick={() => setWorkMode(mode.id)}
                      className={`rounded-full border px-3 py-1.5 text-left transition ${
                        workMode === mode.id
                          ? "border-mint/40 bg-mint/10 text-mint"
                          : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      <div className="text-xs font-bold">{mode.label}</div>
                    </button>
                  ))}
                  {workMode === "agent" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setModelSelectorRole("planner");
                        setModelSelectorOpen(true);
                        setPendingModelKey(selectedPlannerModelKey ?? null);
                        setModelSearch("");
                        setFocusedModelIndex(0);
                      }}
                      onKeyDown={(event) => {
                        if (
                          event.key === "ArrowDown" ||
                          event.key === "Enter" ||
                          event.key === " "
                        ) {
                          event.preventDefault();
                          setModelSelectorRole("planner");
                          setModelSelectorOpen(true);
                          setPendingModelKey(selectedPlannerModelKey ?? null);
                          setModelSearch("");
                          setFocusedModelIndex(0);
                        }
                      }}
                      className={`ml-auto flex min-w-[13rem] items-center justify-between gap-3 rounded-xl border bg-white/[0.04] px-3 py-2 text-left shadow-glow transition hover:border-mint/40 focus:border-mint/50 focus:outline-none ${
                        modelSelectorOpen && activeModelRole === "planner"
                          ? "border-mint/40"
                          : "border-white/10"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-skyglass/30 bg-skyglass/10 font-display text-[11px] font-black text-skyglass">
                          {selectedPlannerModel?.providerIcon ?? "AI"}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Planner
                          </span>
                          <span className="block truncate text-xs font-bold text-white">
                            {selectedPlannerModel?.displayName ??
                              "Select planner"}
                          </span>
                        </span>
                      </span>
                    </button>
                  ) : null}
                  <div
                    ref={modelSelectorRef}
                    className={`relative min-w-[15rem] ${workMode === "agent" ? "" : "ml-auto"}`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setModelSelectorRole(primaryModelRole);
                        setModelSearch("");
                        setModelSelectorOpen((value) => {
                          const nextOpen = !value;
                          if (nextOpen) {
                            setPendingModelKey(primaryDisplayModelKey ?? null);
                          }
                          return nextOpen;
                        });
                        setFocusedModelIndex(0);
                      }}
                      onKeyDown={(event) => {
                        if (
                          event.key === "ArrowDown" ||
                          event.key === "Enter" ||
                          event.key === " "
                        ) {
                          event.preventDefault();
                          setModelSelectorRole(primaryModelRole);
                          setModelSelectorOpen(true);
                          setPendingModelKey(primaryDisplayModelKey ?? null);
                          setModelSearch("");
                          setFocusedModelIndex(0);
                        }
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left shadow-glow transition hover:border-mint/40 focus:border-mint/50 focus:outline-none"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-skyglass/30 bg-skyglass/10 font-display text-[11px] font-black text-skyglass">
                          {primaryDisplayModel?.providerIcon ?? "AI"}
                        </span>
                        <span className="min-w-0">
                          {workMode === "agent" ? (
                            <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                              Main
                            </span>
                          ) : null}
                          <span className="block truncate text-xs font-bold text-white">
                            {primaryDisplayModel?.displayName ?? "Select model"}
                          </span>
                          <span className="block truncate text-[11px] text-slate-500">
                            {primaryDisplayModel?.providerName ??
                              "No model configured"}
                          </span>
                        </span>
                      </span>
                      <span className="text-xs font-black text-slate-500">
                        {modelSelectorOpen ? "^" : "v"}
                      </span>
                    </button>
                    <div
                      className={`absolute bottom-full right-0 z-50 mb-2 w-[min(42rem,calc(100vw-3rem))] origin-bottom-right overflow-hidden rounded-2xl border border-white/10 bg-ink/95 shadow-2xl shadow-black/40 backdrop-blur transition duration-150 ${
                        modelSelectorOpen
                          ? "translate-y-0 scale-100 opacity-100"
                          : "pointer-events-none translate-y-2 scale-95 opacity-0"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-white/10 p-3">
                        <input
                          value={modelSearch}
                          onChange={(event) => {
                            setModelSearch(event.target.value);
                            setFocusedModelIndex(0);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              setModelSelectorOpen(false);
                              return;
                            }
                            if (event.key === "ArrowDown") {
                              event.preventDefault();
                              setFocusedModelIndex((index) =>
                                Math.min(
                                  index + 1,
                                  Math.max(
                                    0,
                                    filteredComposerModels.length - 1,
                                  ),
                                ),
                              );
                              return;
                            }
                            if (event.key === "ArrowUp") {
                              event.preventDefault();
                              setFocusedModelIndex((index) =>
                                Math.max(0, index - 1),
                              );
                              return;
                            }
                            if (event.key === "Enter" && focusedComposerModel) {
                              event.preventDefault();
                              if (
                                pendingComposerModel &&
                                modelOptionKey(pendingComposerModel) ===
                                  modelOptionKey(focusedComposerModel)
                              ) {
                                void selectComposerModel(focusedComposerModel);
                                return;
                              }
                              setPendingModelKey(
                                modelOptionKey(focusedComposerModel),
                              );
                            }
                          }}
                          placeholder="Search models..."
                          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-mint/50"
                        />
                        <button
                          type="button"
                          onClick={() => setModelSelectorOpen(false)}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 text-sm font-black text-slate-500 transition hover:border-ember/40 hover:text-ember"
                          aria-label="Close model selector"
                        >
                          x
                        </button>
                      </div>
                      <div className="grid max-h-[27rem] grid-cols-1 overflow-hidden md:grid-cols-[1.1fr_0.9fr]">
                        <div className="max-h-[27rem] overflow-y-auto p-2">
                          {groupedComposerModels.length ? (
                            groupedComposerModels.map(
                              ([providerId, models]) => (
                                <div key={providerId} className="py-1">
                                  <div className="px-2 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                                    {PROVIDER_DISPLAY_NAMES[providerId] ??
                                      models[0]?.providerName ??
                                      providerId}
                                  </div>
                                  <div className="grid gap-1">
                                    {models.map((model) => {
                                      const flatIndex =
                                        filteredComposerModels.findIndex(
                                          (item) =>
                                            item.providerId ===
                                              model.providerId &&
                                            item.id === model.id &&
                                            item.accountId === model.accountId,
                                        );
                                      const key = modelOptionKey(model);
                                      const isSelected =
                                        selectedComposerModelKey === key;
                                      const isPending = pendingModelKey === key;
                                      const isFocused =
                                        flatIndex === focusedModelIndex;
                                      return (
                                        <button
                                          key={key}
                                          type="button"
                                          onMouseEnter={() =>
                                            setFocusedModelIndex(flatIndex)
                                          }
                                          onClick={() =>
                                            setPendingModelKey(key)
                                          }
                                          onDoubleClick={() =>
                                            void selectComposerModel(model)
                                          }
                                          className={`flex items-start gap-3 rounded-xl border px-3 py-2 text-left transition ${
                                            isPending
                                              ? "border-mint/50 bg-mint/10"
                                              : isSelected
                                                ? "border-skyglass/30 bg-skyglass/10"
                                                : isFocused
                                                  ? "border-white/15 bg-white/[0.04]"
                                                  : "border-transparent hover:border-white/10 hover:bg-white/[0.04]"
                                          }`}
                                        >
                                          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-skyglass/30 bg-skyglass/10 font-display text-[11px] font-black text-skyglass">
                                            {model.providerIcon}
                                          </span>
                                          <span className="min-w-0 flex-1">
                                            <span className="flex items-center gap-2">
                                              <span className="truncate text-sm font-bold text-white">
                                                {model.displayName}
                                              </span>
                                              {isSelected ? (
                                                <span className="rounded-full border border-skyglass/30 px-2 py-0.5 text-[10px] font-bold text-skyglass">
                                                  active
                                                </span>
                                              ) : null}
                                            </span>
                                            <span className="mt-0.5 block truncate font-mono text-[11px] text-slate-500">
                                              {model.kind === "codexCli"
                                                ? "local executor"
                                                : model.accountName
                                                  ? `${model.accountName} · ${model.id}`
                                                  : model.id}
                                            </span>
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ),
                            )
                          ) : (
                            <div className="px-3 py-8 text-center text-sm text-slate-500">
                              No visible models match your search.
                            </div>
                          )}
                        </div>
                        <div className="border-t border-white/10 bg-white/[0.03] p-4 md:border-l md:border-t-0">
                          {pendingComposerModel ? (
                            <div className="flex h-full min-h-56 flex-col">
                              <div className="flex items-center gap-3">
                                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-mint/30 bg-mint/10 font-display text-sm font-black text-mint">
                                  {pendingComposerModel.providerIcon}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-base font-bold text-white">
                                    {pendingComposerModel.displayName}
                                  </div>
                                  <div className="mt-1 text-xs font-semibold text-slate-500">
                                    {pendingComposerModel.providerName}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-4 rounded-xl border border-white/10 bg-ink/60 p-3">
                                <div className="font-mono text-xs text-slate-500">
                                  {pendingComposerModel.kind === "codexCli"
                                    ? "executor: codex"
                                    : pendingComposerModel.id}
                                </div>
                                {pendingComposerModel.description ? (
                                  <div className="mt-2 text-sm leading-6 text-slate-300">
                                    {pendingComposerModel.description}
                                  </div>
                                ) : null}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-1">
                                {pendingComposerModel.capabilities
                                  .slice(0, 5)
                                  .map((capability) => (
                                    <span
                                      key={capability}
                                      className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-semibold text-slate-400"
                                    >
                                      {capability}
                                    </span>
                                  ))}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  void selectComposerModel(pendingComposerModel)
                                }
                                className="mt-auto rounded-xl bg-mint px-4 py-3 text-sm font-black text-ink transition hover:bg-mint/90"
                              >
                                Select
                              </button>
                            </div>
                          ) : (
                            <div className="grid min-h-56 place-items-center text-center text-sm text-slate-500">
                              Choose a model to preview it.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {droppedComposerFiles.length ? (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {droppedComposerFiles.map((file) => (
                      <div
                        key={file.relativePath}
                        className={`group relative flex min-w-0 max-w-[13rem] items-center gap-2 rounded-lg border px-3 py-2 backdrop-blur ${fileChipTone(file.extension)}`}
                      >
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-current/25 bg-white/[0.05] font-display text-[11px] font-black uppercase">
                          {file.extension.replace(".", "").slice(0, 3) || "</>"}
                        </div>
                        <div className="min-w-0 pr-4">
                          <div className="truncate font-mono text-xs font-bold text-white">
                            {file.name}
                          </div>
                          <div className="mt-0.5 text-[11px] font-semibold opacity-70">
                            {formatBytes(file.size)}
                            {file.isProjectFile ? " / context" : " / dropped"}
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${file.name}`}
                          onClick={() =>
                            removeDroppedComposerFile(file.relativePath)
                          }
                          className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full border border-white/10 bg-ink/80 text-[11px] font-black text-slate-400 transition hover:border-ember/40 hover:text-ember"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                <textarea
                  id="raw-request"
                  value={draftRequest}
                  onChange={(event) => setDraftRequest(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      if (
                        !(isOptimizing || executionLoading) &&
                        (!selectedFolder || !composerMessage)
                      ) {
                        return;
                      }
                      void (isOptimizing || executionLoading
                        ? stopActiveRun()
                        : primaryAction());
                    }
                  }}
                  placeholder="Mô tả yêu cầu của bạn..."
                  className="min-h-20 w-full resize-none border-0 bg-transparent px-2 py-2 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-600"
                />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-1 pt-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-400">
                      @repo {projectName}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-400">
                      {droppedComposerFiles.length ||
                        selectedContextFilePaths.length}{" "}
                      files
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-400">
                      {executionMode === "patch" ? "#patch" : "#answer"}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-400">
                      {requestStyle === "planned" ? "#planner" : "#direct"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        clearExecution();
                        clearExecutionStream();
                      }}
                      disabled={
                        !executionResult &&
                        !executionError &&
                        !executionStartedAt
                      }
                      className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-white transition hover:border-ember/50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      title={isOptimizing || executionLoading ? "Stop" : "Send"}
                      onClick={
                        isOptimizing || executionLoading
                          ? stopActiveRun
                          : primaryAction
                      }
                      disabled={
                        stopping ||
                        (!(isOptimizing || executionLoading) &&
                          (!selectedFolder || !composerMessage))
                      }
                      className={`rounded-full px-5 py-2 text-sm font-black text-ink transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        isOptimizing || executionLoading
                          ? "bg-ember hover:bg-ember/90"
                          : executionMode === "patch"
                            ? "bg-skyglass hover:bg-skyglass/90"
                            : "bg-mint hover:bg-mint/90"
                      }`}
                    >
                      {isOptimizing || executionLoading ? "Stop" : "Send"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
