#!/usr/bin/env node
/**
 * TDD Test Companion Validator
 * Enforces that every production source file in src/ has an active test companion.
 */

import { existsSync, readdirSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';

const IGNORED_SOURCE_PATTERNS = [
  /\.d\.ts$/,
  /\/types\//,
  /\/content\//,
  /main\.tsx$/,
  /\.stories\.(ts|tsx)$/,
  /\.(test|spec)\.(ts|tsx)$/,
];

function isIgnored(filePath) {
  return IGNORED_SOURCE_PATTERNS.some((p) => p.test(filePath));
}

function findSourceFiles(dir) {
  return readdirSync(dir, { recursive: true })
    .filter((entry) => typeof entry === 'string' && /\.(ts|tsx)$/.test(entry))
    .map((entry) => join(dir, entry))
    .filter((fullPath) => !isIgnored(fullPath));
}

const EXPLICIT_COMPANIONS = {
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
};

export function findCompanionForFile(relativeSrc) {
  if (EXPLICIT_COMPANIONS[relativeSrc]) {
    return EXPLICIT_COMPANIONS[relativeSrc].find((c) => existsSync(resolve(c)));
  }

  const base = basename(relativeSrc, extname(relativeSrc));
  const candidates = [
    `src/${base}.test.ts`,
    `src/${base}.test.tsx`,
    `src/${base}.stories.tsx`,
    `tests/unit/${base}.test.ts`,
    `tests/unit/${base}.test.tsx`,
    `tests/unit/${base.toLowerCase()}.test.ts`,
  ];

  return candidates.find((candidate) => existsSync(resolve(candidate)));
}

export function validateAllCompanions() {
  const srcDir = resolve('src');
  const sourceFiles = findSourceFiles(srcDir);
  const errors = [];

  for (const file of sourceFiles) {
    const rel = file.replace(`${process.cwd()}/`, '');
    const companion = findCompanionForFile(rel);
    if (!companion) {
      errors.push(
        `❌ [TDD Violation] Source module '${rel}' lacks a test companion. In TDD, tests are mandatory.`
      );
    }
  }

  return { sourceFiles, errors };
}

function runCli() {
  const { sourceFiles, errors } = validateAllCompanions();

  if (errors.length > 0) {
    for (const err of errors) {
      console.error(err);
    }
    console.error(
      `\nFatal: ${errors.length} file(s) lack required test companions.`
    );
    process.exit(1);
  } else {
    console.log(
      `✅ TDD test companions verified across all ${sourceFiles.length} source module(s).`
    );
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  runCli();
}
