import { useEffect, useState } from "react";
import { useRef } from "react";
import type {
  AiNetworkEvent,
  AiProviderAccount,
  AiSettings,
  AntiProviderAccount,
  CodexCliStatus,
  DoniModel,
  ProviderDefinition,
  UpdaterProgress,
  UpdaterStatus,
} from "../../shared/types";
import {
  catalogModelsForProvider,
  DEFAULT_VISIBLE_MODELS,
  getCatalogModel,
  getVisibleModelIds,
} from "../../shared/modelCatalog";
import {
  createModelSelectionKey,
  legacyModelSelectionKey,
  parseModelSelectionKey,
} from "../../shared/modelSelection";

type AccountForm = {
  accountId?: string;
  providerId: string;
  displayName: string;
  apiBase: string;
  modelText: string;
  apiKey: string;
  secretReference?: string;
};

type ActiveAuthFlow = {
  providerId: string;
  providerName: string;
  authMethod: "oauthPkce" | "deviceCode";
  sessionId: string;
  status: string;
  message?: string;
  verificationUri?: string;
  verificationUriComplete?: string;
  userCode?: string;
  expiresAt?: string;
  intervalSeconds?: number;
};

type SelectorModelOption = {
  key: string;
  providerId: string;
  accountId?: string;
  accountName?: string;
  providerName: string;
  displayName: string;
  modelId: string;
  description?: string;
  kind?: "model" | "codexCli";
};

const emptySettings: AiSettings = {
  apiBase: "",
  apiKey: "",
  model: "",
  plannerModel: "",
  executorModel: "",
  plannerModelIds: DEFAULT_VISIBLE_MODELS.gemini.map(
    (modelId) => `gemini:${modelId}`,
  ),
  executorModelIds: [
    ...DEFAULT_VISIBLE_MODELS.gemini.map((modelId) => `gemini:${modelId}`),
    "codex-cli:codex-cli",
  ],
  customModels: [],
  executorProvider: "custom",
  visibleModels: { ...DEFAULT_VISIBLE_MODELS },
  routingFallbackEnabled: true,
  maxContextFiles: 10,
  ignorePatterns: [
    "node_modules",
    "dist",
    "build",
    ".git",
    "coverage",
    ".next",
    ".turbo",
    ".doni",
  ],
  autoBackup: true,
  diffMode: "inline",
  codexSandbox: "read-only",
};

const providerLabels: Record<string, string> = {
  gemini: "Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic",
  openrouter: "OpenRouter",
  "openai-compatible": "OpenAI Compatible",
  "custom-endpoint": "Custom Endpoint",
  ollama: "Ollama",
  "lm-studio": "LM Studio",
  "openai-compatible-local": "OpenAI Compatible Local",
  "openai-codex": "OpenAI Codex",
  "claude-code": "Claude Code",
  "github-copilot": "GitHub Copilot",
  cline: "Cline",
  "kilo-code": "Kilo Code",
  "gemini-cli": "Gemini CLI",
  "kiro-ai": "Kiro AI",
  "codex-cli": "Codex CLI",
};

function selectorModelKey(
  providerId: string,
  modelId: string,
  accountId?: string,
): string {
  return createModelSelectionKey(providerId, modelId, accountId);
}

function selectorLegacyModelKey(providerId: string, modelId: string): string {
  return legacyModelSelectionKey(providerId, modelId);
}

function selectorOptionKeys(option: SelectorModelOption): string[] {
  const keys = [option.key];
  const legacyKey = selectorLegacyModelKey(option.providerId, option.modelId);
  if (legacyKey !== option.key) keys.push(legacyKey);
  return keys;
}

function selectorListHasOption(
  ids: string[],
  option: SelectorModelOption,
): boolean {
  const keys = selectorOptionKeys(option);
  return ids.some((id) => keys.includes(id));
}

function selectorModelFromKey(
  key: string,
  candidates: SelectorModelOption[],
): SelectorModelOption {
  const candidate = candidates.find((item) => item.key === key);
  if (candidate) return candidate;
  const selection = parseModelSelectionKey(key);
  const providerId = selection?.providerId ?? "custom-endpoint";
  const modelId = selection?.modelId ?? key;
  return {
    key,
    providerId,
    accountId: selection?.accountId,
    providerName: providerLabels[providerId] ?? providerId,
    displayName: modelId,
    modelId,
  };
}

const emptyAccountForm: AccountForm = {
  providerId: "openai-compatible",
  displayName: "",
  apiBase: "",
  modelText: "",
  apiKey: "",
};

export function SettingsPanel(): JSX.Element {
  const [settings, setSettings] = useState<AiSettings>(emptySettings);
  const [status, setStatus] = useState<string | null>(null);
  const [isBusy, setBusy] = useState(false);
  const [networkEvents, setNetworkEvents] = useState<AiNetworkEvent[]>([]);
  const [codexStatus, setCodexStatus] = useState<CodexCliStatus | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [updaterStatus, setUpdaterStatus] = useState<UpdaterStatus | null>(
    null,
  );
  const [updaterProgress, setUpdaterProgress] =
    useState<UpdaterProgress | null>(null);
  const [updaterBusy, setUpdaterBusy] = useState(false);
  const [newModelName, setNewModelName] = useState("");
  const autoSaveTimerRef = useRef<number | null>(null);
  const lastSavedSettingsJsonRef = useRef<string>("");
  const [antiAccounts, setAntiAccounts] = useState<AntiProviderAccount[]>([]);
  const [selectedAntiProviderId, setSelectedAntiProviderId] = useState<
    string | null
  >(null);
  const [antiStatus, setAntiStatus] = useState<string | null>(null);
  const [antiBusyId, setAntiBusyId] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderDefinition[]>([]);
  const [expandedProviderIds, setExpandedProviderIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [discoveredModels, setDiscoveredModels] = useState<DoniModel[]>([]);
  const [modelDiscoveryBusy, setModelDiscoveryBusy] = useState(false);
  const [accountForm, setAccountForm] = useState<AccountForm>(emptyAccountForm);
  const [accountStatus, setAccountStatus] = useState<string | null>(null);
  const [accountBusyId, setAccountBusyId] = useState<string | null>(null);
  const [geminiOAuthClientId, setGeminiOAuthClientId] = useState("");
  const [geminiOAuthClientSecret, setGeminiOAuthClientSecret] = useState("");
  const [useCustomGeminiOAuthClientId, setUseCustomGeminiOAuthClientId] =
    useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [activeAuthFlow, setActiveAuthFlow] = useState<ActiveAuthFlow | null>(
    null,
  );
  const oauthPollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window.doni.getSettings !== "function") {
      setStatus(
        "Electron preload API đã cũ. Hãy khởi động lại toàn bộ app, không chỉ refresh React.",
      );
      return;
    }

    void window.doni
      .getSettings()
      .then((savedSettings) => {
        lastSavedSettingsJsonRef.current = JSON.stringify(savedSettings);
        setSettings(savedSettings);
        setSettingsLoaded(true);
      })
      .catch(() => setStatus("Không thể tải cài đặt AI."));
    void window.doni
      .getAiNetworkEvents?.()
      .then(setNetworkEvents)
      .catch(() => undefined);
    void window.doni
      .getCodexCliStatus?.()
      .then(setCodexStatus)
      .catch(() => undefined);
    void window.doni
      .listImportedAntiProviders?.()
      .then((state) => {
        setAntiAccounts(state.accounts);
        setSelectedAntiProviderId(state.selectedProviderId ?? null);
      })
      .catch(() => undefined);
    void window.doni
      .listAiProviders?.()
      .then((items) => {
        setProviders(items);
        setAccountForm((current) => ({
          ...current,
          providerId: current.providerId || items[0]?.id || "openai-compatible",
        }));
      })
      .catch(() => undefined);
    void window.doni
      .listDoniModels?.()
      .then((result) => setDiscoveredModels(result.models))
      .catch(() => undefined);

    if (typeof window.doni.onAiNetworkEvent !== "function") return;
    return window.doni.onAiNetworkEvent((event) => {
      setNetworkEvents((current) =>
        [event, ...current.filter((item) => item.id !== event.id)].slice(
          0,
          100,
        ),
      );
    });
  }, []);

  useEffect(
    () => () => {
      if (oauthPollTimerRef.current) {
        window.clearTimeout(oauthPollTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!settingsLoaded || typeof window.doni.saveSettings !== "function") {
      return;
    }
    const serializedSettings = JSON.stringify(settings);
    if (serializedSettings === lastSavedSettingsJsonRef.current) {
      return;
    }

    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = window.setTimeout(() => {
      void window.doni
        .saveSettings(settings)
        .then((savedSettings) => {
          const savedJson = JSON.stringify(savedSettings);
          lastSavedSettingsJsonRef.current = savedJson;
          if (savedJson !== serializedSettings) {
            setSettings(savedSettings);
          }
          setStatus("Đã tự lưu cài đặt.");
        })
        .catch((error) =>
          setStatus(
            error instanceof Error
              ? error.message
              : "Không thể tự lưu cài đặt.",
          ),
        );
    }, 700);

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [settings, settingsLoaded]);

  useEffect(() => {
    const updater = window.electron?.updater ?? window.doni.updater;
    if (!updater) return;

    void updater
      .status()
      .then(setUpdaterStatus)
      .catch(() => undefined);
    const removeStatusListener = updater.onStatus(setUpdaterStatus);
    const removeProgressListener = updater.onProgress(setUpdaterProgress);
    return () => {
      removeStatusListener();
      removeProgressListener();
    };
  }, []);

  const update = (key: keyof AiSettings, value: string): void =>
    setSettings((current) => ({ ...current, [key]: value }));
  const updateNumber = (key: keyof AiSettings, value: number): void =>
    setSettings((current) => ({ ...current, [key]: value }));
  const updateBoolean = (key: keyof AiSettings, value: boolean): void =>
    setSettings((current) => ({ ...current, [key]: value }));
  const providerById = new Map(
    providers.map((provider) => [provider.id, provider]),
  );

  const mergeDiscoveredModels = (
    nextModels: DoniModel[],
    filter?: { accountId?: string; providerId?: string },
  ): void => {
    if (!filter?.accountId && !filter?.providerId) {
      setDiscoveredModels(nextModels);
      return;
    }
    setDiscoveredModels((current) => {
      const retained = current.filter((model) => {
        if (filter.accountId) return model.accountId !== filter.accountId;
        if (filter.providerId) return model.provider !== filter.providerId;
        return false;
      });
      const byKey = new Map<string, DoniModel>();
      [...retained, ...nextModels].forEach((model) => {
        byKey.set(
          `${model.provider}:${model.accountId ?? ""}:${model.rawId}`,
          model,
        );
      });
      return [...byKey.values()];
    });
  };

  const reloadProviders = async (): Promise<void> => {
    if (typeof window.doni.listAiProviders !== "function") return;
    setProviders(await window.doni.listAiProviders());
  };

  const loadDoniModels = async (
    refresh = false,
    filter?: { accountId?: string; providerId?: string },
  ): Promise<void> => {
    const api = refresh
      ? window.doni.refreshDoniModels
      : window.doni.listDoniModels;
    if (typeof api !== "function") {
      setAccountStatus("Electron preload API đã cũ. Hãy khởi động lại app.");
      return;
    }
    setModelDiscoveryBusy(true);
    try {
      const result = await api(filter);
      mergeDiscoveredModels(result.models, filter);
      setAccountStatus(
        refresh
          ? `Đã refresh ${result.models.length} model${result.warnings?.length ? `, ${result.warnings.length} cảnh báo.` : "."}`
          : null,
      );
    } catch (error) {
      setAccountStatus(
        error instanceof Error
          ? error.message
          : "Không thể lấy danh sách model.",
      );
    } finally {
      setModelDiscoveryBusy(false);
    }
  };
  const modelOptions = Array.from(
    new Set(
      [
        ...settings.customModels,
        settings.model,
        settings.plannerModel,
        settings.executorModel,
        ...discoveredModels.map((model) => model.rawId),
        ...(settings.modelLibrary ?? []).map((model) => model.rawId),
        ...(settings.accounts ?? []).flatMap(
          (account) => account.modelIds ?? [],
        ),
        ...Object.values(settings.visibleModels ?? {}).flat(),
      ]
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
  const selectorModelOptions: SelectorModelOption[] = Array.from(
    new Map(
      [
        {
          key: "codex-cli:codex-cli",
          providerId: "codex-cli",
          providerName: "Codex CLI",
          displayName: "Codex CLI",
          modelId: "codex-cli",
          description: "Local Codex CLI executor.",
          kind: "codexCli" as const,
        },
        ...providers.flatMap((provider) =>
          provider.supportedModels.map((model) => ({
            key: selectorModelKey(provider.id, model.id),
            providerId: provider.id,
            providerName: provider.displayName,
            displayName: model.displayName,
            modelId: model.id,
          })),
        ),
        ...catalogModelsForProvider("gemini").map((model) => ({
          key: selectorModelKey(model.providerId, model.id),
          providerId: model.providerId,
          providerName: model.providerName,
          displayName: model.displayName,
          modelId: model.id,
          description: model.description,
        })),
        ...discoveredModels.map((model) => ({
          key: selectorModelKey(model.provider, model.rawId, model.accountId),
          providerId: model.provider,
          accountId: model.accountId,
          accountName: model.accountName,
          providerName:
            providerById.get(model.provider)?.displayName ??
            providerLabels[model.provider] ??
            model.provider,
          displayName: model.displayName,
          modelId: model.rawId,
          description: model.accountName
            ? `${model.accountName} · ${model.availability.source}`
            : model.availability.source,
        })),
        ...(settings.modelLibrary ?? []).map((model) => ({
          key: selectorModelKey(model.provider, model.rawId, model.accountId),
          providerId: model.provider,
          accountId: model.accountId,
          accountName: model.accountName,
          providerName:
            providerById.get(model.provider)?.displayName ??
            providerLabels[model.provider] ??
            model.provider,
          displayName: model.displayName,
          modelId: model.rawId,
          description: model.description ?? "Doni model library",
        })),
        ...(settings.accounts ?? []).flatMap((account) =>
          (account.modelIds ?? []).map((modelId) => ({
            key: selectorModelKey(account.providerId, modelId, account.id),
            providerId: account.providerId,
            accountId: account.id,
            accountName: account.displayName,
            providerName:
              providerById.get(account.providerId)?.displayName ??
              providerLabels[account.providerId] ??
              account.providerId,
            displayName:
              getCatalogModel(modelId, account.providerId)?.displayName ??
              modelId,
            modelId,
          })),
        ),
        ...modelOptions.map((modelId) => ({
          key: selectorModelKey("custom-endpoint", modelId),
          providerId: "custom-endpoint",
          providerName: "Custom Endpoint",
          displayName: getCatalogModel(modelId)?.displayName ?? modelId,
          modelId,
        })),
      ].map((option) => [option.key, option] as const),
    ).values(),
  );

  const plannerSelectorIds = settings.plannerModelIds?.length
    ? settings.plannerModelIds
    : DEFAULT_VISIBLE_MODELS.gemini.map((modelId) =>
        selectorModelKey("gemini", modelId),
      );
  const executorSelectorIds = settings.executorModelIds?.length
    ? settings.executorModelIds
    : [
        ...DEFAULT_VISIBLE_MODELS.gemini.map((modelId) =>
          selectorModelKey("gemini", modelId),
        ),
        "codex-cli:codex-cli",
      ];

  const addCustomModel = (): void => {
    const modelName = newModelName.trim();
    if (!modelName) return;
    setSettings((current) => ({
      ...current,
      customModels: Array.from(new Set([...current.customModels, modelName])),
      plannerModel: current.plannerModel || modelName,
      executorModel: current.executorModel || modelName,
      model: current.model || modelName,
    }));
    setNewModelName("");
  };

  const saveSettingsNow = async (
    nextSettings: AiSettings,
    message: string,
  ): Promise<void> => {
    setSettings(nextSettings);
    if (typeof window.doni.saveSettings !== "function") {
      setAccountStatus("Electron preload API đã cũ. Hãy khởi động lại app.");
      return;
    }
    const savedSettings = await window.doni.saveSettings(nextSettings);
    lastSavedSettingsJsonRef.current = JSON.stringify(savedSettings);
    setSettings(savedSettings);
    setAccountStatus(message);
    window.dispatchEvent(
      new CustomEvent("doni-settings-updated", { detail: savedSettings }),
    );
  };

  const setVisibleModel = async (
    providerId: string,
    modelId: string,
    visible: boolean,
  ): Promise<void> => {
    const currentVisible = getVisibleModelIds(
      providerId,
      settings.visibleModels,
    );
    const alreadyVisible = currentVisible.includes(modelId);
    const model = getCatalogModel(modelId, providerId);
    const displayName = model?.displayName ?? modelId;
    if (visible && alreadyVisible) {
      setAccountStatus(`${displayName} đã có trong visible models.`);
      return;
    }
    if (!visible && !alreadyVisible) {
      setAccountStatus(`${displayName} chưa nằm trong visible models.`);
      return;
    }

    const nextVisibleIds = visible
      ? [...currentVisible, modelId]
      : currentVisible.filter((item) => item !== modelId);
    if (!visible && !nextVisibleIds.length) {
      setAccountStatus("Giữ lại ít nhất một Gemini model trong selector.");
      return;
    }
    const replacementModel = nextVisibleIds[0] ?? "";
    const nextSettings: AiSettings = {
      ...settings,
      visibleModels: {
        ...(settings.visibleModels ?? {}),
        [providerId]: nextVisibleIds,
      },
      model:
        !visible && settings.model === modelId
          ? replacementModel
          : settings.model,
      plannerModel:
        !visible && settings.plannerModel === modelId
          ? replacementModel
          : settings.plannerModel,
      executorModel:
        !visible && settings.executorModel === modelId
          ? replacementModel
          : settings.executorModel,
      customModels: Array.from(
        new Set([...settings.customModels, ...nextVisibleIds]),
      ),
    };
    await saveSettingsNow(
      nextSettings,
      visible
        ? `${displayName} added to visible models.`
        : `${displayName} removed from visible models.`,
    );
  };

  const setSelectorModelVisibility = async (
    listKey: "plannerModelIds" | "executorModelIds",
    modelKey: string,
    visible: boolean,
  ): Promise<void> => {
    const currentIds =
      listKey === "plannerModelIds" ? plannerSelectorIds : executorSelectorIds;
    const option = selectorModelFromKey(modelKey, selectorModelOptions);
    const optionKeys = selectorOptionKeys(option);
    const alreadyVisible = selectorListHasOption(currentIds, option);
    if (visible && alreadyVisible) {
      setAccountStatus(`${option.displayName} đã có trong danh sách.`);
      return;
    }
    if (!visible && !alreadyVisible) return;

    const nextIds = visible
      ? [...currentIds, modelKey]
      : currentIds.filter((item) => !optionKeys.includes(item));
    if (!nextIds.length) {
      setAccountStatus("Giữ lại ít nhất một model trong danh sách này.");
      return;
    }

    const replacement = selectorModelFromKey(nextIds[0], selectorModelOptions);
    const nextSettings: AiSettings = {
      ...settings,
      [listKey]: nextIds,
      ...(listKey === "plannerModelIds" &&
      !visible &&
      settings.plannerModel === option.modelId
        ? { plannerModel: replacement.modelId }
        : {}),
      ...(listKey === "executorModelIds" &&
      !visible &&
      settings.executorModel === option.modelId
        ? {
            executorModel:
              replacement.kind === "codexCli"
                ? settings.executorModel
                : replacement.modelId,
            model:
              replacement.kind === "codexCli"
                ? settings.model
                : replacement.modelId,
            executorProvider:
              replacement.kind === "codexCli"
                ? "codex"
                : settings.executorProvider,
          }
        : {}),
    };
    await saveSettingsNow(
      nextSettings,
      visible
        ? `${option.displayName} added to ${listKey === "plannerModelIds" ? "planner" : "main"} selector.`
        : `${option.displayName} removed from ${listKey === "plannerModelIds" ? "planner" : "main"} selector.`,
    );
  };

  const removeCustomModel = (modelName: string): void => {
    setSettings((current) => ({
      ...current,
      customModels: current.customModels.filter((item) => item !== modelName),
      model: current.model === modelName ? "" : current.model,
      plannerModel:
        current.plannerModel === modelName ? "" : current.plannerModel,
      executorModel:
        current.executorModel === modelName ? "" : current.executorModel,
    }));
  };

  const parseAccountModels = (modelText: string): string[] =>
    Array.from(
      new Set(
        modelText
          .split(/[,\n]/)
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );

  const providerAccounts = settings.accounts ?? [];
  const selectedProvider = providerById.get(accountForm.providerId);
  const selectedProviderRequiresKey = selectedProvider?.authType === "apiKey";

  const updateAccountForm = (
    key: keyof AccountForm,
    value: string | undefined,
  ): void =>
    setAccountForm((current) => ({
      ...current,
      [key]: value ?? "",
      ...(key === "providerId"
        ? {
            apiBase:
              providerById.get(value ?? "")?.defaultApiBase ?? current.apiBase,
          }
        : {}),
    }));

  const editProviderAccount = (account: AiProviderAccount): void => {
    const secretReference =
      account.credentialReferences?.apiKey ?? account.secretReference;
    setAccountForm({
      accountId: account.id,
      providerId: account.providerId,
      displayName: account.displayName,
      apiBase: account.apiBase ?? "",
      modelText: (account.modelIds ?? []).join("\n"),
      apiKey: "",
      secretReference,
    });
    setAccountStatus(null);
  };

  const resetAccountForm = (): void => {
    setAccountForm({
      ...emptyAccountForm,
      providerId: providers[0]?.id || "openai-compatible",
    });
    setAccountStatus(null);
  };

  const saveProviderAccount = async (): Promise<void> => {
    if (typeof window.doni.upsertAiProviderAccount !== "function") {
      setAccountStatus("Electron preload API đã cũ. Hãy khởi động lại app.");
      return;
    }
    const modelIds = parseAccountModels(accountForm.modelText);
    if (!accountForm.providerId || !accountForm.displayName.trim()) {
      setAccountStatus("Hãy chọn provider và đặt tên account.");
      return;
    }
    if (
      selectedProviderRequiresKey &&
      !accountForm.apiKey.trim() &&
      !accountForm.secretReference
    ) {
      setAccountStatus("Provider này cần API key trước khi lưu.");
      return;
    }

    setAccountBusyId(accountForm.accountId ?? "new");
    setAccountStatus(null);
    try {
      const saved = await window.doni.upsertAiProviderAccount({
        accountId: accountForm.accountId,
        providerId: accountForm.providerId,
        displayName: accountForm.displayName,
        apiBase: accountForm.apiBase,
        modelIds,
        secretReference: accountForm.secretReference,
        apiKey: accountForm.apiKey,
        makeDefault: !settings.selectedAccountId,
      });
      lastSavedSettingsJsonRef.current = JSON.stringify(saved);
      setSettings(saved);
      const savedAccount = saved.accounts?.find(
        (account) =>
          account.providerId === accountForm.providerId &&
          account.displayName === accountForm.displayName,
      );
      if (savedAccount && typeof window.doni.refreshDoniModels === "function") {
        const discovery = await window.doni.refreshDoniModels({
          accountId: savedAccount.id,
        });
        mergeDiscoveredModels(discovery.models, { accountId: savedAccount.id });
        const firstDiscoveredModel = discovery.models.find(
          (model) => model.capabilities.chat || model.capabilities.code,
        );
        if (
          !modelIds.length &&
          firstDiscoveredModel &&
          !(saved.model || saved.plannerModel || saved.executorModel).trim()
        ) {
          const modelSelection = {
            providerId: firstDiscoveredModel.provider,
            ...(firstDiscoveredModel.accountId
              ? { accountId: firstDiscoveredModel.accountId }
              : {}),
            modelId: firstDiscoveredModel.rawId,
          };
          const nextSettings: AiSettings = {
            ...saved,
            selectedAccountId: saved.selectedAccountId || savedAccount.id,
            model: firstDiscoveredModel.rawId,
            plannerModel: firstDiscoveredModel.rawId,
            executorModel: firstDiscoveredModel.rawId,
            plannerModelSelection: modelSelection,
            executorModelSelection: modelSelection,
            customModels: Array.from(
              new Set([...saved.customModels, firstDiscoveredModel.rawId]),
            ),
          };
          const savedWithModel = await window.doni.saveSettings(nextSettings);
          lastSavedSettingsJsonRef.current = JSON.stringify(savedWithModel);
          setSettings(savedWithModel);
        }
      }
      setAccountForm({
        ...emptyAccountForm,
        providerId: accountForm.providerId,
      });
      setAccountStatus(
        modelIds.length
          ? "Đã lưu account provider."
          : "Đã lưu account provider và lấy model từ provider.",
      );
    } catch (error) {
      setAccountStatus(
        error instanceof Error ? error.message : "Không thể lưu account.",
      );
    } finally {
      setAccountBusyId(null);
    }
  };

  const deleteProviderAccount = async (accountId: string): Promise<void> => {
    if (typeof window.doni.deleteAiProviderAccount !== "function") return;
    setAccountBusyId(accountId);
    setAccountStatus(null);
    try {
      const saved = await window.doni.deleteAiProviderAccount({ accountId });
      lastSavedSettingsJsonRef.current = JSON.stringify(saved);
      setSettings(saved);
      if (accountForm.accountId === accountId) resetAccountForm();
      setAccountStatus("Đã xóa account provider.");
    } catch (error) {
      setAccountStatus(
        error instanceof Error ? error.message : "Không thể xóa account.",
      );
    } finally {
      setAccountBusyId(null);
    }
  };

  const testProviderAccount = async (
    account?: AiProviderAccount,
  ): Promise<void> => {
    if (typeof window.doni.testAiProviderAccount !== "function") return;
    const discoveredForAccount = account
      ? discoveredModels.find((model) => model.accountId === account.id)
      : discoveredModels.find(
          (model) => model.provider === accountForm.providerId,
        );
    const model = account
      ? (account.modelIds?.[0] ?? discoveredForAccount?.rawId ?? "")
      : (parseAccountModels(accountForm.modelText)[0] ??
        discoveredForAccount?.rawId ??
        "");
    const providerId = account?.providerId ?? accountForm.providerId;
    const displayName = account?.displayName ?? accountForm.displayName;
    const apiBase = account?.apiBase ?? accountForm.apiBase;
    const secretReference =
      account?.credentialReferences?.apiKey ??
      account?.secretReference ??
      accountForm.secretReference;
    const apiKey = account ? "" : accountForm.apiKey;

    if (!providerId || !model) {
      setAccountStatus("Hãy chọn provider và model trước khi test.");
      return;
    }

    setAccountBusyId(account?.id ?? "form-test");
    setAccountStatus(null);
    try {
      const result = await window.doni.testAiProviderAccount({
        accountId: account?.id,
        providerId,
        displayName,
        apiBase,
        model,
        secretReference,
        apiKey,
      });
      setAccountStatus(
        result.ok
          ? "Kết nối account OK."
          : (result.error ?? "Kiểm tra account thất bại."),
      );
      if (!account) {
        setAccountForm((current) => ({ ...current, apiKey: "" }));
      }
    } catch (error) {
      setAccountStatus(
        error instanceof Error ? error.message : "Kiểm tra account thất bại.",
      );
    } finally {
      setAccountBusyId(null);
    }
  };

  const setDefaultProviderAccount = (accountId: string): void => {
    setSettings((current) => ({ ...current, selectedAccountId: accountId }));
    setAccountStatus("Default account sẽ được tự lưu.");
  };

  const pollOAuthSession = (sessionId: string, delayMs = 1500): void => {
    if (typeof window.doni.pollProviderAuth !== "function") return;
    oauthPollTimerRef.current = window.setTimeout(() => {
      void window.doni
        .pollProviderAuth({ sessionId })
        .then(async (result) => {
          if (result.status === "pending" || result.status === "slow_down") {
            setActiveAuthFlow((current) =>
              current?.sessionId === sessionId
                ? {
                    ...current,
                    status: result.status,
                    message: result.message,
                    verificationUri:
                      result.verificationUri ?? current.verificationUri,
                    verificationUriComplete:
                      result.verificationUriComplete ??
                      current.verificationUriComplete,
                    userCode: result.userCode ?? current.userCode,
                    expiresAt: result.expiresAt ?? current.expiresAt,
                    intervalSeconds:
                      result.intervalSeconds ?? current.intervalSeconds,
                  }
                : current,
            );
            pollOAuthSession(
              sessionId,
              Math.max(
                1500,
                (result.intervalSeconds ??
                  (result.status === "slow_down" ? 10 : 2)) * 1000,
              ),
            );
            return;
          }
          setOauthBusy(false);
          setAccountStatus(result.message ?? "OAuth flow finished.");
          setActiveAuthFlow((current) =>
            current?.sessionId === sessionId
              ? {
                  ...current,
                  status: result.status,
                  message: result.message,
                }
              : current,
          );
          if (result.ok && result.status === "completed") {
            const savedSettings = await window.doni.getSettings();
            lastSavedSettingsJsonRef.current = JSON.stringify(savedSettings);
            setSettings(savedSettings);
            await reloadProviders();
            void loadDoniModels(false);
          }
        })
        .catch((error) => {
          setOauthBusy(false);
          setAccountStatus(
            error instanceof Error
              ? error.message
              : "Không thể hoàn tất OAuth.",
          );
        });
    }, delayMs);
  };

  const startProviderDeviceCode = async (
    provider: ProviderDefinition,
  ): Promise<void> => {
    if (typeof window.doni.startProviderAuth !== "function") {
      setAccountStatus("Electron preload API đã cũ. Hãy khởi động lại app.");
      return;
    }
    setOauthBusy(true);
    setAccountStatus(`Đang tạo mã đăng nhập cho ${provider.displayName}...`);
    setActiveAuthFlow(null);
    try {
      const result = await window.doni.startProviderAuth({
        providerId: provider.id,
        authMethod: "deviceCode",
      });
      if (!result.ok || !result.sessionId) {
        setOauthBusy(false);
        setAccountStatus(
          result.message ??
            `Không thể bắt đầu đăng nhập ${provider.displayName}.`,
        );
        return;
      }
      setActiveAuthFlow({
        providerId: provider.id,
        providerName: provider.displayName,
        authMethod: "deviceCode",
        sessionId: result.sessionId,
        status: result.status,
        message: result.message,
        verificationUri: result.verificationUri,
        verificationUriComplete: result.verificationUriComplete,
        userCode: result.userCode,
        expiresAt: result.expiresAt,
        intervalSeconds: result.intervalSeconds,
      });
      setAccountStatus("Đang chờ bạn authorize trong trình duyệt...");
      pollOAuthSession(
        result.sessionId,
        Math.max(1500, (result.intervalSeconds ?? 2) * 1000),
      );
    } catch (error) {
      setOauthBusy(false);
      setAccountStatus(
        error instanceof Error
          ? error.message
          : `Không thể bắt đầu đăng nhập ${provider.displayName}.`,
      );
    }
  };

  const startProviderOAuth = async (
    provider: ProviderDefinition,
  ): Promise<void> => {
    if (typeof window.doni.startProviderAuth !== "function") {
      setAccountStatus("Electron preload API đã cũ. Hãy khởi động lại app.");
      return;
    }
    setOauthBusy(true);
    setAccountStatus(
      `Đang mở trình duyệt để đăng nhập ${provider.displayName}...`,
    );
    setActiveAuthFlow(null);
    try {
      const result = await window.doni.startProviderAuth({
        providerId: provider.id,
        authMethod: "oauthPkce",
      });
      if (!result.ok || !result.sessionId) {
        setOauthBusy(false);
        setAccountStatus(
          result.message ??
            `Không thể bắt đầu đăng nhập ${provider.displayName}.`,
        );
        return;
      }
      setActiveAuthFlow({
        providerId: provider.id,
        providerName: provider.displayName,
        authMethod: "oauthPkce",
        sessionId: result.sessionId,
        status: result.status,
        message: result.message,
        expiresAt: result.expiresAt,
      });
      pollOAuthSession(result.sessionId);
    } catch (error) {
      setOauthBusy(false);
      setAccountStatus(
        error instanceof Error
          ? error.message
          : `Không thể bắt đầu đăng nhập ${provider.displayName}.`,
      );
    }
  };

  const signInGeminiOAuth = async (): Promise<void> => {
    if (typeof window.doni.startProviderAuth !== "function") {
      setAccountStatus("Electron preload API đã cũ. Hãy khởi động lại app.");
      return;
    }
    const clientId = useCustomGeminiOAuthClientId
      ? geminiOAuthClientId.trim()
      : undefined;
    const clientSecret = useCustomGeminiOAuthClientId
      ? geminiOAuthClientSecret.trim()
      : undefined;
    if (useCustomGeminiOAuthClientId && !clientId) {
      setAccountStatus("Hãy nhập Google OAuth Client ID cho Gemini.");
      return;
    }
    setOauthBusy(true);
    setAccountStatus("Đang mở trình duyệt để đăng nhập Google...");
    try {
      const result = await window.doni.startProviderAuth({
        providerId: "gemini",
        authMethod: "oauthPkce",
        ...(clientId ? { clientId } : {}),
        ...(clientSecret ? { clientSecret } : {}),
      });
      if (!result.ok || !result.sessionId) {
        setOauthBusy(false);
        setAccountStatus(result.message ?? "Không thể bắt đầu Google OAuth.");
        return;
      }
      setActiveAuthFlow({
        providerId: "gemini",
        providerName: "Gemini",
        authMethod: "oauthPkce",
        sessionId: result.sessionId,
        status: result.status,
        message: result.message,
        expiresAt: result.expiresAt,
      });
      pollOAuthSession(result.sessionId);
    } catch (error) {
      setOauthBusy(false);
      setAccountStatus(
        error instanceof Error
          ? error.message
          : "Không thể bắt đầu Google OAuth.",
      );
    }
  };

  const save = async (): Promise<void> => {
    if (typeof window.doni.saveSettings !== "function") {
      setStatus("Electron preload API đã cũ. Hãy khởi động lại toàn bộ app.");
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const saved = await window.doni.saveSettings(settings);
      lastSavedSettingsJsonRef.current = JSON.stringify(saved);
      setSettings(saved);
      setStatus("Đã lưu cài đặt cục bộ.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Không thể lưu cài đặt.",
      );
    } finally {
      setBusy(false);
    }
  };

  const test = async (): Promise<void> => {
    if (typeof window.doni.testConnection !== "function") {
      setStatus("Electron preload API đã cũ. Hãy khởi động lại toàn bộ app.");
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const result = await window.doni.testConnection(settings);
      setStatus(
        result.ok
          ? "Kết nối OK."
          : (result.error ?? "Kiểm tra kết nối thất bại."),
      );
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Kiểm tra kết nối thất bại.",
      );
    } finally {
      setBusy(false);
    }
  };

  const refreshNetworkEvents = async (): Promise<void> => {
    if (typeof window.doni.getAiNetworkEvents !== "function") return;
    setNetworkEvents(await window.doni.getAiNetworkEvents());
  };

  const clearNetworkEvents = async (): Promise<void> => {
    if (typeof window.doni.clearAiNetworkEvents !== "function") return;
    await window.doni.clearAiNetworkEvents();
    setNetworkEvents([]);
  };

  const refreshCodexStatus = async (): Promise<void> => {
    if (typeof window.doni.getCodexCliStatus !== "function") return;
    setCodexStatus(await window.doni.getCodexCliStatus());
  };

  const importAntiProviders = async (): Promise<void> => {
    if (typeof window.doni.importAntiProviders !== "function") {
      setAntiStatus("Electron preload API đã cũ. Hãy khởi động lại app.");
      return;
    }
    setAntiStatus(null);
    try {
      const accounts = await window.doni.importAntiProviders();
      setAntiAccounts(accounts);
      if (typeof window.doni.getSettings === "function") {
        const savedSettings = await window.doni.getSettings();
        lastSavedSettingsJsonRef.current = JSON.stringify(savedSettings);
        setSettings(savedSettings);
      }
      void loadDoniModels(false);
      setSelectedAntiProviderId((current) =>
        current && accounts.some((account) => account.id === current)
          ? current
          : null,
      );
      setAntiStatus(
        accounts.length
          ? `Đã đọc ${accounts.length} account từ provide và đồng bộ model library.`
          : "Đã đồng bộ model library. Không có account Codex hợp lệ trong provide.",
      );
    } catch (error) {
      setAntiStatus(
        error instanceof Error ? error.message : "Không thể import file JSON.",
      );
    }
  };

  const applyAntiAccount = async (
    account: AntiProviderAccount,
  ): Promise<void> => {
    if (typeof window.doni.applyAntiProvider !== "function") {
      setAntiStatus("Electron preload API đã cũ. Hãy khởi động lại app.");
      return;
    }
    setAntiBusyId(account.id);
    setAntiStatus(null);
    try {
      await window.doni.applyAntiProvider(account);
      setSelectedAntiProviderId(account.id);
      setAntiStatus(`Đã đổi provider thành ${account?.account}`);
    } catch (error) {
      setAntiStatus(error instanceof Error ? error.message : "Không thể lưu.");
    } finally {
      setAntiBusyId(null);
    }
  };

  const runUpdaterAction = async (
    action: "check" | "download" | "install",
  ): Promise<void> => {
    const updater = window.electron?.updater ?? window.doni.updater;
    if (!updater) {
      setUpdaterStatus({
        phase: "error",
        currentVersion: "unknown",
        isDev: false,
        error: "Electron preload API đã cũ. Hãy khởi động lại toàn bộ app.",
      });
      return;
    }

    setUpdaterBusy(true);
    try {
      if (action === "check") {
        setUpdaterStatus(await updater.check());
      } else if (action === "download") {
        setUpdaterStatus(await updater.download());
      } else {
        await updater.install();
      }
    } catch (error) {
      setUpdaterStatus((current) => ({
        phase: "error",
        currentVersion: current?.currentVersion ?? "unknown",
        isDev: current?.isDev ?? false,
        error:
          error instanceof Error ? error.message : "Thao tác update thất bại.",
      }));
    } finally {
      setUpdaterBusy(false);
    }
  };

  const updaterPhase = updaterStatus?.phase ?? "idle";
  const updaterAction =
    updaterPhase === "available"
      ? "download"
      : updaterPhase === "downloaded"
        ? "install"
        : "check";
  const updaterButtonText =
    updaterPhase === "not-available"
      ? "Check again"
      : updaterPhase === "available"
        ? "Download update"
        : updaterPhase === "downloading"
          ? `Downloading ${Math.round(updaterProgress?.percent ?? 0)}%`
          : updaterPhase === "downloaded"
            ? "Install and restart"
            : "Check for updates";
  const updaterStatusText =
    updaterStatus?.error ??
    updaterStatus?.message ??
    (updaterPhase === "idle" ? "Chưa kiểm tra update." : "Đang xử lý update.");
  const geminiCatalogModels = catalogModelsForProvider("gemini");
  const visibleGeminiModelIds = getVisibleModelIds(
    "gemini",
    settings.visibleModels,
  );
  const toggleProviderExpanded = (providerId: string): void => {
    setExpandedProviderIds((current) => {
      const next = new Set(current);
      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }
      return next;
    });
  };

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-glow backdrop-blur">
      <h3 className="font-display text-xl font-semibold text-white">
        Điều phối model
      </h3>
      <p className="mt-2 text-sm text-slate-500">
        Dùng model lập kế hoạch nhanh, rẻ để phân tích và model executor mạnh
        hơn cho thay đổi code.
      </p>
      <div className="mt-4 grid gap-3">
        <input
          className="rounded-2xl border border-white/10 bg-ink/70 px-4 py-3 text-sm outline-none focus:border-mint/60"
          value={settings.apiBase}
          onChange={(e) => update("apiBase", e.target.value)}
          placeholder="URL API Base, ví dụ http://localhost:20128/v1"
        />
        <input
          className="rounded-2xl border border-white/10 bg-ink/70 px-4 py-3 text-sm outline-none focus:border-mint/60"
          value={settings.apiKey}
          onChange={(e) => update("apiKey", e.target.value)}
          placeholder={
            settings.secretReference
              ? "API key đang lưu trong Secret Store. Nhập key mới để thay đổi."
              : "Nhập API key"
          }
          type="password"
        />
      </div>
      <div className="mt-4 rounded-3xl border border-white/10 bg-ink/40 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-0 flex-1 text-sm text-slate-300">
            <span className="font-semibold text-white">Thêm model custom</span>
            <input
              className="mt-3 w-full rounded-2xl border border-white/10 bg-ink/70 px-4 py-3 text-sm outline-none focus:border-mint/60"
              value={newModelName}
              onChange={(event) => setNewModelName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCustomModel();
                }
              }}
              placeholder="Ví dụ: gpt-5.4-mini, claude-sonnet, gemini-pro"
            />
          </label>
          <button
            type="button"
            onClick={addCustomModel}
            className="rounded-full border border-mint/30 px-4 py-3 text-sm font-bold text-mint hover:bg-mint/10"
          >
            Thêm model
          </button>
        </div>
        <div className="mt-4 gap-4 flex flex-wrap">
          {[
            {
              title: "Danh sách model lập kế hoạch",
              listKey: "plannerModelIds" as const,
              ids: plannerSelectorIds,
            },
            {
              title: "Danh sách model chính",
              listKey: "executorModelIds" as const,
              ids: executorSelectorIds,
            },
          ].map((section) => (
            <div
              key={section.listKey}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-[12px] w-full max-h-[500px] overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-white">
                  {section.title}
                </div>
                <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] font-bold text-slate-400">
                  {section.ids.length}
                </span>
              </div>
              <div className="mt-3 flex flex-col gap-[12px] overflow-y-auto max-h-[300px]">
                {selectorModelOptions
                  .filter(
                    (option) =>
                      section.listKey === "executorModelIds" ||
                      option.kind !== "codexCli",
                  )
                  .map((option) => {
                    const isVisible = selectorListHasOption(
                      section.ids,
                      option,
                    );
                    return (
                      <div
                        key={`${section.listKey}-${option.key}`}
                        className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
                          isVisible
                            ? "border-mint/30 bg-mint/10"
                            : "border-white/10 bg-ink/50"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-white">
                            {option.displayName}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-slate-500">
                            {option.providerName} ·{" "}
                            {option.kind === "codexCli"
                              ? "local executor"
                              : option.accountName
                                ? `${option.accountName} · ${option.modelId}`
                                : option.modelId}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            void setSelectorModelVisibility(
                              section.listKey,
                              option.key,
                              !isVisible,
                            )
                          }
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm font-black transition ${
                            isVisible
                              ? "border-ember/30 text-ember hover:bg-ember/10"
                              : "border-mint/30 text-mint hover:bg-mint/10"
                          }`}
                          aria-label={
                            isVisible
                              ? `Remove ${option.displayName}`
                              : `Add ${option.displayName}`
                          }
                        >
                          {isVisible ? "x" : "+"}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
        {modelOptions.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {modelOptions.map((modelName) => (
              <span
                key={modelName}
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-mono text-slate-300"
              >
                <span className="truncate">{modelName}</span>
                <button
                  type="button"
                  onClick={() => removeCustomModel(modelName)}
                  className="text-slate-500 hover:text-ember"
                  title="Xóa model"
                >
                  x
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-ink/40 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h4 className="font-display text-lg font-semibold text-white">
              AI Providers
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              Quản lý provider registry, account, secret và routing policy.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={resetAccountForm}
              className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-white hover:border-mint/50"
            >
              New account
            </button>
            <button
              type="button"
              onClick={() => void loadDoniModels(true)}
              disabled={modelDiscoveryBusy}
              className="rounded-full border border-mint/30 px-3 py-2 text-xs font-bold text-mint hover:bg-mint/10 disabled:opacity-60"
            >
              Refresh models
            </button>
          </div>
        </div>

        {activeAuthFlow ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-mint/30 bg-mint/10 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">
                  Connect {activeAuthFlow.providerName}
                </div>
                <div className="mt-1 text-xs text-mint">
                  {activeAuthFlow.status === "completed"
                    ? "Connected"
                    : activeAuthFlow.status === "slow_down"
                      ? "Waiting more slowly..."
                      : "Waiting for authorization..."}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveAuthFlow(null)}
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-white hover:border-mint/50"
              >
                Close
              </button>
            </div>
            {activeAuthFlow.verificationUri ? (
              <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    Login URL
                  </div>
                  <a
                    href={
                      activeAuthFlow.verificationUriComplete ??
                      activeAuthFlow.verificationUri
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block break-all font-mono text-sm leading-5 text-skyglass hover:underline"
                  >
                    {activeAuthFlow.verificationUri}
                  </a>
                </div>
                {activeAuthFlow.userCode ? (
                  <div className="min-w-[132px]">
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      Your Code
                    </div>
                    <div className="mt-1 whitespace-nowrap rounded-xl border border-white/10 bg-ink/70 px-4 py-2 text-center font-mono text-lg font-black text-white">
                      {activeAuthFlow.userCode}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {activeAuthFlow.message ? (
              <div className="mt-3 text-xs text-slate-400">
                {activeAuthFlow.message}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 grid min-w-0 gap-3 xl:grid-cols-2">
          {providers.map((provider) => {
            const summary = provider.connectionSummary;
            const isExpanded = expandedProviderIds.has(provider.id);
            const hasDeviceCodeConnect = provider.authMethods?.some(
              (method) =>
                method.id === "deviceCode" && method.status === "available",
            );
            const hasOAuthConnect =
              provider.id !== "gemini" &&
              provider.authMethods?.some(
                (method) =>
                  method.id === "oauthPkce" && method.status === "available",
              );
            const hasGeminiOAuthConnect =
              provider.id === "gemini" &&
              provider.authMethods?.some(
                (method) =>
                  method.id === "oauthPkce" && method.status === "available",
              );
            return (
              <div
                key={provider.id}
                className="flex min-w-0 flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleProviderExpanded(provider.id)}
                      className="flex max-w-full items-center gap-2 text-left text-sm font-semibold text-white hover:text-mint"
                    >
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-white/10 text-xs text-slate-500">
                        {isExpanded ? "v" : ">"}
                      </span>
                      <span className="truncate">{provider.displayName}</span>
                    </button>
                    <div className="mt-1 break-all font-mono text-xs leading-5 text-slate-500">
                      {provider.id} · {provider.category} · {provider.authType}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-bold ${
                      summary?.errorAccounts
                        ? "border-ember/30 bg-ember/10 text-ember"
                        : summary?.connectedAccounts
                          ? "border-mint/30 bg-mint/10 text-mint"
                          : "border-white/10 text-slate-400"
                    }`}
                  >
                    {summary?.label ??
                      (provider.capabilities.includes("local")
                        ? "Local"
                        : "Cloud")}
                  </span>
                </div>
                {isExpanded ? (
                  <div className="mt-3 grid gap-1">
                    {summary?.accounts.length ? (
                      summary.accounts.map((account) => (
                        <div
                          key={account.accountId}
                          className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink/40 px-3 py-2 text-xs"
                        >
                          <span className="min-w-0 truncate text-slate-300">
                            {account.status === "error" ? "! " : "• "}
                            {account.displayName}
                          </span>
                          <span
                            className={`shrink-0 font-bold ${
                              account.status === "connected"
                                ? "text-mint"
                                : account.status === "error"
                                  ? "text-ember"
                                  : "text-slate-500"
                            }`}
                          >
                            {account.status === "error"
                              ? `Error${account.errorCode ? ` ${account.errorCode}` : ""}`
                              : account.status === "connected"
                                ? "Connected"
                                : "Disconnected"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-white/10 px-3 py-2 text-xs text-slate-500">
                        No Connections
                      </div>
                    )}
                  </div>
                ) : null}
                <div className="mt-3 flex min-w-0 flex-wrap gap-1">
                  {provider.capabilities.map((capability) => (
                    <span
                      key={capability}
                      className="rounded-full bg-white/[0.04] px-2 py-1 text-[11px] text-slate-400"
                    >
                      {capability}
                    </span>
                  ))}
                </div>
                {provider.authMethods?.length ? (
                  <div className="mt-2 flex min-w-0 flex-wrap gap-1">
                    {provider.authMethods.map((method) => (
                      <span
                        key={method.id}
                        className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-slate-400"
                      >
                        {method.displayName}
                        {method.status === "future" ? " · future" : ""}
                      </span>
                    ))}
                  </div>
                ) : null}
                {hasDeviceCodeConnect || hasOAuthConnect ? (
                  <div className="mt-auto flex flex-wrap gap-2 pt-3">
                    {hasDeviceCodeConnect ? (
                      <button
                        type="button"
                        onClick={() => void startProviderDeviceCode(provider)}
                        disabled={oauthBusy}
                        className="rounded-full border border-mint/30 px-3 py-2 text-xs font-bold text-mint hover:bg-mint/10 disabled:opacity-60"
                      >
                        Connect
                      </button>
                    ) : null}
                    {hasOAuthConnect ? (
                      <button
                        type="button"
                        onClick={() => void startProviderOAuth(provider)}
                        disabled={oauthBusy}
                        className="rounded-full border border-mint/30 px-3 py-2 text-xs font-bold text-mint hover:bg-mint/10 disabled:opacity-60"
                      >
                        Connect
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {hasGeminiOAuthConnect ? (
                  <div className="mt-3 flex flex-col gap-[12px]">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                      <input
                        type="checkbox"
                        checked={useCustomGeminiOAuthClientId}
                        onChange={(event) =>
                          setUseCustomGeminiOAuthClientId(event.target.checked)
                        }
                        className="h-4 w-4 accent-mint"
                      />
                      Use custom OAuth Client ID
                    </label>
                    {useCustomGeminiOAuthClientId ? (
                      <div className="grid gap-2">
                        <input
                          value={geminiOAuthClientId}
                          onChange={(event) =>
                            setGeminiOAuthClientId(event.target.value)
                          }
                          className="w-full rounded-xl border border-white/10 bg-ink/70 px-3 py-2 text-xs outline-none focus:border-mint/60"
                          placeholder="Google OAuth Desktop Client ID"
                        />
                        <input
                          type="password"
                          value={geminiOAuthClientSecret}
                          onChange={(event) =>
                            setGeminiOAuthClientSecret(event.target.value)
                          }
                          className="w-full rounded-xl border border-white/10 bg-ink/70 px-3 py-2 text-xs outline-none focus:border-mint/60"
                          placeholder="Google OAuth Client Secret"
                        />
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void signInGeminiOAuth()}
                      disabled={oauthBusy}
                      className="rounded-full border border-mint/30 px-3 py-2 text-xs font-bold text-mint hover:bg-mint/10 disabled:opacity-60"
                    >
                      Sign in with Google
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-ink/50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h5 className="text-sm font-semibold text-white">
                Visible Models
              </h5>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Gemini models shown in the chat composer selector.
              </p>
            </div>
            <span className="rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-xs font-bold text-mint">
              {visibleGeminiModelIds.length} visible
            </span>
          </div>
          <div className="mt-4 grid gap-2">
            {geminiCatalogModels.map((model) => {
              const isVisible = visibleGeminiModelIds.includes(model.id);
              return (
                <div
                  key={model.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 transition ${
                    isVisible
                      ? "border-mint/30 bg-mint/10"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-skyglass/30 bg-skyglass/10 font-display text-xs font-black text-skyglass">
                      {model.providerIcon}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">
                        {model.displayName}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {model.providerName} · {model.id}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={
                      isVisible
                        ? `Remove ${model.displayName}`
                        : `Add ${model.displayName}`
                    }
                    onClick={() =>
                      void setVisibleModel("gemini", model.id, !isVisible)
                    }
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm font-black transition ${
                      isVisible
                        ? "border-ember/30 text-ember hover:bg-ember/10"
                        : "border-mint/30 text-mint hover:bg-mint/10"
                    }`}
                  >
                    {isVisible ? "x" : "+"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.1fr]">
          <div className="rounded-2xl border border-white/10 bg-ink/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <h5 className="text-sm font-semibold text-white">
                Provider accounts
              </h5>
              <span className="text-xs text-slate-500">
                {providerAccounts.length} configured
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-[12px]">
              {providerAccounts.length ? (
                providerAccounts.map((account) => {
                  const provider = providerById.get(account.providerId);
                  const isDefault = settings.selectedAccountId === account.id;
                  const accountDiscoveredModels = discoveredModels.filter(
                    (model) => model.accountId === account.id,
                  );
                  const accountModelLabels = account.modelIds?.length
                    ? account.modelIds
                    : accountDiscoveredModels.map((model) => model.rawId);
                  const isConfigured = Boolean(
                    provider?.authType === "none" ||
                    account.authState?.configured ||
                    account.credentialReferences?.apiKey ||
                    account.credentialReferences?.accessToken ||
                    account.secretReference,
                  );
                  return (
                    <div
                      key={account.id}
                      className={`rounded-2xl border p-3 ${
                        isDefault
                          ? "border-mint/40 bg-mint/10"
                          : "border-white/10 bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold text-white">
                              {account.displayName}
                            </span>
                            {isConfigured ? (
                              <span className="rounded-full border border-mint/30 bg-mint/10 px-2 py-0.5 text-[11px] font-bold text-mint">
                                Configured
                              </span>
                            ) : null}
                            {isDefault ? (
                              <span className="rounded-full border border-skyglass/30 bg-skyglass/10 px-2 py-0.5 text-[11px] font-bold text-skyglass">
                                Default
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 font-mono text-xs text-slate-500">
                            {provider?.displayName ?? account.providerId}
                            {account.apiBase ? ` · ${account.apiBase}` : ""}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {accountModelLabels
                              .slice(0, 12)
                              .map((modelName) => (
                                <span
                                  key={modelName}
                                  className="rounded-full bg-white/[0.04] px-2 py-1 font-mono text-[11px] text-slate-400"
                                >
                                  {modelName}
                                </span>
                              ))}
                            {accountModelLabels.length > 12 ? (
                              <span className="rounded-full bg-white/[0.04] px-2 py-1 text-[11px] text-slate-500">
                                +{accountModelLabels.length - 12}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {!isDefault ? (
                            <button
                              type="button"
                              onClick={() =>
                                setDefaultProviderAccount(account.id)
                              }
                              className="rounded-full border border-skyglass/30 px-3 py-1.5 text-xs font-bold text-skyglass hover:bg-skyglass/10"
                            >
                              Default
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void testProviderAccount(account)}
                            disabled={accountBusyId === account.id}
                            className="rounded-full border border-mint/30 px-3 py-1.5 text-xs font-bold text-mint hover:bg-mint/10 disabled:opacity-50"
                          >
                            Test
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void loadDoniModels(true, {
                                accountId: account.id,
                              })
                            }
                            disabled={modelDiscoveryBusy}
                            className="rounded-full border border-mint/30 px-3 py-1.5 text-xs font-bold text-mint hover:bg-mint/10 disabled:opacity-50"
                          >
                            Models
                          </button>
                          <button
                            type="button"
                            onClick={() => editProviderAccount(account)}
                            className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-white hover:border-mint/50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void deleteProviderAccount(account.id)
                            }
                            disabled={accountBusyId === account.id}
                            className="rounded-full border border-ember/30 px-3 py-1.5 text-xs font-bold text-ember hover:bg-ember/10 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">
                  Chưa có provider account. Tạo account đầu tiên ở form bên
                  cạnh.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-ink/50 p-4">
            <h5 className="text-sm font-semibold text-white">
              {accountForm.accountId ? "Edit account" : "Add account"}
            </h5>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <label className="text-sm text-slate-300">
                <span className="font-semibold text-white">Provider</span>
                <select
                  value={accountForm.providerId}
                  onChange={(event) =>
                    updateAccountForm("providerId", event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-ink/70 px-3 py-2 outline-none focus:border-mint/60"
                >
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-300">
                <span className="font-semibold text-white">Account name</span>
                <input
                  value={accountForm.displayName}
                  onChange={(event) =>
                    updateAccountForm("displayName", event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-ink/70 px-3 py-2 outline-none focus:border-mint/60"
                  placeholder="OpenAI Work, Local Ollama..."
                />
              </label>
              <label className="text-sm text-slate-300 lg:col-span-2">
                <span className="font-semibold text-white">API Base</span>
                <input
                  value={accountForm.apiBase}
                  onChange={(event) =>
                    updateAccountForm("apiBase", event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-ink/70 px-3 py-2 outline-none focus:border-mint/60"
                  placeholder="https://api.openai.com/v1 hoặc local gateway"
                />
              </label>
              <label className="text-sm text-slate-300 lg:col-span-2">
                <span className="font-semibold text-white">Models</span>
                <textarea
                  value={accountForm.modelText}
                  onChange={(event) =>
                    updateAccountForm("modelText", event.target.value)
                  }
                  className="mt-2 min-h-20 w-full resize-none rounded-xl border border-white/10 bg-ink/70 px-3 py-2 font-mono text-sm outline-none focus:border-mint/60"
                  placeholder="Tùy chọn. Để trống để Doni tự lấy từ /models."
                />
              </label>
              <label className="text-sm text-slate-300 lg:col-span-2">
                <span className="font-semibold text-white">API key</span>
                <input
                  value={accountForm.apiKey}
                  onChange={(event) =>
                    updateAccountForm("apiKey", event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-ink/70 px-3 py-2 outline-none focus:border-mint/60"
                  type="password"
                  placeholder={
                    accountForm.secretReference
                      ? "Configured. Nhập key mới nếu muốn thay đổi."
                      : selectedProviderRequiresKey
                        ? "Nhập API key"
                        : "Provider local có thể không cần key"
                  }
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void saveProviderAccount()}
                disabled={Boolean(accountBusyId)}
                className="rounded-full bg-mint px-4 py-2 text-sm font-bold text-ink disabled:opacity-60"
              >
                Save account
              </button>
              <button
                type="button"
                onClick={() => void testProviderAccount()}
                disabled={Boolean(accountBusyId)}
                className="rounded-full border border-mint/30 px-4 py-2 text-sm font-bold text-mint hover:bg-mint/10 disabled:opacity-60"
              >
                Test connection
              </button>
              <button
                type="button"
                onClick={resetAccountForm}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white hover:border-mint/50"
              >
                Cancel
              </button>
            </div>
            {accountStatus ? (
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                {accountStatus}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-ink/50 p-4">
          <h5 className="text-sm font-semibold text-white">Routing policy</h5>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <label className="text-sm text-slate-300">
              <span className="font-semibold text-white">Default model</span>
              <select
                value={settings.model}
                onChange={(event) => update("model", event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink/70 px-3 py-2 outline-none focus:border-mint/60"
              >
                <option value="">Chọn default model</option>
                {modelOptions.map((modelName) => (
                  <option key={modelName} value={modelName}>
                    {modelName}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-300">
              <span className="font-semibold text-white">
                Default chat model
              </span>
              <select
                value={settings.plannerModel}
                onChange={(event) => update("plannerModel", event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink/70 px-3 py-2 outline-none focus:border-mint/60"
              >
                <option value="">Chọn chat model</option>
                {modelOptions.map((modelName) => (
                  <option key={modelName} value={modelName}>
                    {modelName}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-300">
              <span className="font-semibold text-white">Code model</span>
              <select
                value={settings.executorModel}
                onChange={(event) =>
                  update("executorModel", event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink/70 px-3 py-2 outline-none focus:border-mint/60"
              >
                <option value="">Chọn code model</option>
                {modelOptions.map((modelName) => (
                  <option key={modelName} value={modelName}>
                    {modelName}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={settings.routingFallbackEnabled !== false}
              onChange={(event) =>
                updateBoolean("routingFallbackEnabled", event.target.checked)
              }
              className="h-4 w-4 accent-mint"
            />
            <span>Fallback sang account/provider khác khi route chính lỗi</span>
          </label>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <label className="rounded-2xl border border-white/10 bg-ink/50 p-4 text-sm text-slate-300">
          <span className="font-semibold text-white">
            Số tệp ngữ cảnh tối đa
          </span>
          <input
            type="number"
            min={1}
            max={30}
            value={settings.maxContextFiles}
            onChange={(event) =>
              updateNumber("maxContextFiles", Number(event.target.value))
            }
            className="mt-3 w-full rounded-xl border border-white/10 bg-ink/70 px-3 py-2 outline-none focus:border-mint/60"
          />
        </label>
        <label className="rounded-2xl border border-white/10 bg-ink/50 p-4 text-sm text-slate-300">
          <span className="font-semibold text-white">Kiểu diff</span>
          <select
            value={settings.diffMode}
            onChange={(event) => update("diffMode", event.target.value)}
            className="mt-3 w-full rounded-xl border border-white/10 bg-ink/70 px-3 py-2 outline-none focus:border-mint/60"
          >
            <option value="inline">Chỉnh sửa ngay trên dòng</option>
            <option value="split">Lựa chọn an toàn</option>
          </select>
        </label>
      </div>
      <label className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-ink/50 p-4 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={settings.autoBackup}
          onChange={(event) =>
            updateBoolean("autoBackup", event.target.checked)
          }
          className="h-4 w-4 accent-mint"
        />
        <span>Tự sao lưu trước khi áp dụng patch</span>
      </label>
      <label className="mt-3 block rounded-2xl border border-white/10 bg-ink/50 p-4 text-sm text-slate-300">
        <span className="font-semibold text-white">Git Ignore</span>
        <textarea
          value={settings.ignorePatterns.join("\n")}
          onChange={(event) =>
            setSettings((current) => ({
              ...current,
              ignorePatterns: event.target.value
                .split(/\r?\n/)
                .map((item) => item.trim())
                .filter(Boolean),
            }))
          }
          className="mt-3 min-h-24 w-full resize-none rounded-xl border border-white/10 bg-ink/70 px-3 py-2 text-sm outline-none focus:border-mint/60"
        />
      </label>
      <div className="mt-4 flex gap-3">
        <button
          disabled={isBusy}
          onClick={save}
          className="rounded-full bg-mint px-4 py-2 text-sm font-bold text-ink disabled:opacity-60"
        >
          Lưu cài đặt
        </button>
        <button
          disabled={isBusy}
          onClick={test}
          className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white hover:border-mint/50 disabled:opacity-60"
        >
          Kiểm tra kết nối
        </button>
      </div>
      {status ? (
        <div className="mt-3 text-sm text-skyglass">{status}</div>
      ) : null}

      <div className="mt-6 rounded-3xl border border-white/10 bg-ink/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="font-display text-lg font-semibold text-white">
              Anti Provider
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              Import JSON, đọc danh sách provider
            </p>
          </div>
          <button
            type="button"
            onClick={() => void importAntiProviders()}
            className="rounded-full border border-skyglass/30 px-3 py-2 text-xs font-bold text-skyglass hover:bg-skyglass/10"
          >
            Import JSON
          </button>
        </div>
        {antiStatus ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
            {antiStatus}
          </div>
        ) : null}
        <div className="mt-4 grid gap-2">
          {antiAccounts.map((account) => (
            <div
              key={account.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 ${
                selectedAntiProviderId === account.id
                  ? "border-mint/40 bg-mint/10"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-white">
                    {account.account}
                  </span>
                  {selectedAntiProviderId === account.id ? (
                    <span className="rounded-full border border-mint/30 bg-mint/10 px-2 py-0.5 text-[11px] font-bold text-mint">
                      Đang dùng
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap gap-3 font-mono text-xs text-slate-500">
                  <span>access: ...</span>
                  <span>...</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void applyAntiAccount(account)}
                disabled={antiBusyId === account.id}
                className="rounded-full border border-mint/30 px-4 py-2 text-xs font-bold text-mint hover:bg-mint/10 disabled:opacity-50"
              >
                OK
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-ink/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="font-display text-lg font-semibold text-white">
              App Update
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              Version hiện tại: {updaterStatus?.currentVersion ?? "unknown"}
            </p>
          </div>
          {updaterStatus?.updateVersion ? (
            <span className="rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-xs font-bold text-mint">
              v{updaterStatus.updateVersion}
            </span>
          ) : null}
        </div>
        {updaterStatus?.isDev ? (
          <div className="mt-4 rounded-2xl border border-skyglass/30 bg-skyglass/10 px-4 py-3 text-sm text-skyglass">
            Auto update chỉ hoạt động đầy đủ trên bản đã đóng gói installer.
          </div>
        ) : null}
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            updaterStatus?.error
              ? "border-ember/30 bg-ember/10 text-ember"
              : updaterPhase === "available" || updaterPhase === "downloaded"
                ? "border-mint/30 bg-mint/10 text-mint"
                : "border-white/10 bg-white/[0.03] text-slate-300"
          }`}
        >
          {updaterStatusText}
          {updaterStatus?.updateVersion ? (
            <span className="ml-2 text-slate-400">
              Bản mới: {updaterStatus.updateVersion}
            </span>
          ) : null}
        </div>
        {updaterPhase === "downloading" ? (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
              <span>Download progress</span>
              <span>{Math.round(updaterProgress?.percent ?? 0)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink/80">
              <div
                className="h-full rounded-full bg-mint"
                style={{
                  width: `${Math.min(100, Math.max(0, updaterProgress?.percent ?? 0))}%`,
                }}
              />
            </div>
          </div>
        ) : null}
        <button
          type="button"
          disabled={
            updaterBusy ||
            updaterPhase === "checking" ||
            updaterPhase === "downloading"
          }
          onClick={() => void runUpdaterAction(updaterAction)}
          className="mt-4 rounded-full border border-mint/30 px-4 py-2 text-sm font-bold text-mint hover:bg-mint/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {updaterButtonText}
        </button>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-ink/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="font-display text-lg font-semibold text-white">
              Codex CLI
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              Dùng đăng nhập Codex cục bộ hiện có. Doni mặc định chạy Codex ở
              chế độ chỉ đọc.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshCodexStatus}
            className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-white hover:border-mint/50"
          >
            Phát hiện
          </button>
        </div>
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${codexStatus?.available ? "border-mint/30 bg-mint/10 text-mint" : "border-ember/30 bg-ember/10 text-ember"}`}
        >
          {codexStatus?.available
            ? `${codexStatus.version ?? "Codex CLI"} - ${codexStatus.source ?? "khả dụng"}`
            : (codexStatus?.error ?? "Chưa kiểm tra Codex CLI.")}
        </div>
        <label className="mt-4 block text-sm text-slate-300">
          <span className="font-semibold text-white">Sandbox Codex</span>
          <select
            value={settings.codexSandbox}
            onChange={(event) => update("codexSandbox", event.target.value)}
            className="mt-3 w-full rounded-xl border border-white/10 bg-ink/70 px-3 py-2 outline-none focus:border-mint/60"
          >
            <option value="read-only">Chỉ đọc: chỉ phân tích và gợi ý</option>
            <option value="workspace-write">
              Cho phép ghi workspace: Codex được sửa tệp dự án
            </option>
          </select>
        </label>
        {settings.codexSandbox === "workspace-write" ? (
          <div className="mt-3 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm leading-6 text-ember">
            Chế độ ghi workspace cho phép Codex CLI sửa tệp trực tiếp. Chỉ dùng
            khi bạn sẵn sàng kiểm tra thay đổi trong git hoặc VS Code sau đó.
          </div>
        ) : null}
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-ink/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="font-display text-lg font-semibold text-white">
              Gỡ lỗi mạng AI
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              Request được gửi từ tiến trình Electron main nên không xuất hiện
              trong Network của DevTools renderer.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={refreshNetworkEvents}
              className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-white hover:border-mint/50"
            >
              Làm mới
            </button>
            <button
              type="button"
              onClick={clearNetworkEvents}
              disabled={!networkEvents.length}
              className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-white hover:border-ember/50 hover:text-ember disabled:opacity-40"
            >
              Xóa
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          {networkEvents.length ? (
            networkEvents.slice(0, 8).map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-400"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-slate-200">
                    {event.method} {event.url}
                  </span>
                  <span
                    className={
                      event.ok ? "font-bold text-mint" : "font-bold text-ember"
                    }
                  >
                    {event.status ?? "mạng"}
                    {typeof event.durationMs === "number"
                      ? ` - ${event.durationMs}ms`
                      : ""}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3">
                  <span>model: {event.model}</span>
                  <span>
                    request: {(event.requestBytes / 1024).toFixed(1)}KB
                  </span>
                  {typeof event.responseBytes === "number" ? (
                    <span>
                      response: {(event.responseBytes / 1024).toFixed(1)}KB
                    </span>
                  ) : null}
                  <span>{new Date(event.startedAt).toLocaleTimeString()}</span>
                </div>
                {event.error ? (
                  <div className="mt-2 text-ember">{event.error}</div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">
              Chưa ghi nhận request AI nào. Hãy chạy Kiểm tra kết nối hoặc Lập
              kế hoạch.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
