import type { AiSettings, ExecutePromptRequest, ExecutePromptResponse, PatchFileChange, PatchPlan, ProjectContext, ProjectContextFile } from '../shared/types';
import { createChatCompletionResult } from './aiClient';
import { buildLanguageInstruction } from './languagePreference';

interface ExecutePromptCallbacks {
  onStream?: (chunk: string) => void;
}

const ANSWER_SYSTEM_PROMPT = `You are a senior software engineer working inside an AI coding companion.
You receive an optimized coding prompt from the user.
Your job is to answer clearly and practically.

Rules:
- Follow the optimized prompt exactly.
- Do not pretend you edited files.
- Do not claim changes were applied.
- If code changes are needed, provide clear suggested changes.
- Mention which files are likely relevant when possible.
- Keep the answer structured.
- Do not output a patch/diff yet unless explicitly asked.
- Do not invent file contents you have not been given.
- Be honest about missing context.
- Use the provided file contents when they are present.
- Reference file paths when suggesting changes.
- If more files are needed, say exactly which files.
- Match the user's language for every user-facing sentence.`;

const PATCH_SYSTEM_PROMPT = `You are a patch generator for an AI coding companion.
You receive:
- user request
- optimized prompt
- selected project file contents

Your job:
- propose safe code changes
- output JSON only
- do not include markdown
- do not explain outside JSON
- do not modify files not provided in context
- preserve existing behavior unless requested
- keep changes minimal and reviewable
- write user-facing JSON fields in the same language as the user's request

Return JSON format:
{
  "summary": "short explanation of what will change",
  "riskLevel": "low | medium | high",
  "files": [
    {
      "relativePath": "src/example.tsx",
      "changeType": "modify",
      "oldContent": "full original file content here",
      "newContent": "full updated file content here",
      "notes": "why this file changes"
    }
  ],
  "warnings": [
    "optional warning"
  ]
}

Rules:
- oldContent must exactly match the provided file content.
- newContent must be the full updated file content, not partial snippets.
- Only include files from provided context.
- The response must start with { and end with }.
- Do not wrap the JSON in markdown fences.
- Do not include prose before or after the JSON.
- If you cannot safely create a patch, return:
{
  "summary": "Cannot safely generate patch",
  "riskLevel": "high",
  "files": [],
  "warnings": ["reason"]
}`;

const MAX_PATCH_BYTES = 600 * 1024;

function buildExecutionContext(request: ExecutePromptRequest): string {
  return JSON.stringify(
    {
      rawRequest: request.rawRequest,
      languageInstruction: buildLanguageInstruction(request.rawRequest),
      detectedIntent: request.detectedIntent,
      selectedPromptVariant: request.selectedVariant,
      projectContext: request.projectContext,
      loadedContextFiles: request.contextFiles?.map((file) => ({
        relativePath: file.relativePath,
        size: file.size,
        truncated: file.truncated,
      })),
      instruction:
        'Answer the optimized prompt using the lightweight project metadata and any loaded file contents provided. Do not claim file edits, patches, or applied changes. Follow languageInstruction for all user-facing text.',
    },
    null,
    2,
  );
}

function formatProjectFilesContext(files: ProjectContextFile[] | undefined): string {
  if (!files?.length) return '';

  const formattedFiles = files
    .map(
      (file) =>
        `--- FILE: ${file.relativePath} ---\n${file.content}${file.truncated ? '\n\n[Content truncated due to context size limits.]' : ''}\n--- END FILE ---`,
    )
    .join('\n\n');

  return `\n\nProject files context:\n${formattedFiles}`;
}

function extractJson(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i);
  if (fenced?.[1]) return fenced[1].trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

function isRiskLevel(value: unknown): value is PatchPlan['riskLevel'] {
  return value === 'low' || value === 'medium' || value === 'high';
}

function validatePatchFileChange(value: unknown): PatchFileChange {
  const change = value as PatchFileChange;
  if (
    !change ||
    typeof change.relativePath !== 'string' ||
    change.changeType !== 'modify' ||
    typeof change.oldContent !== 'string' ||
    typeof change.newContent !== 'string'
  ) {
    throw new Error('Invalid patch JSON. Each file change must include relativePath, changeType, oldContent, and newContent.');
  }
  if (typeof change.notes !== 'undefined' && typeof change.notes !== 'string') {
    throw new Error(`Invalid patch JSON. notes must be a string for ${change.relativePath}.`);
  }
  return change;
}

export function parsePatchPlan(rawResponse: string): PatchPlan {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(rawResponse));
  } catch {
    throw new Error('AI returned invalid patch JSON. Try again or switch to Answer Only.');
  }

  const plan = parsed as PatchPlan;
  if (!plan || typeof plan.summary !== 'string' || !isRiskLevel(plan.riskLevel) || !Array.isArray(plan.files)) {
    throw new Error('Invalid patch JSON. Expected summary, riskLevel, and files array.');
  }

  const warnings = Array.isArray(plan.warnings) ? plan.warnings.filter((warning): warning is string => typeof warning === 'string') : [];
  const files = plan.files.map(validatePatchFileChange);
  const patchSize = files.reduce((size, file) => size + file.oldContent.length + file.newContent.length, 0);
  if (patchSize > MAX_PATCH_BYTES) {
    throw new Error('Generated patch is too large to preview safely.');
  }

  return {
    summary: plan.summary,
    riskLevel: plan.riskLevel,
    files,
    warnings,
  };
}

function validatePatchAgainstContext(plan: PatchPlan, contextFiles: ProjectContextFile[]): { plan: PatchPlan; warnings: string[] } {
  const warnings = [...plan.warnings];
  const contextByPath = new Map(contextFiles.map((file) => [file.relativePath, file]));
  const validFiles = plan.files.filter((file) => {
    const contextFile = contextByPath.get(file.relativePath);
    if (!contextFile) {
      warnings.push(`AI proposed changing ${file.relativePath}, but that file was not loaded as context. This file was removed from the preview.`);
      return false;
    }
    if (file.oldContent !== contextFile.content) {
      warnings.push(`oldContent does not match loaded context for ${file.relativePath}. Review only; the diff may be stale.`);
    }
    return true;
  });

  return {
    plan: { ...plan, files: validFiles, warnings },
    warnings,
  };
}

export async function executePrompt(
  finalPrompt: string,
  projectContext: ProjectContext,
  settings: AiSettings,
  request: Omit<ExecutePromptRequest, 'finalPrompt' | 'projectContext'>,
  callbacks: ExecutePromptCallbacks = {},
): Promise<ExecutePromptResponse> {
  const trimmedPrompt = finalPrompt.trim();
  if (!trimmedPrompt) {
    throw new Error('Final prompt is empty. Select a strategy first.');
  }

  if (request.executionMode === 'patch') {
    if (!request.contextFiles?.length) {
      throw new Error('Load at least one context file before generating a patch.');
    }

    const executorSettings = { ...settings, model: settings.executorModel || settings.model };
    const result = await createChatCompletionResult(
      executorSettings,
      [
        { role: 'system', content: PATCH_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `${buildExecutionContext({ ...request, finalPrompt: trimmedPrompt, projectContext })}${formatProjectFilesContext(
            request.contextFiles,
          )}\n\nFinal executor prompt:\n${trimmedPrompt}`,
        },
      ],
      90000,
      { stream: false, taskType: 'code-edit' },
    );
    let parsedPlan: PatchPlan;
    try {
      parsedPlan = parsePatchPlan(result.content);
    } catch (error) {
      return {
        content: result.content,
        usage: result.usage,
        createdAt: new Date().toISOString(),
        patchWarnings: [
          error instanceof Error ? error.message : 'AI did not return valid patch JSON.',
          'AI response was kept as an answer. Try again, add more context files, or switch to Quick Ask if you only need guidance.',
        ],
      };
    }
    const validation = validatePatchAgainstContext(parsedPlan, request.contextFiles);

    return {
      content: result.content,
      usage: result.usage,
      createdAt: new Date().toISOString(),
      patchPlan: validation.plan,
      patchWarnings: validation.warnings,
    };
  }

  const isQuickAsk = request.selectedVariant.id === 'direct-question';
  const answerModel = isQuickAsk ? settings.plannerModel || settings.model : settings.executorModel || settings.model;
  const result = await createChatCompletionResult(
    { ...settings, model: answerModel },
    [
      { role: 'system', content: ANSWER_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `${buildExecutionContext({ ...request, finalPrompt: trimmedPrompt, projectContext })}${formatProjectFilesContext(
          request.contextFiles,
        )}\n\nFinal executor prompt:\n${trimmedPrompt}`,
      },
    ],
    60000,
    callbacks.onStream
      ? { onContentDelta: callbacks.onStream, stream: !isQuickAsk, taskType: isQuickAsk ? 'quick-chat' : 'code-edit' }
      : { taskType: isQuickAsk ? 'quick-chat' : 'code-edit' },
  );

  return {
    content: result.content,
    usage: result.usage,
    createdAt: new Date().toISOString(),
  };
}
