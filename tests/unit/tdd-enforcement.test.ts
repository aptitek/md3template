import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import commitlintConfig, {
  ARCHITECTURAL_SCOPES,
} from '../../commitlint.config.mjs';
import {
  findCompanionForFile,
  validateAllCompanions,
} from '../../scripts/lint-tdd-companions.ts';
import { checkConfigLockStaged } from '../../scripts/verify-config-lock.ts';
import { checkTddStaged } from '../../scripts/verify-tdd-staged.ts';

describe('Config Lock Staged Pre-Commit Hook', () => {
  it('blocks commits modifying scripts/, eslint.config.js, commitlint.config.mjs, .dependency-cruiser.cjs, or knip.json without explicit approval', () => {
    for (const protectedFile of [
      'scripts/lint-routes.ts',
      'scripts/eslint/restricted-rules.ts',
      'eslint.config.js',
      'commitlint.config.mjs',
      'stryker.config.mjs',
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
      ['eslint.config.js', 'scripts/verify-config-lock.ts'],
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

describe('Strict Conventional Commits & Guardian Type Safety', () => {
  it('enforces mandatory architectural scope-enum, non-empty scope, and subject-min-length >= 15 in commitlint.config.mjs', () => {
    for (const requiredScope of [
      'ui',
      'tokens',
      'routes',
      'db',
      'i18n',
      'ci',
      'lint',
    ]) {
      expect(ARCHITECTURAL_SCOPES).toContain(requiredScope);
    }
    expect(commitlintConfig.rules['scope-empty']).toEqual([2, 'never']);
    expect(commitlintConfig.rules['subject-min-length']).toEqual([
      2,
      'always',
      15,
    ]);
    expect(commitlintConfig.rules['scope-enum'][0]).toBe(2);
    expect(commitlintConfig.rules['scope-enum'][1]).toBe('always');

    const lazyNoScope = spawnSync('pnpm', ['exec', 'commitlint'], {
      input: 'chore: fix\n',
      encoding: 'utf-8',
    });
    expect(lazyNoScope.status).not.toBe(0);

    const lazyShortSubject = spawnSync('pnpm', ['exec', 'commitlint'], {
      input: 'feat(ui): fix bug\n',
      encoding: 'utf-8',
    });
    expect(lazyShortSubject.status).not.toBe(0);

    const validArchitecturalCommit = spawnSync('pnpm', ['exec', 'commitlint'], {
      input: 'feat(tokens): synchronize solarized elevation radii\n',
      encoding: 'utf-8',
    });
    expect(validArchitecturalCommit.status).toBe(0);
  });

  it('enforces that 100% of guardian scripts and custom ESLint plugins in scripts/ are written in strict TypeScript (.ts)', () => {
    const allScriptEntries = readdirSync('scripts', { recursive: true }).filter(
      (entry): entry is string => typeof entry === 'string'
    );
    const untypedScripts = allScriptEntries.filter((entry) =>
      /\.(js|mjs|cjs)$/.test(entry)
    );
    expect(untypedScripts).toEqual([]);
  });
});

describe('TDD Staged Pre-Commit Hook', () => {
  it('blocks commits when src or scripts implementation is staged without tests', () => {
    const result = checkTddStaged(['src/components/NewFeature.tsx']);
    expect(result.pass).toBe(false);
    expect(result.stagedSrcFiles).toContain('src/components/NewFeature.tsx');

    const scriptResult = checkTddStaged(['scripts/lint-routes.ts']);
    expect(scriptResult.pass).toBe(false);
    expect(scriptResult.stagedSrcFiles).toContain('scripts/lint-routes.ts');
  });

  it('allows commits when src or scripts implementation and tests are co-staged', () => {
    const result = checkTddStaged([
      'src/components/NewFeature.tsx',
      'tests/unit/new-feature.test.ts',
    ]);
    expect(result.pass).toBe(true);

    const scriptResult = checkTddStaged([
      'scripts/lint-routes.ts',
      'tests/unit/routes.test.ts',
    ]);
    expect(scriptResult.pass).toBe(true);
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
