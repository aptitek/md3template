/// <reference types="vitest/config" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cloudflare } from '@cloudflare/vite-plugin';
import mdx from '@mdx-js/rollup';
import { reactRouter } from '@react-router/dev/vite';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vite';

const dirname =
  import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));
const isTestOrStorybook =
  Boolean(process.env.VITEST) ||
  process.argv.some((arg) => arg.includes('storybook'));
const isStryker =
  Boolean(process.env.STRYKER_MUTATOR_RUNNER) ||
  process.argv.some((arg) => arg.includes('stryker')) ||
  dirname.includes('.stryker-tmp');

export default defineConfig({
  plugins: [
    mdx(),
    ...(isStryker
      ? [
          {
            name: 'stryker-vitest-v5-testname-compat',
            configureVitest({ project }: { project: { config: object } }) {
              let pattern: RegExp | undefined;
              Object.defineProperty(project.config, 'testNamePattern', {
                configurable: true,
                enumerable: true,
                get: () => pattern,
                set: (value: RegExp | undefined) => {
                  pattern =
                    value instanceof RegExp
                      ? RegExp(
                          value.source.replace(/ /g, '(?: > | )'),
                          value.flags
                        )
                      : value;
                },
              });
            },
          },
        ]
      : []),
    ...(!isTestOrStorybook
      ? [
          cloudflare({
            viteEnvironment: {
              name: 'ssr',
            },
          }),
          reactRouter(),
        ]
      : []),
  ],
  environments: {
    ssr: {
      resolve: {
        conditions: ['workerd', 'worker', 'node', 'module'],
      },
    },
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      'styled-system': path.resolve(dirname, './styled-system'),
      '~': path.resolve(dirname, './src'),
      ...(isStryker
        ? {
            'virtual:react-router/server-build': path.resolve(
              dirname,
              './tests/mocks/server-build.ts'
            ),
          }
        : {}),
    },
  },
  test: {
    passWithNoTests: false,
    ...(isStryker
      ? {
          testTimeout: 15000,
          include: [
            'tests/unit/a11y-enforcement.test.ts',
            'tests/unit/db-schema.test.ts',
            'tests/unit/error-boundary.test.tsx',
            'tests/unit/home.test.tsx',
            'tests/unit/layout.test.tsx',
            'tests/unit/root.test.tsx',
            'tests/unit/worker.test.ts',
          ],
          environment: 'node',
        }
      : {
          coverage: {
            provider: 'v8',
            reporter: ['text', 'json-summary', 'html'],
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
              'src/**/*.d.ts',
              'src/**/*.stories.{ts,tsx}',
              'src/types/**',
              'src/content/**',
              'src/**/types.ts',
              'src/**/*.types.ts',
            ],
            thresholds: {
              lines: 95,
              branches: 90,
              functions: 95,
              statements: 95,
              perFile: true,
            },
          },
          projects: [
            {
              resolve: {
                alias: {
                  'styled-system': path.resolve(dirname, './styled-system'),
                  '~': path.resolve(dirname, './src'),
                  'virtual:react-router/server-build': path.resolve(
                    dirname,
                    './tests/mocks/server-build.ts'
                  ),
                },
              },
              test: {
                name: 'unit',
                testTimeout: 15000,
                include: [
                  'src/**/*.{test,spec}.{ts,tsx}',
                  'tests/unit/**/*.{test,spec}.{ts,tsx}',
                ],
                environment: 'node',
              },
            },
            {
              extends: true,
              plugins: [
                storybookTest({
                  configDir: path.join(dirname, '.storybook'),
                  disableAddonDocs: false,
                }),
              ],
              test: {
                name: 'storybook',
                browser: {
                  enabled: true,
                  headless: true,
                  provider: playwright({}),
                  instances: [
                    {
                      browser: 'chromium',
                    },
                  ],
                },
              },
            },
          ],
        }),
  },
});
