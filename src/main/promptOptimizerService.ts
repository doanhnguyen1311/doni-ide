import path from 'node:path';
import type { AiSettings, OptimizePromptRequest, OptimizePromptResponse, ProjectContextSummary, ProjectFile, PromptVariant } from '../shared/types';
import { createChatCompletion } from './aiClient';
import { buildLanguageInstruction } from './languagePreference';

const SYSTEM_PROMPT = `You are Model A, the fast planner for Doni, a desktop AI coding companion that works alongside VS Code.
Your job is to analyze a raw coding request and prepare execution for a stronger Model B.

Rules:
- Understand the user's intent.
- Do not solve the task yet.
- Do not write code changes yet.
- Generate a refined prompt, one execution plan, a task breakdown, implementation suggestions, and exactly 3 execution strategies: Quick Fix, Safe Refactor, Deep Improve.
- Each strategy must be useful for a coding executor AI.
- Keep prompts and plans actionable, specific, and safe.
- Preserve user constraints.
- Require diff review and user confirmation before file changes.
- Match the user's language for every user-facing string you generate.
- If the request is unclear, still create best-effort variants.
- Output JSON only.

Return JSON format:
{
  "detectedIntent": {
    "taskType": "bugfix | refactor | ui | feature | explanation | unknown",
    "summary": "short summary",
    "riskLevel": "low | medium | high",
    "needsProjectContext": true
  },
  "refinedPrompt": "clear finalized prompt Model B can execute",
  "executionPlan": ["step 1", "step 2"],
  "taskBreakdown": ["subtask 1", "subtask 2"],
  "implementationSuggestions": ["suggestion 1", "suggestion 2"],
  "variants": [
    {
      "id": "quick-fix",
      "title": "Quick Fix",
      "description": "Smallest targeted change with minimal touched files.",
      "prompt": "...",
      "plan": ["step 1", "step 2"],
      "tradeoffs": ["tradeoff 1"],
      "suggestedFiles": ["src/example.ts"],
      "estimatedRisk": "low"
    },
    {
      "id": "safe-refactor",
      "title": "Safe Refactor",
      "description": "Conservative refactor with behavior preserved.",
      "prompt": "...",
      "plan": ["step 1", "step 2"],
      "tradeoffs": ["tradeoff 1"],
      "suggestedFiles": [],
      "estimatedRisk": "medium"
    },
    {
      "id": "deep-improve",
      "title": "Deep Improve",
      "description": "Broader improvement for UI/UX, architecture, or maintainability.",
      "prompt": "...",
      "plan": ["step 1", "step 2"],
      "tradeoffs": ["tradeoff 1"],
      "suggestedFiles": [],
      "estimatedRisk": "low"
    }
  ]
}`;

export function buildProjectContext(folderPath: string, files: ProjectFile[]): ProjectContextSummary {
  const extensions = files.reduce<Record<string, number>>((acc, file) => {
    const key = file.extension || '[none]';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return {
    folderName: path.basename(folderPath),
    fileCount: files.length,
    topFiles: files.slice(0, 50).map((file) => file.relativePath),
    extensions,
  };
}

function extractJson(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  return trimmed;
}

function validateResponse(value: unknown): OptimizePromptResponse {
  const response = value as OptimizePromptResponse;
  if (
    !response?.detectedIntent ||
    typeof response.refinedPrompt !== 'string' ||
    !Array.isArray(response.executionPlan) ||
    !Array.isArray(response.taskBreakdown) ||
    !Array.isArray(response.implementationSuggestions) ||
    !Array.isArray(response.variants) ||
    response.variants.length !== 3
  ) {
    throw new Error('Invalid JSON response from AI. Expected planner output and exactly 3 strategies.');
  }
  response.variants.forEach((variant: PromptVariant) => {
    if (!variant.id || !variant.title || !variant.description || !variant.prompt) {
      throw new Error('Invalid JSON response from AI. A strategy is missing required fields.');
    }
    variant.plan = Array.isArray(variant.plan) ? variant.plan.filter((item): item is string => typeof item === 'string') : [];
    variant.tradeoffs = Array.isArray(variant.tradeoffs) ? variant.tradeoffs.filter((item): item is string => typeof item === 'string') : [];
    variant.suggestedFiles = Array.isArray(variant.suggestedFiles) ? variant.suggestedFiles.filter((item): item is string => typeof item === 'string') : [];
    variant.estimatedRisk = variant.estimatedRisk === 'medium' || variant.estimatedRisk === 'high' ? variant.estimatedRisk : 'low';
  });
  return response;
}

export async function optimizePrompt(request: OptimizePromptRequest, settings: AiSettings): Promise<OptimizePromptResponse> {
  const userContent = JSON.stringify(
    {
      rawRequest: request.rawRequest,
      projectContext: request.projectContext,
      languageInstruction: buildLanguageInstruction(request.rawRequest),
      instruction: 'Return only valid JSON matching the required schema. Do not include markdown fences. Use the detected user language for detectedIntent.summary, variant titles, descriptions, and prompts.',
    },
    null,
    2,
  );

  const plannerSettings = { ...settings, model: settings.plannerModel || settings.model };
  const content = await createChatCompletion(plannerSettings, [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ]);

  try {
    return validateResponse(JSON.parse(extractJson(content)));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON response from AI. Ask the model to output JSON only or try another model.');
    }
    throw error;
  }
}
