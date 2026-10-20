/**
 * StrykerJS Mutation Testing Configuration
 * Enforces a >= 95% mutation score threshold across application logic, routes,
 * components, i18n, database schema, and Cloudflare Worker boundaries.
 */
export default {
  testRunner: 'vitest',
  plugins: ['@stryker-mutator/vitest-runner'],
  vitest: {
    configFile: 'vite.config.ts',
    related: false,
  },
  concurrency: 4,
  ignorePatterns: [
    'dist',
    'build',
    'storybook-static',
    'coverage',
    'reports',
    'playwright-report',
    'test-results',
    '.wireit',
    '.wrangler',
    '.react-router',
    '.agents',
  ],
  mutate: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
    '!src/tokens/**',
    '!src/routes.ts',
  ],
  ignoreStatic: true,
  incremental: true,
  incrementalFile: 'node_modules/.cache/stryker/incremental.json',
  coverageAnalysis: 'perTest',
  reporters: ['clear-text', 'progress', 'json'],
  jsonReporter: {
    fileName: 'reports/mutation/mutation.json',
  },
  tempDirName: '.stryker-tmp',
  cleanTempDir: 'always',
  thresholds: {
    high: 95,
    low: 90,
    break: 95,
  },
};
