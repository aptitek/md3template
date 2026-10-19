import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  checkDirectDependencies,
  findDeprecatedInLockfile,
} from '../../scripts/lint-deprecated-deps.mjs';
import {
  collectWorkspaceFiles,
  scanContentForSecrets,
  scanFilesForSecrets,
} from '../../scripts/lint-secrets.mjs';
import { hasSnykAuth } from '../../scripts/lint-security.mjs';

describe('Deprecated Dependency Gate', () => {
  it('detects deprecated packages inside lockfile content', () => {
    const sampleLockfile = `
packages:

  '@cloudflare/vitest-pool-workers@0.23.0':
    resolution: {integrity: sha512-abc==}
    deprecated: 'Renamed to @cloudflare/vitest-plugin'

  'clean-pkg@1.0.0':
    resolution: {integrity: sha512-def==}
`;
    const deprecated = findDeprecatedInLockfile(sampleLockfile);
    expect(deprecated).toHaveLength(1);
    expect(deprecated[0]?.pkg).toBe('@cloudflare/vitest-pool-workers@0.23.0');
    expect(deprecated[0]?.reason).toContain('@cloudflare/vitest-plugin');
  });

  it('verifies that the repository pnpm-lock.yaml and direct dependencies have zero deprecated packages', () => {
    const lockfile = readFileSync('pnpm-lock.yaml', 'utf-8');
    expect(findDeprecatedInLockfile(lockfile)).toEqual([]);
    expect(checkDirectDependencies()).toEqual([]);
  });
});

describe('Snyk Security Gate Configuration', () => {
  it('detects SNYK_TOKEN when present in environment', () => {
    expect(hasSnykAuth({ SNYK_TOKEN: 'secret-token' }, '/non-existent')).toBe(
      true
    );
    expect(hasSnykAuth({ SNYK_TOKEN: '' }, '/non-existent')).toBe(false);
  });
});

describe('Secret Scanner & JSCPD Pipeline Quality Gates', () => {
  it('detects leaked AWS keys, GitHub PATs, Private Keys, and DB credentials via secret-scanner', () => {
    const fakeAws = ['AKIA', '1234567890ABCDEF'].join('');
    const fakeGh = ['ghp_', 'a'.repeat(36)].join('');
    const fakeKeyHeader = ['-----BEGIN RSA ', 'PRIVATE KEY-----'].join('');
    const fakeDbUrl = [
      'postgres://admin:',
      'supersecret@db.internal:5432/app',
    ].join('');

    const findings = scanContentForSecrets(
      [fakeAws, fakeGh, fakeKeyHeader, fakeDbUrl].join('\n'),
      'mock-leaks.ts'
    );

    const ruleIds = findings.map((f) => f.ruleId);
    expect(ruleIds).toContain('aws-access-key-id');
    expect(ruleIds).toContain('github-token');
    expect(ruleIds).toContain('private-key');
    expect(ruleIds).toContain('database-credentials-uri');
  });

  it('verifies zero exposed secrets across all repository files', () => {
    const files = collectWorkspaceFiles();
    expect(files.length).toBeGreaterThan(10);
    expect(scanFilesForSecrets(files)).toEqual([]);
  });

  it('enforces zero code duplication threshold in .jscpd.json across src, tests, and scripts', () => {
    const jscpdConfig = JSON.parse(readFileSync('.jscpd.json', 'utf-8')) as {
      threshold: number;
      path: string[];
    };
    expect(jscpdConfig.threshold).toBe(0);
    expect(jscpdConfig.path).toEqual(['src', 'tests', 'scripts']);
  });
});
