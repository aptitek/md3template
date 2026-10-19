import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  isComponentFile,
  isIgnored,
  validateStorybookCoverage,
  validateStoryFile,
} from '../../scripts/lint-storybook-coverage.mjs';

describe('Storybook Coverage Enforcement', () => {
  it('validates that 100% of repository components have valid Storybook stories', () => {
    const { errors, verified, componentFiles } = validateStorybookCoverage();
    expect(errors).toHaveLength(0);
    expect(componentFiles.length).toBeGreaterThanOrEqual(2);
    expect(verified.length).toBe(componentFiles.length);

    const componentNames = verified.map((v) => v.component);
    expect(componentNames).toContain('src/root.tsx');
    expect(componentNames).toContain('src/routes/home.tsx');
  });

  it('correctly identifies React component files vs non-component files', () => {
    expect(isComponentFile(resolve('src/root.tsx'))).toBe(true);
    expect(isComponentFile(resolve('src/routes/home.tsx'))).toBe(true);
    expect(isComponentFile(resolve('src/worker.ts'))).toBe(false);
    expect(isComponentFile(resolve('src/tokens/md3.ts'))).toBe(false);
  });

  it('filters out ignored paths like main, stories, tests, and d.ts', () => {
    expect(isIgnored('src/main.tsx')).toBe(true);
    expect(isIgnored('src/root.stories.tsx')).toBe(true);
    expect(isIgnored('src/root.test.tsx')).toBe(true);
    expect(isIgnored('src/types/mdx.d.ts')).toBe(true);
    expect(isIgnored('src/root.tsx')).toBe(false);
    expect(isIgnored('src/routes/home.tsx')).toBe(false);
  });

  it('validates CSF3 structure on real stories', () => {
    const rootStory = validateStoryFile(resolve('src/root.stories.tsx'));
    expect(rootStory.valid).toBe(true);
    expect(rootStory.namedStories).toContain('Default');

    const homeStory = validateStoryFile(resolve('src/routes/home.stories.tsx'));
    expect(homeStory.valid).toBe(true);
    expect(homeStory.namedStories).toContain('English');
    expect(homeStory.namedStories).toContain('French');
  });

  it('detects failure when story file does not exist', () => {
    const result = validateStoryFile(resolve('src/NonExistent.stories.tsx'));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/does not exist/);
  });
});
