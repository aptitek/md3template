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
  migrationsDir = resolve('drizzle/migrations')
) {
  if (!existsSync(migrationsDir)) return [];
  const sqlFiles = [];
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

/**
 * @param {Record<string, string | undefined>} [env]
 */
export function hasCloudflareRemoteAuth(env = process.env) {
  return Boolean(
    env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_API_TOKEN.trim().length > 0
  );
}

/**
 * @param {string} databaseId
 */
export function isValidD1DatabaseId(databaseId) {
  const trimmed = String(databaseId ?? '').trim();
  if (!trimmed || /^0+-0+-0+-0+-0+$/.test(trimmed)) {
    return false;
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    trimmed
  );
}

function runCommand(cmd, args) {
  const res = spawnSync(cmd, args, {
    stdio: 'inherit',
    env: { ...process.env, CI: 'true' },
  });
  return res.status === 0;
}

function runCli() {
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

  if (isRemote) {
    if (!hasCloudflareRemoteAuth()) {
      console.log(
        'ℹ️ Remote D1 migration skipped: CLOUDFLARE_API_TOKEN is not configured.'
      );
      return;
    }
    if (
      !runCommand('pnpm', [
        'exec',
        'wrangler',
        'd1',
        'migrations',
        'apply',
        DB_NAME,
        '--remote',
      ])
    ) {
      console.error('❌ [DB Migration] Remote D1 migration failed.');
      process.exit(1);
    }
    console.log(
      `✅ Applied ${sqlFiles.length} migration(s) to remote D1 (${DB_NAME}).`
    );
    return;
  }

  if (
    !runCommand('pnpm', [
      'exec',
      'wrangler',
      'd1',
      'migrations',
      'apply',
      DB_NAME,
      '--local',
    ])
  ) {
    console.error('❌ [DB Migration] Local D1 migration failed.');
    process.exit(1);
  }

  console.log(
    `✅ Verified and applied ${sqlFiles.length} migration(s) to local D1 (${DB_NAME}).`
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  runCli();
}
