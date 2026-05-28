import type { AiSettings, AnalyzeCommandErrorRequest, ErrorAnalysisResult, ProjectContextFile } from '../shared/types';
import { createChatCompletion } from './aiClient';
import { buildLanguageInstruction } from './languagePreference';

const MAX_OUTPUT_BYTES = 40 * 1024;
const HEAD_BYTES = 10 * 1024;
const TAIL_BYTES = 30 * 1024;

const SYSTEM_PROMPT = `You are an AI error analyzer for a desktop coding companion.

Your job:
- Analyze terminal/build/lint/test errors.
- Identify likely root causes.
- Suggest related files to inspect.
- Generate a focused follow-up prompt for the coding AI.
- Do not claim you fixed anything.
- Do not generate a patch yet.
- Do not invent file contents.
- If context is insufficient, say exactly what files/logs are needed.
- Match the user's language for every user-facing JSON field.

Return JSON only:
{
  "summary": "short explanation",
  "probableCauses": ["..."],
  "relatedFiles": ["..."],
  "suggestedNextActions": ["..."],
  "suggestedPrompt": "...",
  "confidence": "low | medium | high"
}`;

function truncateOutput(output: string): { output: string; truncated: boolean } {
  const bytes = Buffer.byteLength(output, 'utf8');
  if (bytes <= MAX_OUTPUT_BYTES) return { output, truncated: false };

  const buffer = Buffer.from(output, 'utf8');
  const head = buffer.subarray(0, HEAD_BYTES).toString('utf8');
  const tail = buffer.subarray(Math.max(0, buffer.length - TAIL_BYTES)).toString('utf8');
  return {
    output: `${head}\n\n[Terminal output truncated: showing first 10KB and last 30KB.]\n\n${tail}`,
    truncated: true,
  };
}

function formatLoadedContextFiles(files: ProjectContextFile[] | undefined): string {
  if (!files?.length) return '';
  return files
    .map((file) => `--- FILE: ${file.relativePath} ---\n${file.content}${file.truncated ? '\n\n[Content truncated.]' : ''}\n--- END FILE ---`)
    .join('\n\n');
}

function extractJson(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) return trimmed.slice(firstBrace, lastBrace + 1);
  return trimmed;
}

function stringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value)) throw new Error(`Invalid error analysis JSON. ${fieldName} must be an array.`);
  return value.filter((item): item is string => typeof item === 'string');
}

function validateResult(value: unknown): ErrorAnalysisResult {
  const result = value as ErrorAnalysisResult;
  if (
    !result ||
    typeof result.summary !== 'string' ||
    typeof result.suggestedPrompt !== 'string' ||
    !['low', 'medium', 'high'].includes(result.confidence)
  ) {
    throw new Error('Invalid error analysis JSON. Expected summary, suggestedPrompt, and confidence.');
  }

  return {
    summary: result.summary,
    probableCauses: stringArray(result.probableCauses, 'probableCauses'),
    relatedFiles: stringArray(result.relatedFiles, 'relatedFiles'),
    suggestedNextActions: stringArray(result.suggestedNextActions, 'suggestedNextActions'),
    suggestedPrompt: result.suggestedPrompt,
    confidence: result.confidence,
  };
}

export async function analyzeCommandError(request: AnalyzeCommandErrorRequest, settings: AiSettings): Promise<ErrorAnalysisResult> {
  if (!request.command.trim()) {
    throw new Error('Command is missing.');
  }
  if (!request.output.trim()) {
    throw new Error('Command output is empty. There is nothing to analyze.');
  }

  const truncated = truncateOutput(request.output);
  const userContent = JSON.stringify(
    {
      command: request.command,
      exitCode: request.exitCode,
      terminalOutput: truncated.output,
      terminalOutputTruncated: truncated.truncated,
      languageInstruction: buildLanguageInstruction(request.rawRequest || request.command),
      projectContext: {
        folderName: request.projectContext.folderName,
        fileCount: request.projectContext.fileCount,
        topFiles: request.projectContext.topFiles.slice(0, 100),
        extensions: request.projectContext.extensions,
      },
      rawRequest: request.rawRequest,
      detectedIntent: request.detectedIntent,
      selectedPromptVariant: request.selectedVariant,
      instruction: 'Return only valid JSON matching the required schema. Do not include markdown fences. Follow languageInstruction for summary, probableCauses, suggestedNextActions, and suggestedPrompt.',
    },
    null,
    2,
  );

  const loadedContext = formatLoadedContextFiles(request.loadedContextFiles);
  const content = await createChatCompletion(
    { ...settings, model: settings.plannerModel || settings.model },
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `${userContent}${loadedContext ? `\n\nLoaded context files:\n${loadedContext}` : ''}` },
    ],
    60000,
  );

  try {
    return validateResult(JSON.parse(extractJson(content)));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('AI returned invalid error analysis JSON. Try again or use a different model.');
    }
    throw error;
  }
}
