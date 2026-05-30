import type { AiModelSelection, AiRoutingProfile, AiSettings, ChatRequest, RouteDecision } from '../../shared/types';
import { parseModelSelectionKey } from '../../shared/modelSelection';
import { inferProviderId, listConfiguredAccounts, listRouteableAccounts } from './accountManager';

function taskProfile(settings: AiSettings, taskType: ChatRequest['taskType']): AiRoutingProfile | undefined {
  return settings.routingProfiles?.find((profile) => profile.taskType === taskType);
}

function preferredModelForTask(settings: AiSettings, request: ChatRequest): string {
  if (request.model?.trim()) return request.model.trim();
  const profile = taskProfile(settings, request.taskType);
  const structuredSelection = preferredModelSelectionForTask(settings, request);
  if (structuredSelection?.modelId) return structuredSelection.modelId;
  if (profile?.model?.trim()) return profile.model.trim();

  if (request.taskType === 'quick-chat' || request.taskType === 'chat' || request.taskType === 'explain') {
    return (settings.plannerModel || settings.model || settings.executorModel).trim();
  }

  return (settings.executorModel || settings.model || settings.plannerModel).trim();
}

function preferredModelSelectionForTask(settings: AiSettings, request: ChatRequest): AiModelSelection | undefined {
  if (request.model?.trim() && request.providerId?.trim()) {
    return {
      providerId: request.providerId.trim(),
      ...(request.accountId?.trim() ? { accountId: request.accountId.trim() } : {}),
      modelId: request.model.trim(),
    };
  }

  const profile = taskProfile(settings, request.taskType);
  if (profile?.modelSelection) return profile.modelSelection;

  if (request.taskType === 'quick-chat' || request.taskType === 'chat' || request.taskType === 'explain') {
    return settings.plannerModelSelection;
  }

  return settings.executorModelSelection ?? settings.plannerModelSelection;
}

function parseSelectorModelId(selectorId: string): { providerId: string; modelId: string } | undefined {
  const selection = parseModelSelectionKey(selectorId);
  return selection ? { providerId: selection.providerId, modelId: selection.modelId } : undefined;
}

function inferProviderForSelectedModel(settings: AiSettings, model: string): string | undefined {
  const selectorIds = [...(settings.plannerModelIds ?? []), ...(settings.executorModelIds ?? [])];
  const match = selectorIds
    .map(parseSelectorModelId)
    .find((item) => item?.modelId === model);
  if (!match) return undefined;
  if (match.providerId === 'custom-endpoint') return inferProviderId(settings);
  return match.providerId;
}

export function routeChatRequest(settings: AiSettings, request: ChatRequest): RouteDecision {
  const profile = taskProfile(settings, request.taskType);
  const structuredSelection = preferredModelSelectionForTask(settings, request);
  const model = preferredModelForTask(settings, request);
  const requestedProviderId = request.providerId || profile?.providerId || structuredSelection?.providerId || inferProviderForSelectedModel(settings, model);
  const selectedAccount = settings.selectedAccountId
    ? listConfiguredAccounts(settings).find((account) => account.id === settings.selectedAccountId)
    : undefined;
  const requestedAccountId =
    request.accountId ||
    profile?.accountId ||
    structuredSelection?.accountId ||
    (!requestedProviderId || selectedAccount?.providerId === requestedProviderId ? settings.selectedAccountId : undefined);

  if (!model) {
    throw new Error('No AI model is configured for this task.');
  }

  const directAccount = requestedAccountId
    ? listRouteableAccounts(settings, undefined, model).find(
        (account) => account.id === requestedAccountId && (!requestedProviderId || account.providerId === requestedProviderId),
      )
    : undefined;
  const primaryAccounts = directAccount
    ? [directAccount]
    : listRouteableAccounts(settings, requestedProviderId, model);

  if (!primaryAccounts.length) {
    throw new Error('No active AI account is configured for this route.');
  }

  const fallbackProviderIds = [
    ...(profile?.fallbackProviderIds ?? []),
    ...primaryAccounts.map((account) => account.providerId),
  ];
  const fallbackAccounts =
    settings.routingFallbackEnabled === false
      ? []
      : listRouteableAccounts(settings, undefined, model)
          .filter((account) => !primaryAccounts.some((primary) => primary.id === account.id))
          .filter((account) => !requestedProviderId || fallbackProviderIds.includes(account.providerId));
  const chain = [...primaryAccounts, ...fallbackAccounts].map((account) => ({
    providerId: account.providerId,
    accountId: account.id,
    model,
  }));

  const primary = chain[0];
  return {
    ...primary,
    reason: profile ? `Matched routing profile for ${request.taskType}` : `Default route for ${request.taskType}`,
    fallbackChain: chain.slice(1),
  };
}
