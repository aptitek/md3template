#!/usr/bin/env node
/**
 * Git Pre-Commit TDD Enforcement Hook
 * Verifies that every commit modifying implementation code in src/ also stages
 * the corresponding unit test companion (.test.ts / .test.tsx) for each modified module.
 * Storybook stories (.stories.tsx) do NOT count as unit test companions.
 */

import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { getCandidateCompanions } from './lint-tdd-companions.ts';

export interface TddStagedResult {
  readonly pass: boolean;
  readonly stagedSrcFiles: string[];
  readonly stagedTestFiles: string[];
  readonly untestedSrcFiles: string[];
}

const SRC_IMPLEMENTATION_REGEX =
  /^(src|scripts)\/.*\.(ts|tsx|js|jsx)(?<!\.d\.ts)$/;
const IGNORED_SRC_REGEX =
  /^src\/(types\/|content\/)|(\.(test|spec|stories)\.(ts|tsx|js|jsx)$)/;
const TEST_FILE_REGEX = /(^tests\/|\.(test|spec)\.(ts|tsx|js|jsx)$)/;

export function checkTddStaged(
  stagedFiles: readonly string[]
): TddStagedResult {
  const normalizedStaged = stagedFiles.map((f) =>
    f.replaceAll('\\', '/').replace(/^\.\//, '')
  );

  const stagedSrcFiles = normalizedStaged.filter(
    (file) =>
      SRC_IMPLEMENTATION_REGEX.test(file) && !IGNORED_SRC_REGEX.test(file)
  );

  if (stagedSrcFiles.length === 0) {
    return {
      pass: true,
      stagedSrcFiles: [],
      stagedTestFiles: [],
      untestedSrcFiles: [],
    };
  }

  const stagedTestFiles = normalizedStaged.filter((file) =>
    TEST_FILE_REGEX.test(file)
  );
  const stagedTestSet = new Set(stagedTestFiles);

  const untestedSrcFiles = stagedSrcFiles.filter((srcFile) => {
    const candidates = getCandidateCompanions(srcFile);
    return !candidates.some((candidate) => stagedTestSet.has(candidate));
  });

  const pass = stagedTestFiles.length > 0 && untestedSrcFiles.length === 0;

  return { pass, stagedSrcFiles, stagedTestFiles, untestedSrcFiles };
}

export function getGitStagedFiles(diffFilter = 'ACMRD'): string[] {
  try {
    const output = execSync(
      `git diff --cached --name-only --diff-filter=${diffFilter}`,
      {
        encoding: 'utf-8',
      }
    );
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function runCli(): void {
  const staged = getGitStagedFiles('ACMR');
  const { pass, untestedSrcFiles } = checkTddStaged(staged);

  if (!pass) {
    console.error(
      '\n❌ [TDD Violation] Implementation files were staged without their corresponding unit test companions:'
    );
    for (const f of untestedSrcFiles) {
      const expected = getCandidateCompanions(f).slice(0, 3).join(' or ');
      console.error(`   - ${f} (expected staged test: ${expected})`);
    }
    console.error(
      '\nIn Test-Driven Development (TDD), every modified module in src/ must be accompanied by its unit test (.test.ts / .test.tsx).'
    );
    console.error(
      'Note: Storybook stories (*.stories.tsx) do not substitute for unit tests.\n'
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
