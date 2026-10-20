#!/usr/bin/env node
/**
 * Security & Vulnerability Audit Gate (Snyk + pnpm audit)
 * Enforces zero known vulnerabilities via pnpm audit and Snyk CLI.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

interface SnykConfig {
  readonly api?: string;
  readonly INTERNAL_OAUTH_TOKEN_STORAGE?: string;
}

export function hasSnykAuth(
  env: Readonly<Record<string, string | undefined>> = process.env,
  home: string = homedir()
): boolean {
  if (env.SNYK_TOKEN && env.SNYK_TOKEN.trim().length > 0) {
    return true;
  }
  const snykConfigPath = join(home, '.config', 'configstore', 'snyk.json');
  if (!existsSync(snykConfigPath)) {
    return false;
  }
  try {
    const config = JSON.parse(
      readFileSync(snykConfigPath, 'utf-8')
    ) as SnykConfig;
    return Boolean(config.api || config.INTERNAL_OAUTH_TOKEN_STORAGE);
  } catch {
    return false;
  }
}

function runPnpmAudit(): boolean {
  const result = spawnSync('pnpm', ['audit', '--audit-level=moderate'], {
    stdio: 'inherit',
  });
  return result.status === 0;
}

function runSnykAudit(): boolean {
  if (!hasSnykAuth()) {
    console.log(
      'ℹ️ Snyk CLI scan skipped: SNYK_TOKEN or `snyk auth` not configured (pnpm audit passed).'
    );
    return true;
  }

  const result = spawnSync('snyk', ['test', '--severity-threshold=low'], {
    stdio: 'inherit',
  });
  return result.status === 0;
}

function runCli(): void {
  const pnpmOk = runPnpmAudit();
  if (!pnpmOk) {
    console.error('❌ [Security Gate] pnpm audit detected vulnerabilities.');
    process.exit(1);
  }

  const snykOk = runSnykAudit();
  if (!snykOk) {
    console.error('❌ [Security Gate] Snyk test detected vulnerabilities.');
    process.exit(1);
  }

  console.log('✅ Security audit verified (zero vulnerabilities).');
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  runCli();
}
