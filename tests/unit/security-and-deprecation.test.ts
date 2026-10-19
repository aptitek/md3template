import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  checkDirectDependencies,
  findDeprecatedInLockfile,
} from '../../scripts/lint-deprecated-deps.mjs';
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
