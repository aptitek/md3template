import { getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import {
  findMigrationSqlFiles,
  hasCloudflareRemoteAuth,
  isValidD1DatabaseId,
} from '../../scripts/db-migrate.ts';
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

  it('detects CLOUDFLARE_API_TOKEN and validates real D1 database_id UUIDs for remote migrations', () => {
    expect(
      hasCloudflareRemoteAuth({ CLOUDFLARE_API_TOKEN: 'cf-secret-token' })
    ).toBe(true);
    expect(hasCloudflareRemoteAuth({ CLOUDFLARE_API_TOKEN: '' })).toBe(false);
    expect(hasCloudflareRemoteAuth({})).toBe(false);

    expect(isValidD1DatabaseId('00000000-0000-0000-0000-000000000000')).toBe(
      false
    );
    expect(isValidD1DatabaseId('REPLACE_WITH_D1_DATABASE_ID')).toBe(false);
    expect(isValidD1DatabaseId('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d')).toBe(
      true
    );
  });
});
