#!/usr/bin/env node
/**
 * Git Pre-Commit TDD Enforcement Hook
 * Verifies that any commit modifying implementation code in src/ also touches tests.
 */

import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const SRC_IMPLEMENTATION_REGEX = /^src\/.*(?<!\.d\.ts)$/;
const IGNORED_SRC_REGEX = /^src\/(types\/|content\/)/;
const TEST_FILE_REGEX = /(^tests\/|\.(test|spec|stories)\.(ts|tsx|js|jsx)$)/;

export function checkTddStaged(stagedFiles) {
  const stagedSrcFiles = stagedFiles.filter((file) => {
    return SRC_IMPLEMENTATION_REGEX.test(file) && !IGNORED_SRC_REGEX.test(file);
  });

  if (stagedSrcFiles.length === 0) {
    return { pass: true, stagedSrcFiles, stagedTestFiles: [] };
  }

  const stagedTestFiles = stagedFiles.filter((file) =>
    TEST_FILE_REGEX.test(file)
  );
  const pass = stagedTestFiles.length > 0;

  return { pass, stagedSrcFiles, stagedTestFiles };
}

function getGitStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', {
      encoding: 'utf-8',
    });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function runCli() {
  const staged = getGitStagedFiles();
  const { pass, stagedSrcFiles } = checkTddStaged(staged);

  if (!pass) {
    console.error(
      '\n❌ [TDD Violation] Implementation files were staged without tests:'
    );
    for (const f of stagedSrcFiles) {
      console.error(`   - ${f}`);
    }
    console.error(
      '\nIn Test-Driven Development (TDD), tests must be written first (Red -> Green -> Refactor).'
    );
    console.error(
      'Stage accompanying test files (*.test.ts, tests/**) to proceed with commit.\n'
    );
    process.exit(1);
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  runCli();
}
