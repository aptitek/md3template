#!/usr/bin/env node
/**
 * Database Migration Verification & Execution Script (Drizzle + Cloudflare D1)
 *
 * 1. Verifies Drizzle migration snapshots (`drizzle-kit check`).
 * 2. Verifies SQL migration files exist under `drizzle/migrations/*\/migration.sql`.
 * 3. Applies migrations to local D1 (`--local`) or remote Cloudflare D1 (`--remote`).
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DB_NAME = 'md3template-db';

export function findMigrationSqlFiles(
  migrationsDir: string = resolve('drizzle/migrations')
): string[] {
  if (!existsSync(migrationsDir)) return [];
  const sqlFiles: string[] = [];
  for (const entry of readdirSync(migrationsDir)) {
    const full = join(migrationsDir, entry);
    if (statSync(full).isDirectory()) {
      const candidate = join(full, 'migration.sql');
      if (existsSync(candidate)) {
        sqlFiles.push(candidate);
      }
    } else if (entry.endsWith('.sql')) {
      sqlFiles.push(full);
    }
  }
  return sqlFiles;
}

export function hasCloudflareRemoteAuth(
  env: Readonly<Record<string, string | undefined>> = process.env
): boolean {
  return Boolean(
    env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_API_TOKEN.trim().length > 0
  );
}

export function isValidD1DatabaseId(databaseId: string): boolean {
  const trimmed = String(databaseId ?? '').trim();
  if (!trimmed || /^0+-0+-0+-0+-0+$/.test(trimmed)) {
    return false;
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    trimmed
  );
}

function runCommand(cmd: string, args: readonly string[]): boolean {
  const res = spawnSync(cmd, args, {
    stdio: 'inherit',
    env: { ...process.env, CI: 'true' },
  });
  return res.status === 0;
}

function applyWranglerMigrations(
  mode: '--local' | '--remote',
  sqlCount: number
): void {
  const label = mode === '--remote' ? 'remote' : 'local';
  const ok = runCommand('pnpm', [
    'exec',
    'wrangler',
    'd1',
    'migrations',
    'apply',
    DB_NAME,
    mode,
  ]);
  if (!ok) {
    console.error(`❌ [DB Migration] ${label} D1 migration failed.`);
    process.exit(1);
  }
  console.log(
    `✅ Verified and applied ${sqlCount} migration(s) to ${label} D1 (${DB_NAME}).`
  );
}

function runCli(): void {
  const isRemote = process.argv.includes('--remote');
  const sqlFiles = findMigrationSqlFiles();

  if (sqlFiles.length === 0) {
    console.error(
      '❌ [DB Migration] No SQL migration files found in drizzle/migrations.'
    );
    process.exit(1);
  }

  if (!runCommand('pnpm', ['exec', 'drizzle-kit', 'check'])) {
    console.error('❌ [DB Migration] drizzle-kit check failed.');
    process.exit(1);
  }

  if (isRemote && !hasCloudflareRemoteAuth()) {
    console.log(
      'ℹ️ Remote D1 migration skipped: CLOUDFLARE_API_TOKEN is not configured.'
    );
    return;
  }

  applyWranglerMigrations(isRemote ? '--remote' : '--local', sqlFiles.length);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  runCli();
}
