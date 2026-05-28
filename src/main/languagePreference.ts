const LANGUAGE_PATTERNS: Array<{ language: string; pattern: RegExp }> = [
  { language: 'Vietnamese', pattern: /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i },
  { language: 'Japanese', pattern: /[\u3040-\u30ff]/ },
  { language: 'Korean', pattern: /[\uac00-\ud7af]/ },
  { language: 'Chinese', pattern: /[\u4e00-\u9fff]/ },
  { language: 'Thai', pattern: /[\u0e00-\u0e7f]/ },
  { language: 'Arabic', pattern: /[\u0600-\u06ff]/ },
  { language: 'Russian', pattern: /[\u0400-\u04ff]/ },
  { language: 'Hindi', pattern: /[\u0900-\u097f]/ },
];

export function detectPreferredLanguage(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return 'the same language as the user request';
  return LANGUAGE_PATTERNS.find((item) => item.pattern.test(trimmed))?.language ?? 'English';
}

export function buildLanguageInstruction(rawRequest: string): string {
  const preferredLanguage = detectPreferredLanguage(rawRequest);
  return [
    `Detected user language: ${preferredLanguage}.`,
    'All user-facing text you generate must be in that language.',
    'This includes summaries, prompt variant titles/descriptions, final answers, patch summaries, warnings, notes, error analysis, and suggested follow-up prompts.',
    'Keep code, identifiers, file paths, command names, API names, and quoted terminal output unchanged.',
  ].join(' ');
}
