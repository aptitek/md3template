#!/usr/bin/env node
/**
 * TDD Test Companion Validator
 * Enforces that every production source file in src/ has an active unit test companion (.test.ts / .test.tsx).
 * Storybook stories (.stories.tsx) are NOT accepted as substitutes for unit tests.
 */

import { existsSync, readdirSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';

const IGNORED_SOURCE_PATTERNS: readonly RegExp[] = [
  /\.d\.ts$/,
  /\/types\//,
  /\/content\//,
  /main\.tsx$/,
  /\.stories\.(ts|tsx)$/,
  /\.(test|spec)\.(ts|tsx)$/,
];

function isIgnored(filePath: string): boolean {
  return IGNORED_SOURCE_PATTERNS.some((p) => p.test(filePath));
}

function findSourceFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true })
    .filter(
      (entry): entry is string =>
        typeof entry === 'string' && /\.(ts|tsx)$/.test(entry)
    )
    .map((entry) => join(dir, entry))
    .filter((fullPath) => !isIgnored(fullPath));
}

export const EXPLICIT_COMPANIONS: Readonly<Record<string, readonly string[]>> =
  {
    'src/tokens/md3.ts': ['tests/unit/md3-tokens.test.ts'],
    'src/db/schema.ts': ['tests/unit/db-schema.test.ts'],
    'src/i18n/locales.ts': [
      'tests/unit/a11y-enforcement.test.ts',
      'tests/unit/i18n.test.ts',
    ],
    'src/i18n/strings.ts': [
      'tests/unit/a11y-enforcement.test.ts',
      'tests/unit/i18n.test.ts',
    ],
    'scripts/db-migrate.ts': ['tests/unit/db-schema.test.ts'],
    'scripts/eslint/a11y-config.ts': ['tests/unit/a11y-enforcement.test.ts'],
    'scripts/eslint/ast-helpers.ts': [
      'tests/unit/md3-tokens.test.ts',
      'tests/unit/architecture-enforcement.test.ts',
    ],
    'scripts/eslint/css-tokens-helpers.ts': ['tests/unit/css-lint.test.ts'],
    'scripts/eslint/css-tokens-plugin.ts': ['tests/unit/css-lint.test.ts'],
    'scripts/eslint/m3-tokens-plugin.ts': ['tests/unit/md3-tokens.test.ts'],
    'scripts/eslint/panda-recipes-helpers.ts': [
      'tests/unit/architecture-enforcement.test.ts',
    ],
    'scripts/eslint/panda-recipes-plugin.ts': [
      'tests/unit/architecture-enforcement.test.ts',
    ],
    'scripts/eslint/react-router-nested-plugin.ts': [
      'tests/unit/routes.test.ts',
    ],
    'scripts/eslint/restricted-rules.ts': [
      'tests/unit/architecture-enforcement.test.ts',
    ],
    'scripts/lint-deprecated-deps.ts': [
      'tests/unit/security-and-deprecation.test.ts',
    ],
    'scripts/lint-error-boundaries.ts': ['tests/unit/error-boundary.test.tsx'],
    'scripts/lint-markdown-structure.ts': ['tests/unit/markdown-lint.test.ts'],
    'scripts/lint-mdx-purity.ts': ['tests/unit/markdown-lint.test.ts'],
    'scripts/lint-routes.ts': ['tests/unit/routes.test.ts'],
    'scripts/route-ast-helpers.ts': ['tests/unit/routes.test.ts'],
    'scripts/lint-secrets.ts': ['tests/unit/security-and-deprecation.test.ts'],
    'scripts/lint-security.ts': ['tests/unit/security-and-deprecation.test.ts'],
    'scripts/lint-storybook-coverage.ts': [
      'tests/unit/storybook-enforcement.test.ts',
    ],
    'scripts/ts-ast-helpers.ts': [
      'tests/unit/storybook-enforcement.test.ts',
      'tests/unit/routes.test.ts',
    ],
    'scripts/lint-tdd-companions.ts': ['tests/unit/tdd-enforcement.test.ts'],
    'scripts/verify-config-lock.ts': ['tests/unit/tdd-enforcement.test.ts'],
    'scripts/verify-tdd-staged.ts': ['tests/unit/tdd-enforcement.test.ts'],
  };

export function getCandidateCompanions(relativeSrc: string): readonly string[] {
  const normalized = relativeSrc.replaceAll('\\', '/').replace(/^\.\//, '');
  const explicit = EXPLICIT_COMPANIONS[normalized];
  if (explicit) {
    return explicit;
  }

  const ext = extname(normalized);
  const base = basename(normalized, ext);
  const relDir = dirname(normalized).replace(/^(src|scripts)\/?/, '');
  const subPrefix = relDir ? `${relDir}/` : '';
  const kebabBase = base.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

  return [
    `src/${subPrefix}${base}.test.ts`,
    `src/${subPrefix}${base}.test.tsx`,
    `tests/unit/${subPrefix}${base}.test.ts`,
    `tests/unit/${subPrefix}${base}.test.tsx`,
    `tests/unit/${subPrefix}${kebabBase}.test.ts`,
    `tests/unit/${subPrefix}${kebabBase}.test.tsx`,
    `tests/unit/${base}.test.ts`,
    `tests/unit/${base}.test.tsx`,
    `tests/unit/${base.toLowerCase()}.test.ts`,
    `tests/unit/${base.toLowerCase()}.test.tsx`,
    `tests/unit/${kebabBase}.test.ts`,
    `tests/unit/${kebabBase}.test.tsx`,
  ];
}

export function findCompanionForFile(relativeSrc: string): string | undefined {
  const candidates = getCandidateCompanions(relativeSrc);
  return candidates.find((candidate) => existsSync(resolve(candidate)));
}

export function validateAllCompanions(): {
  readonly sourceFiles: string[];
  readonly errors: string[];
} {
  const sourceFiles = [
    ...findSourceFiles(resolve('src')),
    ...findSourceFiles(resolve('scripts')),
  ];
  const errors: string[] = [];

  for (const file of sourceFiles) {
    const rel = file.replace(`${process.cwd()}/`, '');
    const companion = findCompanionForFile(rel);
    if (!companion) {
      errors.push(
        `❌ [TDD Violation] Module '${rel}' lacks a unit test companion (.test.ts/.test.tsx). Stories (.stories.tsx) do not substitute for unit tests.`
      );
    }
  }

  return { sourceFiles, errors };
}

function runCli(): void {
  const { sourceFiles, errors } = validateAllCompanions();

  if (errors.length > 0) {
    for (const err of errors) {
      console.error(err);
    }
    console.error(
      `\nFatal: ${errors.length} file(s) lack required unit test companions.`
    );
    process.exit(1);
  }
  console.log(
    `✅ TDD test companions verified across all ${sourceFiles.length} source module(s).`
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  runCli();
}
