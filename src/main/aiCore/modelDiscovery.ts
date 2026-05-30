import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import type {
  AiProviderAccount,
  AiSettings,
  DoniModel,
  DoniModelCapabilities,
  DoniModelDiscoveryResult,
  DoniModelRegistryProvider,
  ListDoniModelsRequest,
  ProviderModelDiscoveryStrategy,
} from '../../shared/types';
import { MODEL_CATALOG, getCatalogModel } from '../../shared/modelCatalog';
import { nineRouterModelsForProvider, parseNineRouterModelTarget } from '../../shared/nineRouterModelCatalog';
import { getDoniHomeFile } from '../doniHome';
import { listConfiguredAccounts, resolveAccount, type ResolvedAiAccount } from './accountManager';
import { refreshProviderAccount } from './providerAuthService';
import { getProviderDefinition, listProviderDefinitions } from './providerRegistry';

const MODEL_CACHE_FILE = 'model-discovery.json';
const IMPORTED_PROVIDERS_FILE = 'anti-providers.json';
const SUCCESS_TTL_MS = 6 * 60 * 60 * 1000;
const ERROR_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 12_000;

const NINE_ROUTER_KIND_ENDPOINTS = [
  { path: '/v1/models', kind: 'llm' },
  { path: '/v1/models/image', kind: 'image' },
  { path: '/v1/models/tts', kind: 'tts' },
  { path: '/v1/models/stt', kind: 'stt' },
  { path: '/v1/models/embedding', kind: 'embedding' },
  { path: '/v1/models/image-to-text', kind: 'imageToText' },
  { path: '/v1/models/web', kind: 'web' },
] as const;

type ModelSource = DoniModel['availability']['source'];

interface CacheEntry {
  key: string;
  providerId: string;
  accountId: string;
  apiBase: string;
  models: DoniModel[];
  fetchedAt: string;
  expiresAt: string;
  lastError?: string;
  errorExpiresAt?: string;
}

interface CacheFile {
  version: 1;
  entries: Record<string, CacheEntry>;
}

interface ProviderModelsPayload {
  models: unknown[];
  warning?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeApiBase(apiBase: string): string {
  return apiBase.trim().replace(/\/$/, '');
}

function appendPath(apiBase: string, path: string): string {
  const base = normalizeApiBase(apiBase);
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function openAiModelsUrl(apiBase: string): string {
  let base = normalizeApiBase(apiBase);
  if (base.endsWith('/chat/completions')) base = base.slice(0, -'/chat/completions'.length);
  if (base.endsWith('/responses')) base = base.slice(0, -'/responses'.length);
  return appendPath(base, '/models');
}

function anthropicModelsUrl(apiBase: string): string {
  let base = normalizeApiBase(apiBase);
  if (base.endsWith('/messages')) base = base.slice(0, -'/messages'.length);
  return appendPath(base, '/models');
}

function ollamaTagsUrl(apiBase: string): string {
  let base = normalizeApiBase(apiBase);
  if (base.endsWith('/v1')) base = base.slice(0, -'/v1'.length);
  return appendPath(base, '/api/tags');
}

function isNineRouterEndpoint(apiBase: string | undefined): boolean {
  const normalized = apiBase?.trim().toLowerCase() ?? '';
  return (
    normalized.includes('localhost:20128') ||
    normalized.includes('127.0.0.1:20128') ||
    normalized.includes('9router')
  );
}

function nineRouterRootUrl(apiBase: string): string {
  let base = normalizeApiBase(apiBase);
  if (base.endsWith('/chat/completions')) base = base.slice(0, -'/chat/completions'.length);
  if (base.endsWith('/responses')) base = base.slice(0, -'/responses'.length);
  if (base.endsWith('/models')) base = base.slice(0, -'/models'.length);
  if (base.endsWith('/api/v1')) base = base.slice(0, -'/api/v1'.length);
  if (base.endsWith('/v1')) base = base.slice(0, -'/v1'.length);
  return base;
}

function stableModelId(providerId: string, accountId: string | undefined, rawId: string): string {
  return `${providerId}:${accountId || 'global'}:${rawId}`;
}

function cacheKey(account: ResolvedAiAccount): string {
  const authFingerprint = crypto
    .createHash('sha256')
    .update(JSON.stringify(account.authHeaders))
    .digest('hex');
  const fingerprint = {
    providerId: account.providerId,
    accountId: account.id,
    apiBase: normalizeApiBase(account.apiBase),
    authMethod: account.authMethod,
    authFingerprint,
    credentials: account.credentialReferences,
    secretReference: account.secretReference,
  };
  return crypto.createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function rawArrayFromOpenAiStyle(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!isRecord(data)) return [];
  for (const key of ['data', 'models', 'results']) {
    const value = data[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function withDoniKind(model: unknown, kind: string): unknown {
  if (isRecord(model)) {
    return {
      ...model,
      _doniKind: stringValue(model.kind) || kind,
    };
  }
  return { id: model, _doniKind: kind };
}

function dedupeRawModelsById(rawModels: unknown[]): unknown[] {
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const rawModel of rawModels) {
    const raw = isRecord(rawModel) ? rawModel : { id: rawModel };
    const rawId =
      stringValue(raw.id) ||
      stringValue(raw.name) ||
      stringValue(raw.model) ||
      stringValue(raw.slug);
    if (!rawId || seen.has(rawId)) continue;
    seen.add(rawId);
    out.push(rawModel);
  }
  return out;
}

interface ImportedNineRouterAlias {
  alias: string;
  target: string;
}

async function readImportedNineRouterAliases(): Promise<ImportedNineRouterAlias[]> {
  try {
    const imported = JSON.parse(await fs.readFile(await getDoniHomeFile('settings', IMPORTED_PROVIDERS_FILE), 'utf8')) as unknown;
    if (!isRecord(imported) || typeof imported.sourceFilePath !== 'string') return [];
    const backup = JSON.parse(await fs.readFile(imported.sourceFilePath, 'utf8')) as unknown;
    if (!isRecord(backup) || !isRecord(backup.modelAliases)) return [];

    return Object.entries(backup.modelAliases)
      .flatMap(([alias, target]) => {
        if (!alias.trim() || typeof target !== 'string' || !target.trim()) return [];
        return [{ alias: alias.trim(), target: target.trim() }];
      });
  } catch {
    return [];
  }
}

async function readImportedNineRouterAliasModels(): Promise<unknown[]> {
  const aliases = await readImportedNineRouterAliases();
  return aliases.map(({ alias, target }) => ({
    id: alias,
    name: alias,
    displayName: alias,
    description: `9router alias for ${target}`,
    object: 'model',
    owned_by: '9router-alias',
    _doniKind: 'llm',
    _doniAliasTarget: target,
    _doniSource: '9router-backup',
  }));
}

async function readImportedNineRouterAliasTargetModels(providerId: string): Promise<unknown[]> {
  const aliases = await readImportedNineRouterAliases();
  return aliases.flatMap(({ alias, target }) => {
    const parsed = parseNineRouterModelTarget(target);
    if (!parsed || parsed.providerId !== providerId) return [];
    return [{
      id: parsed.modelId,
      name: alias,
      displayName: alias,
      description: `Imported 9router alias for ${target}`,
      object: 'model',
      owned_by: parsed.providerAlias,
      _doniKind: 'llm',
      _doniAliasName: alias,
      _doniAliasTarget: target,
      _doniSource: '9router-backup',
    }];
  });
}

function nineRouterCatalogRawModels(providerId: string): unknown[] {
  return nineRouterModelsForProvider(providerId).map((model) => ({
    id: model.id,
    name: model.displayName,
    displayName: model.displayName,
    contextWindow: model.contextWindow,
    dimensions: model.dimensions,
    capabilities: model.capabilities,
    targetFormat: model.targetFormat,
    upstreamModelId: model.upstreamModelId,
    quotaFamily: model.quotaFamily,
    owned_by: model.providerAlias,
    _doniKind: model.kind,
    _doniProviderAlias: model.providerAlias,
    _doniSource: '9router-catalog',
  }));
}

function settingsLibraryRawModels(settings: AiSettings, providerId: string, account: AiProviderAccount): unknown[] {
  return (settings.modelLibrary ?? [])
    .filter((model) => model.provider === providerId)
    .filter((model) => !model.accountId || model.accountId === account.id)
    .map((model) => ({
      id: model.rawId,
      name: model.displayName,
      displayName: model.displayName,
      description: model.description,
      contextWindow: model.limits?.contextWindow,
      maxOutputTokens: model.limits?.maxOutputTokens,
      pricing: model.pricing,
      capabilities: model.capabilities,
      raw: model.raw,
      _doniKind: model.capabilities.embedding
        ? 'embedding'
        : model.capabilities.imageOutput
          ? 'image'
          : 'llm',
      _doniSource: 'doni-library',
    }));
}

function mergeCapabilities(remote: DoniModelCapabilities, local: DoniModelCapabilities): DoniModelCapabilities {
  return {
    chat: remote.chat || local.chat,
    code: remote.code || local.code,
    vision: remote.vision || local.vision,
    imageInput: remote.imageInput || local.imageInput,
    imageOutput: remote.imageOutput || local.imageOutput,
    toolCalling: remote.toolCalling || local.toolCalling,
    functionCalling: remote.functionCalling || local.functionCalling,
    streaming: remote.streaming || local.streaming,
    reasoning: remote.reasoning || local.reasoning,
    embedding: remote.embedding || local.embedding,
    rerank: remote.rerank || local.rerank,
  };
}

function rawArrayFromOllamaTags(data: unknown): unknown[] {
  if (!isRecord(data)) return rawArrayFromOpenAiStyle(data);
  const models = data.models;
  return Array.isArray(models) ? models : rawArrayFromOpenAiStyle(data);
}

function withAnthropicHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {
    ...headers,
    'anthropic-version': '2023-06-01',
  };
  const bearer = out.Authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer && !out['x-api-key']) out['x-api-key'] = bearer;
  return out;
}

async function fetchJson(url: string, options: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      const detail = text.trim().slice(0, 180) || response.statusText;
      throw new Error(`Model discovery failed: ${response.status} ${detail}`);
    }
    return text.trim() ? JSON.parse(text) : {};
  } finally {
    clearTimeout(timeout);
  }
}

export class ModelCache {
  private mutation: Promise<void> = Promise.resolve();

  private async path(): Promise<string> {
    return getDoniHomeFile('cache', MODEL_CACHE_FILE);
  }

  private async read(): Promise<CacheFile> {
    try {
      const parsed = JSON.parse(await fs.readFile(await this.path(), 'utf8')) as unknown;
      if (!isRecord(parsed) || parsed.version !== 1 || !isRecord(parsed.entries)) {
        return { version: 1, entries: {} };
      }
      return parsed as unknown as CacheFile;
    } catch {
      return { version: 1, entries: {} };
    }
  }

  private async write(file: CacheFile): Promise<void> {
    const target = await this.path();
    const temp = `${target}.${process.pid}.tmp`;
    await fs.writeFile(temp, JSON.stringify(file, null, 2), 'utf8');
    await fs.rename(temp, target);
  }

  async get(key: string): Promise<CacheEntry | undefined> {
    return (await this.read()).entries[key];
  }

  async getFresh(key: string): Promise<CacheEntry | undefined> {
    const entry = await this.get(key);
    if (!entry || Date.parse(entry.expiresAt) <= Date.now()) return undefined;
    return entry;
  }

  async set(entry: CacheEntry): Promise<void> {
    const writeTask = this.mutation.then(async () => {
      const file = await this.read();
      file.entries[entry.key] = entry;
      await this.write(file);
    });
    this.mutation = writeTask.then(
      () => undefined,
      () => undefined,
    );
    return writeTask;
  }
}

export class ModelCapabilityDetector {
  static empty(): DoniModelCapabilities {
    return {
      chat: false,
      code: false,
      vision: false,
      imageInput: false,
      imageOutput: false,
      toolCalling: false,
      functionCalling: false,
      streaming: false,
      reasoning: false,
      embedding: false,
      rerank: false,
    };
  }

  static detect(providerId: string, rawId: string, raw: Record<string, unknown>, catalog?: { capabilities: string[] }): DoniModelCapabilities {
    const id = rawId.toLowerCase();
    const kind = (stringValue(raw._doniKind) || stringValue(raw.kind) || stringValue(raw.type) || '').toLowerCase();
    const rawCapabilities = isRecord(raw.capabilities) ? raw.capabilities : {};
    const rawCapabilityList = Array.isArray(raw.capabilities)
      ? raw.capabilities.filter((item): item is string => typeof item === 'string').map((item) => item.toLowerCase())
      : [];
    const methods = Array.isArray(raw.supportedGenerationMethods)
      ? raw.supportedGenerationMethods.filter((item): item is string => typeof item === 'string')
      : [];
    const catalogCaps = new Set(catalog?.capabilities ?? []);
    const imageToText = kind === 'imagetotext' || kind === 'image-to-text';
    const embedding = kind === 'embedding' || /embed|embedding/.test(id) || methods.some((method) => /embed/i.test(method));
    const imageOutput =
      kind === 'image' ||
      (!imageToText && /image|imagen|dall-?e|flux|stable-diffusion|sdxl/.test(id)) ||
      (!imageToText && methods.some((method) => /generateimages/i.test(method)));
    const rerank = kind === 'rerank' || /rerank/.test(id);
    const nonChatKind = ['tts', 'stt', 'web', 'websearch', 'webfetch'].includes(kind);
    const chat =
      !embedding &&
      !rerank &&
      !nonChatKind &&
      !/tts|speech|audio|transcrib|whisper/.test(id) &&
      (!imageOutput || imageToText) &&
      (methods.length === 0 || methods.some((method) => /generatecontent|streamgeneratecontent|chat|completions/i.test(method)));

    return {
      chat,
      code: chat && (/code|coder|codex|claude|gpt|gemini|qwen|deepseek/.test(id) || catalogCaps.has('tools')),
      vision: imageToText || catalogCaps.has('vision') || rawCapabilityList.includes('vision') || Boolean(rawCapabilities.vision) || /vision|vl|image/.test(id),
      imageInput: imageToText || catalogCaps.has('vision') || rawCapabilityList.includes('image') || rawCapabilityList.includes('vision') || Boolean(rawCapabilities.vision) || /vision|vl/.test(id),
      imageOutput,
      toolCalling: catalogCaps.has('tools') || rawCapabilityList.includes('tools') || Boolean(rawCapabilities.tool_calls || rawCapabilities.tools),
      functionCalling: catalogCaps.has('tools') || rawCapabilityList.includes('function_calling') || Boolean(rawCapabilities.function_calling),
      streaming: catalogCaps.has('streaming') || providerId !== 'gemini' || methods.includes('streamGenerateContent'),
      reasoning: catalogCaps.has('reasoning') || /reason|thinking|o\d|gpt-5|opus|pro/.test(id),
      embedding,
      rerank,
    };
  }
}

export class ModelNormalizer {
  normalize(providerId: string, account: AiProviderAccount, rawModels: unknown[], source: ModelSource): DoniModel[] {
    const seen = new Set<string>();
    const models: DoniModel[] = [];
    for (const rawModel of rawModels) {
      const raw = isRecord(rawModel) ? rawModel : { id: rawModel };
      let rawId =
        stringValue(raw.id) ||
        stringValue(raw.name) ||
        stringValue(raw.model) ||
        stringValue(raw.slug);
      if (!rawId) continue;
      if (providerId === 'gemini') rawId = rawId.replace(/^models\//, '');
      if (seen.has(rawId)) continue;
      seen.add(rawId);

      const catalog = getCatalogModel(rawId, providerId);
      const displayName =
        stringValue(raw.displayName) ||
        stringValue(raw.display_name) ||
        stringValue(raw.title) ||
        stringValue(raw.name)?.replace(/^models\//, '') ||
        catalog?.displayName ||
        rawId;
      const contextWindow =
        numberValue(raw.context_length) ||
        numberValue(raw.contextWindow) ||
        numberValue(raw.contextLength) ||
        numberValue(raw.inputTokenLimit);
      const outputTokenLimit =
        numberValue(raw.max_output_tokens) ||
        numberValue(raw.maxOutputTokens) ||
        numberValue(raw.outputTokenLimit);
      const pricing = isRecord(raw.pricing) ? raw.pricing : undefined;
      const promptPrice = numberValue(pricing?.prompt ?? pricing?.input);
      const completionPrice = numberValue(pricing?.completion ?? pricing?.output);
      const rawSource = stringValue(raw._doniSource);
      const modelSource: ModelSource =
        rawSource === '9router-backup' || rawSource === '9router-catalog' || rawSource === 'doni-library'
          ? 'local'
          : source;

      models.push({
        id: stableModelId(providerId, account.id, rawId),
        provider: providerId,
        accountId: account.id,
        accountName: account.displayName,
        displayName,
        rawId,
        family: this.familyFromId(rawId),
        description: stringValue(raw.description) || catalog?.description,
        capabilities: ModelCapabilityDetector.detect(providerId, rawId, raw, catalog),
        limits: {
          ...(contextWindow ? { contextWindow, inputTokenLimit: contextWindow } : {}),
          ...(outputTokenLimit ? { maxOutputTokens: outputTokenLimit, outputTokenLimit } : {}),
        },
        pricing: {
          ...(promptPrice !== undefined ? { inputPerMillion: promptPrice * 1_000_000 } : {}),
          ...(completionPrice !== undefined ? { outputPerMillion: completionPrice * 1_000_000 } : {}),
          ...(promptPrice !== undefined || completionPrice !== undefined ? { currency: 'USD' } : {}),
        },
        availability: {
          available: true,
          source: modelSource,
        },
        fetchedAt: new Date().toISOString(),
        raw,
      });
    }
    return models;
  }

  localModels(providerId: string, account: AiProviderAccount, reason: string, source: ModelSource): DoniModel[] {
    const manualIds = account.modelIds?.length
      ? account.modelIds
      : MODEL_CATALOG.filter((model) => model.providerId === providerId).map((model) => model.id);
    return this.normalize(
      providerId,
      account,
      manualIds.map((id) => ({ id })),
      source,
    ).map((model) => ({
      ...model,
      availability: {
        available: true,
        reason,
        source,
      },
    }));
  }

  private familyFromId(rawId: string): string | undefined {
    const id = rawId.toLowerCase();
    if (id.includes('gemini')) return 'gemini';
    if (id.includes('claude')) return 'claude';
    if (id.includes('gpt') || id.startsWith('o')) return 'openai';
    if (id.includes('llama')) return 'llama';
    if (id.includes('qwen')) return 'qwen';
    if (id.includes('mistral') || id.includes('mixtral')) return 'mistral';
    return undefined;
  }
}

export class ProviderModelDiscovery {
  async fetch(account: ResolvedAiAccount): Promise<ProviderModelsPayload> {
    const headers = {
      'Content-Type': 'application/json',
      ...account.authHeaders,
    };
    const strategy = this.discoveryStrategy(account);

    if (isNineRouterEndpoint(account.apiBase)) {
      return this.fetchNineRouterModels(account, headers);
    }

    if (strategy === 'manual') {
      return { models: [] };
    }

    if (strategy === 'gemini') {
      const data = await fetchJson(appendPath(account.apiBase, '/models'), { method: 'GET', headers });
      return { models: rawArrayFromOpenAiStyle(data) };
    }

    if (strategy === 'anthropic') {
      const data = await fetchJson(anthropicModelsUrl(account.apiBase), { method: 'GET', headers: withAnthropicHeaders(headers) });
      return { models: rawArrayFromOpenAiStyle(data) };
    }

    if (strategy === 'ollama') {
      try {
        const data = await fetchJson(openAiModelsUrl(account.apiBase), { method: 'GET', headers });
        return { models: rawArrayFromOpenAiStyle(data) };
      } catch {
        const data = await fetchJson(ollamaTagsUrl(account.apiBase), { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        return { models: rawArrayFromOllamaTags(data) };
      }
    }

    const data = await fetchJson(openAiModelsUrl(account.apiBase), { method: 'GET', headers });
    return { models: rawArrayFromOpenAiStyle(data) };
  }

  private discoveryStrategy(account: ResolvedAiAccount): ProviderModelDiscoveryStrategy {
    return getProviderDefinition(account.providerId)?.modelDiscovery.strategy ?? 'custom-openai-compatible';
  }

  private async fetchNineRouterModels(account: ResolvedAiAccount, headers: Record<string, string>): Promise<ProviderModelsPayload> {
    const root = nineRouterRootUrl(account.apiBase);
    const warnings: string[] = [];
    const models: unknown[] = [];

    for (const endpoint of NINE_ROUTER_KIND_ENDPOINTS) {
      try {
        const data = await fetchJson(appendPath(root, endpoint.path), { method: 'GET', headers });
        models.push(...rawArrayFromOpenAiStyle(data).map((model) => withDoniKind(model, endpoint.kind)));
      } catch (error) {
        if (endpoint.path === '/v1/models') throw error;
        warnings.push(`${endpoint.path}: ${errorMessage(error)}`);
      }
    }

    const aliasModels = await readImportedNineRouterAliasModels();
    if (aliasModels.length) models.push(...aliasModels);

    return {
      models: dedupeRawModelsById(models),
      ...(warnings.length ? { warning: `9router model discovery skipped optional kinds: ${warnings.join('; ')}` } : {}),
    };
  }
}

export class AccountModelResolver {
  async resolve(settings: AiSettings, account: AiProviderAccount): Promise<ResolvedAiAccount> {
    if (account.authState?.refreshable && account.authState.expiresAt) {
      const expiresAtMs = Date.parse(account.authState.expiresAt);
      if (Number.isFinite(expiresAtMs) && expiresAtMs - Date.now() <= 5 * 60 * 1000) {
        await refreshProviderAccount(settings, { accountId: account.id }).catch(() => undefined);
      }
    }
    return resolveAccount(settings, account.id);
  }
}

export class ModelRegistry {
  constructor(
    private readonly cache = new ModelCache(),
    private readonly resolver = new AccountModelResolver(),
    private readonly discovery = new ProviderModelDiscovery(),
    private readonly normalizer = new ModelNormalizer(),
  ) {}

  async list(settings: AiSettings, request: ListDoniModelsRequest = {}): Promise<DoniModelDiscoveryResult> {
    const forceRefresh = Boolean(request.refresh);
    const accounts = listConfiguredAccounts(settings)
      .filter((account) => account.status !== 'disabled' && account.status !== 'invalid')
      .filter((account) => !request.providerId || account.providerId === request.providerId)
      .filter((account) => !request.accountId || account.id === request.accountId);

    const results = await Promise.all(accounts.map((account) => this.modelsForAccount(settings, account, forceRefresh)));
    const warnings = results.flatMap((result) => result.warnings ?? []);
    const models = results
      .flatMap((result) => result.models)
      .filter((model) => request.includeUnavailable || model.availability.available)
      .sort((left, right) => {
        const providerDelta = left.provider.localeCompare(right.provider);
        if (providerDelta !== 0) return providerDelta;
        const accountDelta = (left.accountName ?? '').localeCompare(right.accountName ?? '');
        if (accountDelta !== 0) return accountDelta;
        return left.displayName.localeCompare(right.displayName);
      });

    const dedupedModels = this.dedupe(models);
    return {
      models: dedupedModels,
      registry: this.buildRegistry(accounts, dedupedModels),
      refreshedAt: new Date().toISOString(),
      ...(warnings.length ? { warnings } : {}),
    };
  }

  private buildRegistry(accounts: AiProviderAccount[], models: DoniModel[]): DoniModelRegistryProvider[] {
    const providerNames = new Map(listProviderDefinitions().map((provider) => [provider.id, provider.displayName]));
    const providerIds = Array.from(new Set(accounts.map((account) => account.providerId)));
    return providerIds.map((providerId) => {
      const providerAccounts = accounts.filter((account) => account.providerId === providerId);
      return {
        providerId,
        providerName: providerNames.get(providerId) ?? providerId,
        accounts: providerAccounts.map((account) => {
          const accountModels = models.filter((model) => model.provider === providerId && model.accountId === account.id);
          const refreshedAt = accountModels
            .map((model) => model.fetchedAt)
            .filter((value): value is string => Boolean(value))
            .sort()
            .at(-1);
          return {
            accountId: account.id,
            accountName: account.displayName,
            status: account.status,
            models: accountModels,
            ...(refreshedAt ? { refreshedAt } : {}),
          };
        }),
      };
    });
  }

  private async modelsForAccount(settings: AiSettings, account: AiProviderAccount, forceRefresh: boolean): Promise<DoniModelDiscoveryResult> {
    let resolved: ResolvedAiAccount;
    try {
      resolved = await this.resolver.resolve(settings, account);
    } catch (error) {
      return {
        models: await this.localModelsForAccount(settings, account.providerId, account, errorMessage(error), 'fallback'),
        warnings: [`${account.displayName}: ${errorMessage(error)}`],
      };
    }

    const key = cacheKey(resolved);
    if (!forceRefresh) {
      const fresh = await this.cache.getFresh(key);
      if (fresh) return { models: fresh.models, refreshedAt: fresh.fetchedAt };
    }

    try {
      const payload = await this.discovery.fetch(resolved);
      const remoteModels = this.normalizer.normalize(account.providerId, account, payload.models, 'remote');
      const localModels = await this.localModelsForAccount(settings, account.providerId, resolved, 'Local metadata enrichment.', 'local');
      const models = this.mergeModels(remoteModels, localModels);
      const now = new Date();
      await this.cache.set({
        key,
        providerId: account.providerId,
        accountId: account.id,
        apiBase: normalizeApiBase(resolved.apiBase),
        models,
        fetchedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + SUCCESS_TTL_MS).toISOString(),
      });
      return {
        models,
        refreshedAt: now.toISOString(),
        ...(payload.warning ? { warnings: [payload.warning] } : {}),
      };
    } catch (error) {
      const stale = await this.cache.get(key);
      const message = errorMessage(error);
      if (stale?.models?.length) {
        const models = stale.models.map((model) => ({
          ...model,
          availability: {
            available: true,
            reason: `Using cached model list because refresh failed: ${message}`,
            source: 'fallback' as const,
          },
        }));
        await this.cache.set({
          ...stale,
          models,
          lastError: message,
          errorExpiresAt: new Date(Date.now() + ERROR_TTL_MS).toISOString(),
        });
        return { models, refreshedAt: stale.fetchedAt, warnings: [`${account.displayName}: ${message}`] };
      }
      return {
        models: await this.localModelsForAccount(settings, account.providerId, resolved, message, 'fallback'),
        warnings: [`${account.displayName}: ${message}`],
      };
    }
  }

  private async localModelsForAccount(settings: AiSettings, providerId: string, account: AiProviderAccount, reason: string, source: ModelSource): Promise<DoniModel[]> {
    const rawModels = dedupeRawModelsById([
      ...nineRouterCatalogRawModels(providerId),
      ...settingsLibraryRawModels(settings, providerId, account),
      ...(await readImportedNineRouterAliasTargetModels(providerId)),
      ...MODEL_CATALOG.filter((model) => model.providerId === providerId).map((model) => ({
        id: model.id,
        name: model.displayName,
        displayName: model.displayName,
        description: model.description,
        contextWindow: model.contextWindowTokens,
        capabilities: model.capabilities,
        _doniKind: 'llm',
        _doniSource: 'doni-catalog',
      })),
      ...(account.modelIds ?? []).map((id) => ({ id, _doniKind: 'llm', _doniSource: 'account-manual' })),
    ]);

    const localModels = this.normalizer.normalize(providerId, account, rawModels, source).map((model) => ({
      ...model,
      availability: {
        ...model.availability,
        reason,
        source,
      },
    }));
    return localModels.length ? localModels : this.normalizer.localModels(providerId, account, reason, source);
  }

  private mergeModels(remote: DoniModel[], local: DoniModel[]): DoniModel[] {
    const byRawId = new Map<string, DoniModel>();
    for (const model of remote) byRawId.set(model.rawId, model);
    for (const model of local) {
      const existing = byRawId.get(model.rawId);
      if (!existing) {
        byRawId.set(model.rawId, model);
        continue;
      }
      byRawId.set(model.rawId, {
        ...existing,
        displayName: existing.displayName || model.displayName,
        description: existing.description || model.description,
        capabilities: mergeCapabilities(existing.capabilities, model.capabilities),
        limits: {
          ...model.limits,
          ...existing.limits,
        },
        availability: {
          ...existing.availability,
          source: 'merged',
        },
      });
    }
    return [...byRawId.values()];
  }

  private dedupe(models: DoniModel[]): DoniModel[] {
    const byKey = new Map<string, DoniModel>();
    for (const model of models) {
      const key = `${model.provider}:${model.accountId || ''}:${model.rawId}`;
      if (!byKey.has(key)) byKey.set(key, model);
    }
    return [...byKey.values()];
  }
}

export const modelRegistry = new ModelRegistry();

export async function listDoniModels(settings: AiSettings, request: ListDoniModelsRequest = {}): Promise<DoniModelDiscoveryResult> {
  return modelRegistry.list(settings, request);
}

export async function refreshDoniModels(settings: AiSettings, request: ListDoniModelsRequest = {}): Promise<DoniModelDiscoveryResult> {
  return modelRegistry.list(settings, { ...request, refresh: true });
}
