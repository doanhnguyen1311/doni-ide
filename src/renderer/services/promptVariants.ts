import type { PromptVariant } from '../../shared/types';

export const promptVariants: PromptVariant[] = [
  {
    id: 'quick-fix',
    title: 'Quick Fix',
    description: 'Target the smallest reliable change, preserve existing behavior, and call out risky assumptions.',
    prompt:
      'Review the selected project context and propose the safest minimal fix. Keep the patch small, explain the root cause, and list tests that should verify the change.',
    plan: ['Inspect the most relevant files.', 'Identify the smallest safe edit.', 'Generate a reviewable patch and verification notes.'],
    tradeoffs: ['Lower blast radius, but may leave adjacent cleanup for a later task.'],
    suggestedFiles: [],
    estimatedRisk: 'low',
  },
  {
    id: 'safe-refactor',
    title: 'Safe Refactor',
    description: 'Improve structure and maintainability without expanding scope or changing product behavior.',
    prompt:
      'Analyze the codebase structure and suggest a focused refactor plan. Prioritize clearer boundaries, typed interfaces, and low-risk incremental steps.',
    plan: ['Map current boundaries.', 'Refactor in small typed steps.', 'Keep behavior stable and verify the build.'],
    tradeoffs: ['Improves maintainability, but touches more files than a minimal fix.'],
    suggestedFiles: [],
    estimatedRisk: 'medium',
  },
  {
    id: 'deep-improve',
    title: 'Deep Improve',
    description: 'Shape frontend requests into a more intentional, polished interface direction.',
    prompt:
      'Turn this UI request into a premium implementation brief with visual direction, component hierarchy, responsive behavior, and acceptance criteria.',
    plan: ['Review existing UI conventions.', 'Implement the requested workflow first.', 'Polish responsive states and spacing.'],
    tradeoffs: ['Better product fit, but requires visual review.'],
    suggestedFiles: [],
    estimatedRisk: 'medium',
  },
];
