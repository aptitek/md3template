import { resolve } from 'node:path';
import { ESLint } from 'eslint';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  hasExportedComponent,
  isComponentFile,
  isIgnored,
  validateStorybookCoverage,
  validateStoryFile,
  validateStorySource,
} from '../../scripts/lint-storybook-coverage.mjs';

describe('Storybook Coverage & Strict CSF3 Format Enforcement', () => {
  const eslint = new ESLint({ overrideConfigFile: 'eslint.config.js' });

  it('validates that 100% of repository components have valid CSF3 Storybook stories', () => {
    const { errors, verified, componentFiles } = validateStorybookCoverage();
    expect(errors).toHaveLength(0);
    expect(componentFiles.length).toBeGreaterThanOrEqual(2);
    expect(verified.length).toBe(componentFiles.length);

    const componentNames = verified.map((v) => v.component);
    expect(componentNames).toContain('src/root.tsx');
    expect(componentNames).toContain('src/routes/home.tsx');
  });

  it('correctly identifies React component files vs non-component files, including separate export { MyView } clauses', () => {
    expect(isComponentFile(resolve('src/root.tsx'))).toBe(true);
    expect(isComponentFile(resolve('src/routes/home.tsx'))).toBe(true);
    expect(isComponentFile(resolve('src/worker.ts'))).toBe(false);
    expect(isComponentFile(resolve('src/tokens/md3.ts'))).toBe(false);

    const separateExportAst = ts.createSourceFile(
      'MyView.tsx',
      'function MyView() { return null; } export { MyView };',
      ts.ScriptTarget.Latest,
      true
    );
    expect(hasExportedComponent(separateExportAst)).toBe(true);
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

  it('rejects legacy storiesOf() CSF0 format, Template.bind({}) CSF2 format, and CSF1/2 function stories', () => {
    const csf0 = validateStorySource(
      `storiesOf('Button', module).add('Primary', () => <div />);`
    );
    expect(csf0.valid).toBe(false);
    expect(csf0.error).toContain('storiesOf()');

    const csf2Bind = validateStorySource(`
      const meta = { component: Comp };
      export default meta;
      const Template = (args) => <Comp {...args} />;
      export const Primary = Template.bind({});
    `);
    expect(csf2Bind.valid).toBe(false);
    expect(csf2Bind.error).toContain('Template.bind');

    const csf1Function = validateStorySource(`
      const meta = { component: Comp };
      export default meta;
      export const Primary = () => <Comp />;
    `);
    expect(csf1Function.valid).toBe(false);
    expect(csf1Function.error).toContain('CSF1/CSF2 function format');

    const missingComponentMeta = validateStorySource(`
      const meta = { title: 'MissingComponent' };
      export default meta;
      export const Primary = {};
    `);
    expect(missingComponentMeta.valid).toBe(false);
    expect(missingComponentMeta.error).toContain('component');
  });

  it('enforces CSF3 rules in ESLint for *.stories.tsx files', async () => {
    const badStory = `
const Template = () => null;
export const LegacyBound = Template.bind({});
export const LegacyArrow = () => null;
`;
    const results = await eslint.lintText(badStory, {
      filePath: 'src/components/Bad.stories.tsx',
    });
    const messages = results[0]?.messages.map((m) => m.message) ?? [];
    expect(messages.some((m) => m.includes('Template.bind'))).toBe(true);
    expect(messages.some((m) => m.includes('CSF1/CSF2 function stories'))).toBe(
      true
    );
  });
});
