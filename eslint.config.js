// Anti-Gravity Supreme Architectural Fortress ESLint Configuration
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments';
import css from '@eslint/css';
import js from '@eslint/js';
import panda from '@pandacss/eslint-plugin';
import atomicDesign from 'eslint-plugin-atomic-design';
import boundaries from 'eslint-plugin-boundaries';
import i18next from 'eslint-plugin-i18next';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import security from 'eslint-plugin-security';
import storybook from 'eslint-plugin-storybook';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import { createA11yConfig } from './scripts/eslint/a11y-config.js';
import { cssTokensPlugin } from './scripts/eslint/css-tokens-plugin.js';
import { m3TokensPlugin } from './scripts/eslint/m3-tokens-plugin.js';
import { pandaRecipesPlugin } from './scripts/eslint/panda-recipes-plugin.js';
import { reactRouterNestedPlugin } from './scripts/eslint/react-router-nested-plugin.js';
import {
  restrictedImportsRule,
  restrictedSyntaxRules,
} from './scripts/eslint/restricted-rules.js';

const pandaRecommended = await panda.configs.recommended();

export default defineConfig([
  globalIgnores([
    'dist',
    'build',
    'styled-system',
    'storybook-static',
    '.react-router',
    '.agents',
    'coverage',
    'test-results',
    'playwright-report',
    '.wireit',
    '.wrangler',
    'drizzle',
    'node_modules',
    'worker-configuration.d.ts',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      security.configs.recommended,
      reactPlugin.configs.flat.recommended,
      reactPlugin.configs.flat['jsx-runtime'],
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    settings: {
      react: {
        version: '19.2',
      },
    },
    rules: {
      // Complexity and Cognitive Strictness
      complexity: ['error', 8],
      'max-lines': [
        'error',
        { max: 256, skipBlankLines: true, skipComments: true },
      ],
      'max-lines-per-function': [
        'error',
        { max: 64, skipBlankLines: true, skipComments: true },
      ],
      'max-depth': ['error', 3],
      'max-params': ['error', 3],
      'max-nested-callbacks': ['error', 3],

      // TypeScript Mathematical Supremacy
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'react/prop-types': 'off',
      'react-hooks/exhaustive-deps': 'error',
      'security/detect-object-injection': 'off',

      // Deprecated Library & Architecture Import Enforcements
      'no-restricted-imports': restrictedImportsRule,
    },
  },
  {
    ...pandaRecommended,
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      ...pandaRecommended.rules,
      '@pandacss/extraction-diagnostics': 'error',
      '@pandacss/no-deprecated': 'error',
      '@pandacss/no-debug': 'error',
      '@pandacss/no-important': 'error',
      '@pandacss/no-physical-properties': 'error',
      '@pandacss/no-shorthand-longhand-mix': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'm3-tokens': m3TokensPlugin,
      'panda-recipes': pandaRecipesPlugin,
      'react-router-nested': reactRouterNestedPlugin,
      'atomic-design': atomicDesign,
      boundaries,
      i18next,
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
        },
      },
      'boundaries/elements': [
        { type: 'tokens', pattern: 'src/tokens' },
        { type: 'theme', pattern: 'src/theme' },
        { type: 'i18n', pattern: 'src/i18n' },
        { type: 'types', pattern: 'src/types' },
        { type: 'db', pattern: 'src/db' },
        { type: 'atoms', pattern: 'src/components/atoms' },
        { type: 'molecules', pattern: 'src/components/molecules' },
        { type: 'organisms', pattern: 'src/components/organisms' },
        { type: 'templates', pattern: 'src/components/templates' },
        { type: 'pages', pattern: 'src/components/pages' },
        { type: 'components', pattern: 'src/components' },
        { type: 'routes', pattern: 'src/routes' },
        { type: 'app', pattern: 'src' },
      ],
    },
    rules: {
      'no-restricted-syntax': ['error', ...restrictedSyntaxRules],
      'm3-tokens/no-hardcoded-colors': 'error',
      'm3-tokens/enforce-motion-tokens': 'error',
      'm3-tokens/enforce-shape-tokens': 'error',
      'm3-tokens/enforce-typography-tokens': 'error',
      'panda-recipes/enforce-recipe-usage': 'error',
      'react-router-nested/enforce-nested-routes': 'error',
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-text-only',
        },
      ],
      'atomic-design/hierarchical-import': [
        'error',
        {
          levels: [
            'tokens',
            '=i18n',
            'atoms',
            'molecules',
            ['=organisms', '=components'],
            'templates',
            ['=routes', 'pages'],
          ],
          pathPatterns: [
            'src/components/(atoms|molecules|organisms|templates|pages)/',
            'src/(tokens|i18n|components|routes)/',
          ],
          module: 'strict',
        },
      ],
      'boundaries/no-unknown-files': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: { element: { type: 'tokens' } },
              allow: { to: { element: { type: 'tokens' } } },
            },
            {
              from: { element: { type: 'theme' } },
              allow: { to: { element: { type: ['tokens', 'theme'] } } },
            },
            {
              from: { element: { type: 'i18n' } },
              allow: { to: { element: { type: ['tokens', 'i18n'] } } },
            },
            {
              from: { element: { type: 'db' } },
              allow: { to: { element: { type: ['types', 'db'] } } },
            },
            {
              from: { element: { type: 'atoms' } },
              allow: {
                to: {
                  element: {
                    type: ['tokens', 'theme', 'i18n', 'types'],
                  },
                },
              },
            },
            {
              from: { element: { type: 'molecules' } },
              allow: {
                to: {
                  element: {
                    type: ['tokens', 'theme', 'i18n', 'types', 'atoms'],
                  },
                },
              },
            },
            {
              from: { element: { type: ['organisms', 'components'] } },
              allow: {
                to: {
                  element: {
                    type: [
                      'tokens',
                      'theme',
                      'i18n',
                      'types',
                      'atoms',
                      'molecules',
                      'organisms',
                      'components',
                    ],
                  },
                },
              },
            },
            {
              from: { element: { type: 'templates' } },
              allow: {
                to: {
                  element: {
                    type: [
                      'tokens',
                      'theme',
                      'i18n',
                      'types',
                      'atoms',
                      'molecules',
                      'organisms',
                      'components',
                    ],
                  },
                },
              },
            },
            {
              from: { element: { type: ['routes', 'pages'] } },
              allow: {
                to: {
                  element: {
                    type: [
                      'tokens',
                      'theme',
                      'i18n',
                      'types',
                      'db',
                      'atoms',
                      'molecules',
                      'organisms',
                      'components',
                      'templates',
                      'pages',
                      'routes',
                    ],
                  },
                },
              },
            },
            {
              from: { element: { type: 'app' } },
              allow: {
                to: {
                  element: {
                    type: [
                      'tokens',
                      'theme',
                      'i18n',
                      'types',
                      'db',
                      'atoms',
                      'molecules',
                      'organisms',
                      'components',
                      'templates',
                      'pages',
                      'routes',
                      'app',
                    ],
                  },
                },
              },
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/root.tsx',
      'src/routes/**/*.{ts,tsx}',
      'src/components/error-boundary.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['src/tokens/**/*.{ts,tsx}', 'src/theme/**/*.{ts,tsx}'],
    rules: {
      'm3-tokens/no-hardcoded-colors': 'off',
      'm3-tokens/enforce-motion-tokens': 'off',
      'm3-tokens/enforce-shape-tokens': 'off',
    },
  },
  createA11yConfig(jsxA11yPlugin),
  {
    files: ['**/*.css'],
    language: 'css/css',
    ...css.configs.recommended,
    plugins: {
      ...css.configs.recommended.plugins,
      'css-tokens': cssTokensPlugin,
    },
    rules: {
      ...css.configs.recommended.rules,
      'css/no-invalid-properties': ['error', { allowUnknownVariables: true }],
      'css/prefer-logical-properties': 'error',
      'css/selector-complexity': [
        'error',
        { maxCompounds: 4, maxCombinators: 3 },
      ],
      'css/use-baseline': 'error',
      'css-tokens/no-unscoped-component-override': 'error',
      'css-tokens/no-scoped-important': 'error',
      'css-tokens/no-raw-colors': 'error',
      'css-tokens/no-unperformant-transitions': 'error',
      'css-tokens/no-raw-font-family': 'error',
      'css-tokens/no-tailwind-directives': 'error',
      'css-tokens/enforce-theme': 'error',
    },
  },
  {
    files: ['src/theme/**/*.css'],
    rules: {
      'css-tokens/no-raw-colors': 'off',
      'css-tokens/no-raw-font-family': 'off',
      'css-tokens/enforce-theme': 'off',
    },
  },
  ...storybook.configs['flat/recommended'],
  {
    files: ['**/*.stories.{ts,tsx,js,jsx,mjs,cjs}'],
    rules: {
      'storybook/csf-component': 'error',
      'storybook/default-exports': 'error',
      'storybook/story-exports': 'error',
      'storybook/no-stories-of': 'error',
      'storybook/prefer-pascal-case': 'error',
      'storybook/hierarchy-separator': 'error',
      'storybook/no-redundant-story-name': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='storiesOf']",
          message:
            'Legacy `storiesOf()` API is forbidden. Use Component Story Format (CSF3) with a default `meta` export and `StoryObj` named exports.',
        },
        {
          selector: "CallExpression[callee.property.name='bind']",
          message:
            'Legacy CSF2 `Template.bind({})` story format is forbidden. Use CSF3 object notation (`export const MyStory: Story = { args: { ... } }`).',
        },
        {
          selector:
            'ExportNamedDeclaration > FunctionDeclaration, ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[init.type="ArrowFunctionExpression"], ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[init.type="FunctionExpression"]',
          message:
            'Legacy CSF1/CSF2 function stories are forbidden. Stories must use CSF3 object format (`export const MyStory: Story = { ... }`).',
        },
      ],
    },
  },
  {
    files: ['**/*.stories.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    rules: {
      'i18next/no-literal-string': 'off',
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'security/detect-non-literal-fs-filename': 'off',
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'CallExpression > MemberExpression[object.name=/^(it|test|describe)$/][property.name=/^(skip|only|todo)$/]',
          message:
            'Skipped, focused, or todo tests (it.skip, test.only, it.todo, etc.) are strictly forbidden. Every test must execute and assert behavior.',
        },
        {
          selector:
            'CallExpression[callee.name=/^(it|test)$/] > :matches(ArrowFunctionExpression, FunctionExpression):not(:has(CallExpression[callee.name="expect"]))',
          message:
            'Test block lacks any expect() assertion. Coverage-gaming tests without assertions are strictly prohibited.',
        },
      ],
    },
  },
  {
    files: [
      'src/**/*.{ts,tsx,js,jsx,mjs,cjs}',
      'tests/**/*.{ts,tsx,js,jsx,mjs,cjs}',
    ],
    plugins: {
      '@eslint-community/eslint-comments': eslintComments,
    },
    rules: {
      '@eslint-community/eslint-comments/no-use': ['error', { allow: [] }],
    },
  },
]);
