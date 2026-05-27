import type { PromptVariant } from '../../shared/types';

export const promptVariants: PromptVariant[] = [
  {
    id: 'safe-fix',
    title: 'Safe Fix',
    description: 'Target the smallest reliable change, preserve existing behavior, and call out risky assumptions.',
    prompt:
      'Review the selected project context and propose the safest minimal fix. Keep the patch small, explain the root cause, and list tests that should verify the change.',
  },
  {
    id: 'refactor',
    title: 'Refactor',
    description: 'Improve structure and maintainability without expanding scope or changing product behavior.',
    prompt:
      'Analyze the codebase structure and suggest a focused refactor plan. Prioritize clearer boundaries, typed interfaces, and low-risk incremental steps.',
  },
  {
    id: 'ui-premium',
    title: 'UI Premium',
    description: 'Shape frontend requests into a more intentional, polished interface direction.',
    prompt:
      'Turn this UI request into a premium implementation brief with visual direction, component hierarchy, responsive behavior, and acceptance criteria.',
  },
];
