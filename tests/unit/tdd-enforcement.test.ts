import { describe, expect, it } from 'vitest';
import {
  findCompanionForFile,
  validateAllCompanions,
} from '../../scripts/lint-tdd-companions.mjs';
import { checkTddStaged } from '../../scripts/verify-tdd-staged.mjs';

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

  it('allows commits when src implementation and stories are co-staged', () => {
    const result = checkTddStaged([
      'src/components/Button.tsx',
      'src/components/Button.stories.tsx',
    ]);
    expect(result.pass).toBe(true);
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
