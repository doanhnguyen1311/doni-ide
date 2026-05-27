import path from 'node:path';
import type { AiSettings, OptimizePromptRequest, OptimizePromptResponse, ProjectContextSummary, ProjectFile, PromptVariant } from '../shared/types';
import { createChatCompletion } from './aiClient';

const SYSTEM_PROMPT = `You are a prompt optimization engine for an AI coding companion.
Your job is to transform a raw user request into 3 clear coding prompt variants.

Rules:
- Understand the user's intent.
- Do not solve the task yet.
- Do not write code changes yet.
- Generate 3 different prompt strategies.
- Each variant must be useful for a coding AI.
- Keep prompts actionable, specific, and safe.
- Preserve user constraints.
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
  "variants": [
    {
      "id": "safe-fix",
      "title": "Safe Fix",
      "description": "Minimal changes, preserve existing logic.",
      "prompt": "..."
    },
    {
      "id": "deep-refactor",
      "title": "Deep Refactor",
      "description": "Improve structure and maintainability.",
      "prompt": "..."
    },
    {
      "id": "targeted-debug",
      "title": "Targeted Debug",
      "description": "Focus on finding the root cause first.",
      "prompt": "..."
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
  if (!response?.detectedIntent || !Array.isArray(response.variants) || response.variants.length !== 3) {
    throw new Error('Invalid JSON response from AI. Expected detectedIntent and exactly 3 variants.');
  }
  response.variants.forEach((variant: PromptVariant) => {
    if (!variant.id || !variant.title || !variant.description || !variant.prompt) {
      throw new Error('Invalid JSON response from AI. A prompt variant is missing required fields.');
    }
  });
  return response;
}

export async function optimizePrompt(request: OptimizePromptRequest, settings: AiSettings): Promise<OptimizePromptResponse> {
  const userContent = JSON.stringify(
    {
      rawRequest: request.rawRequest,
      projectContext: request.projectContext,
      instruction: 'Return only valid JSON matching the required schema. Do not include markdown fences.',
    },
    null,
    2,
  );

  const content = await createChatCompletion(settings, [
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
