/**
 * Anti-Gravity Strict Conventional Commits Configuration
 * Enforces architectural domain scopes, mandatory non-empty scopes,
 * and descriptive commit subjects (>= 15 characters).
 */
export const ARCHITECTURAL_SCOPES = [
  'ui',
  'tokens',
  'routes',
  'db',
  'i18n',
  'ci',
  'lint',
  'theme',
  'worker',
  'test',
  'docs',
  'deps',
  'config',
  'security',
  'a11y',
  'storybook',
];

export const ALLOWED_COMMIT_TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
];

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ALLOWED_COMMIT_TYPES],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-enum': [2, 'always', ARCHITECTURAL_SCOPES],
    'scope-case': [2, 'always', 'lower-case'],
    'scope-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
    'subject-min-length': [2, 'always', 15],
    'subject-max-length': [2, 'always', 100],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 120],
  },
};
