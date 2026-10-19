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

export default defineConfig({
  plugins: [
    mdx(),
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
  resolve: {
    tsconfigPaths: true,
    alias: {
      'styled-system': path.resolve(dirname, './styled-system'),
      '~': path.resolve(dirname, './src'),
    },
  },
  test: {
    passWithNoTests: true,
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
  },
});
