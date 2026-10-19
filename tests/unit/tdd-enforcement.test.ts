import { describe, expect, it } from 'vitest';
import {
  findCompanionForFile,
  validateAllCompanions,
} from '../../scripts/lint-tdd-companions.mjs';
import { checkConfigLockStaged } from '../../scripts/verify-config-lock.mjs';
import { checkTddStaged } from '../../scripts/verify-tdd-staged.mjs';

describe('Config Lock Staged Pre-Commit Hook', () => {
  it('blocks commits modifying scripts/, eslint.config.js, .dependency-cruiser.cjs, or knip.json without explicit approval', () => {
    for (const protectedFile of [
      'scripts/lint-routes.mjs',
      'scripts/eslint/restricted-rules.js',
      'eslint.config.js',
      '.dependency-cruiser.cjs',
      'knip.json',
    ]) {
      const result = checkConfigLockStaged([protectedFile], {});
      expect(result.pass).toBe(false);
      expect(result.lockedStagedFiles).toContain(protectedFile);
    }
  });

  it('allows commits modifying protected files when ALLOW_CONFIG_EDIT=1 is set', () => {
    const result = checkConfigLockStaged(
      ['eslint.config.js', 'scripts/verify-config-lock.mjs'],
      { ALLOW_CONFIG_EDIT: '1' }
    );
    expect(result.pass).toBe(true);
    expect(result.approved).toBe(true);
  });

  it('allows commits modifying regular application and test files without flag', () => {
    const result = checkConfigLockStaged(
      ['src/components/Button.tsx', 'tests/unit/button.test.ts'],
      {}
    );
    expect(result.pass).toBe(true);
    expect(result.lockedStagedFiles).toHaveLength(0);
  });
});

describe('TDD Staged Pre-Commit Hook', () => {
  it('blocks commits when src implementation is staged without tests', () => {
    const result = checkTddStaged(['src/components/NewFeature.tsx']);
    expect(result.pass).toBe(false);
    expect(result.stagedSrcFiles).toContain('src/components/NewFeature.tsx');
  });

  it('allows commits when src implementation and tests are co-staged', () => {
    const result = checkTddStaged([
      'src/components/NewFeature.tsx',
      'tests/unit/new-feature.test.ts',
    ]);
    expect(result.pass).toBe(true);
  });

  it('rejects commits when src implementation is co-staged only with a story file (stories do not substitute unit tests)', () => {
    const result = checkTddStaged([
      'src/components/Button.tsx',
      'src/components/Button.stories.tsx',
    ]);
    expect(result.pass).toBe(false);
    expect(result.stagedTestFiles).toHaveLength(0);
  });

  it('rejects commits when multiple unrelated src modules are staged with only one unit test', () => {
    const result = checkTddStaged([
      'src/components/FeatureA.tsx',
      'src/routes/FeatureB.tsx',
      'tests/unit/feature-a.test.ts',
    ]);
    expect(result.pass).toBe(false);
  });

  it('permits commits modifying only documentation or configs', () => {
    const result = checkTddStaged(['README.md', 'package.json']);
    expect(result.pass).toBe(true);
  });

  it('ignores pure type declarations and mdx content files', () => {
    const result = checkTddStaged([
      'src/types/mdx.d.ts',
      'src/content/en/app.mdx',
    ]);
    expect(result.pass).toBe(true);
  });
});

describe('TDD Test Companion Verification', () => {
  it('verifies that all repository source modules have test companions', () => {
    const { errors, sourceFiles } = validateAllCompanions();
    expect(errors).toHaveLength(0);
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  it('detects missing companion for un-tested module path', () => {
    const companion = findCompanionForFile('src/non-existent-module.ts');
    expect(companion).toBeUndefined();
  });
});
