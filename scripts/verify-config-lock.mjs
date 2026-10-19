#!/usr/bin/env node
/**
 * Git Pre-Commit Configuration & Linter Lock Hook
 * Blocks modifications to scripts/, eslint.config.js, .dependency-cruiser.cjs,
 * or knip.json without explicit validation (ALLOW_CONFIG_EDIT=1).
 */

import { resolve } from 'node:path';
import { getGitStagedFiles } from './verify-tdd-staged.mjs';

const LOCKED_FILE_PATTERNS = [
  /^scripts\//,
  /^eslint\.config\.js$/,
  /^\.dependency-cruiser\.cjs$/,
  /^knip\.json$/,
];

export function isLockedConfigFile(filePath) {
  const normalized = filePath.replaceAll('\\', '/').replace(/^\.\//, '');
  return LOCKED_FILE_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * @param {Record<string, string | undefined>} [env]
 */
export function isExplicitlyApproved(env = process.env) {
  const flag = env.ALLOW_CONFIG_EDIT ?? env.UNLOCK_CONFIG ?? '';
  return flag === '1' || flag.toLowerCase() === 'true';
}

/**
 * @param {string[]} stagedFiles
 * @param {Record<string, string | undefined>} [env]
 */
export function checkConfigLockStaged(stagedFiles, env = process.env) {
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

function runCli() {
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
        'Modifying scripts/, eslint.config.js, .dependency-cruiser.cjs, or knip.json is blocked to prevent bypassing architectural guardrails.',
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
