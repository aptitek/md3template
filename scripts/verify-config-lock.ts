#!/usr/bin/env node
/**
 * Git Pre-Commit Configuration & Linter Lock Hook
 * Blocks modifications to scripts/, eslint.config.js, commitlint.config.mjs,
 * .dependency-cruiser.cjs, or knip.json without explicit validation (ALLOW_CONFIG_EDIT=1).
 */

import { resolve } from 'node:path';
import { getGitStagedFiles } from './verify-tdd-staged.ts';

export interface ConfigLockResult {
  readonly pass: boolean;
  readonly lockedStagedFiles: string[];
  readonly approved: boolean;
}

const LOCKED_FILE_PATTERNS: readonly RegExp[] = [
  /^scripts\//,
  /^\.husky\//,
  /^\.github\//,
  /^eslint\.config\.js$/,
  /^commitlint\.config\.mjs$/,
  /^stryker\.config\.mjs$/,
  /^\.dependency-cruiser\.cjs$/,
  /^knip\.json$/,
  /^\.jscpd\.json$/,
  /^\.size-limit\.json$/,
];

export function isLockedConfigFile(filePath: string): boolean {
  const normalized = filePath.replaceAll('\\', '/').replace(/^\.\//, '');
  return LOCKED_FILE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isExplicitlyApproved(
  env: Readonly<Record<string, string | undefined>> = process.env
): boolean {
  const flag = env.ALLOW_CONFIG_EDIT ?? env.UNLOCK_CONFIG ?? '';
  return flag === '1' || flag.toLowerCase() === 'true';
}

export function checkConfigLockStaged(
  stagedFiles: readonly string[],
  env: Readonly<Record<string, string | undefined>> = process.env
): ConfigLockResult {
  const lockedStagedFiles = stagedFiles.filter((file) =>
    isLockedConfigFile(file)
  );

  if (lockedStagedFiles.length === 0) {
    return { pass: true, lockedStagedFiles: [], approved: false };
  }

  const approved = isExplicitlyApproved(env);
  return {
    pass: approved,
    lockedStagedFiles,
    approved,
  };
}

function runCli(): void {
  const { pass, lockedStagedFiles } =
    checkConfigLockStaged(getGitStagedFiles());

  if (!pass) {
    const details = lockedStagedFiles.map((f) => `   - ${f}`).join('\n');
    console.error(
      [
        '',
        '🔒 [Config Lock Violation] Committed changes to locked linter/configuration files are forbidden by repository policy:',
        details,
        '',
        'Modifying scripts/, eslint.config.js, commitlint.config.mjs, .dependency-cruiser.cjs, or knip.json is blocked to prevent bypassing architectural guardrails.',
        '',
      ].join('\n')
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
