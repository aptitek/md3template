import { getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import {
  findMigrationSqlFiles,
  hasCloudflareRemoteAuth,
} from '../../scripts/db-migrate.mjs';
import { appMetadata } from '../../src/db/schema.ts';

describe('Database Schema & Migration Gate', () => {
  it('defines the app_metadata D1 SQLite table schema', () => {
    expect(getTableName(appMetadata)).toBe('app_metadata');
    expect(appMetadata.key.name).toBe('key');
    expect(appMetadata.value.name).toBe('value');
    expect(appMetadata.updatedAt.name).toBe('updated_at');
  });

  it('discovers generated SQL migrations under drizzle/migrations', () => {
    const files = findMigrationSqlFiles();
    expect(files.length).toBeGreaterThanOrEqual(1);
    expect(files[0]).toContain('migration.sql');
  });

  it('detects CLOUDFLARE_API_TOKEN for remote D1 migrations', () => {
    expect(
      hasCloudflareRemoteAuth({ CLOUDFLARE_API_TOKEN: 'cf-secret-token' })
    ).toBe(true);
    expect(hasCloudflareRemoteAuth({ CLOUDFLARE_API_TOKEN: '' })).toBe(false);
    expect(hasCloudflareRemoteAuth({})).toBe(false);
  });
});
