import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

describe('ESLint Syntax Enforcement', () => {
  const eslint = new ESLint({ overrideConfigFile: 'eslint.config.js' });

  it('prohibits intrinsic HTML elements (<div />, <button />), generic <panda.*>, and aliased <p.*>, while allowing <md-*> and <m3e-*> custom elements', async () => {
    const code = `
import { panda, panda as p } from 'styled-system/jsx';
export function BadComponent({ text }: { readonly text: string }) {
  return (
    <div>
      <button type="button">{text}</button>
      <panda.div />
      <panda.span />
      <panda.button />
      <panda.meta />
      <p.div />
      <p.section />
      <md-filled-button aria-label={text}>{text}</md-filled-button>
      <m3e-card>{text}</m3e-card>
    </div>
  );
}
`;
    const results = await eslint.lintText(code, {
      filePath: 'src/BadComponent.tsx',
    });
    const messages = results[0]?.messages.map((m) => m.message) ?? [];
    expect(messages.some((m) => /intrinsic HTML element/i.test(m))).toBe(true);
    expect(
      messages.some(
        (m) => m.includes('md-filled-button') || m.includes('m3e-card')
      )
    ).toBe(false);
    expect(
      messages.filter((m) =>
        m.includes('Direct usage of generic <panda.*> HTML')
      )
    ).toHaveLength(5);
    expect(
      messages.some((m) =>
        m.includes('Aliased or non-panda JSX member expressions')
      )
    ).toBe(true);
  });

  it('prohibits hardcoded text literals, template literals, string expressions, and local prose/UI variables in JSX', async () => {
    const code = `
import { Flex } from 'styled-system/jsx';
export function TextComponent({ name }: { readonly name: string }) {
  const bypassText = 'Mon texte en dur';
  const label = 'Submit';
  return (
    <Flex>
      Unlocalized Content
      {\`Texte en dur\`}
      {bypassText}
      {label}
      {'Hello ' + name}
      {String('Inline')}
    </Flex>
  );
}
`;
    const results = await eslint.lintText(code, {
      filePath: 'src/TextComponent.tsx',
    });
    const messages = results[0]?.messages.map((m) => m.message) ?? [];
    expect(
      messages.some((m) => m.includes('Raw text literal detected in JSX'))
    ).toBe(true);
    expect(
      messages.some((m) =>
        m.includes('Hardcoded template literal in JSX is prohibited')
      )
    ).toBe(true);
    expect(
      messages.some((m) =>
        m.includes(
          'Hardcoded prose string assigned to a variable inside a function is prohibited'
        )
      )
    ).toBe(true);
    expect(
      messages.some((m) =>
        m.includes(
          'Hardcoded UI string assigned to a local variable inside a function is prohibited'
        )
      )
    ).toBe(true);
    expect(
      messages.filter((m) =>
        m.includes(
          'Hardcoded string literal inside JSX expression (concatenation, array, or String() call) is prohibited'
        )
      )
    ).toHaveLength(2);
  });

  it('prohibits legacy wildcard barrel exports (export * from)', async () => {
    const code = `export * from './root.tsx';\n`;
    const results = await eslint.lintText(code, { filePath: 'src/index.ts' });
    const messages = results[0]?.messages.map((m) => m.message) ?? [];
    expect(
      messages.some((m) => m.includes('Legacy wildcard barrel exports'))
    ).toBe(true);
  });

  it('prohibits thin wrapper component declarations', async () => {
    const code = `
import { Box } from 'styled-system/jsx';
export const ButtonWrapper = (props: Record<string, unknown>) => <Box {...props} />;
`;
    const results = await eslint.lintText(code, {
      filePath: 'src/ButtonWrapper.tsx',
    });
    const messages = results[0]?.messages.map((m) => m.message) ?? [];
    expect(messages.some((m) => m.includes('thin wrapper components'))).toBe(
      true
    );
  });

  it('prohibits eslint-disable comments, skipped tests, and hollow tests without expect() in src/ and tests/', async () => {
    const srcResults = await eslint.lintText(
      '/* eslint-disable */\nexport const val = 1;\n',
      { filePath: 'src/tokens/val.ts' }
    );
    const srcRuleIds = srcResults[0]?.messages.map((m) => m.ruleId) ?? [];
    expect(srcRuleIds).toContain('@eslint-community/eslint-comments/no-use');

    const testResults = await eslint.lintText(
      `// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { it } from 'vitest';
it.skip('skipped test', () => {});
it('hollow coverage-gaming test', () => {
  const x = 1 + 1;
  return x;
});
`,
      { filePath: 'tests/unit/sample.test.ts' }
    );
    const testMessages = testResults[0]?.messages.map((m) => m.message) ?? [];
    const testRuleIds = testResults[0]?.messages.map((m) => m.ruleId) ?? [];
    expect(testRuleIds).toContain('@eslint-community/eslint-comments/no-use');
    expect(
      testMessages.some((m) => m.includes('Skipped, focused, or todo tests'))
    ).toBe(true);
    expect(
      testMessages.some((m) =>
        m.includes('Test block lacks any expect() assertion')
      )
    ).toBe(true);
  });
});

describe('Content Purity Enforcement', () => {
  it('detects and rejects styling in MDX content files', () => {
    const tempMdxPath = resolve(
      process.cwd(),
      'node_modules/.cache/temp-violation.mdx'
    );
    mkdirSync(dirname(tempMdxPath), { recursive: true });
    writeFileSync(
      tempMdxPath,
      '# Title\n\n<div className="styled">Content</div>\n'
    );

    try {
      expect(() => {
        execSync(`node scripts/lint-mdx-purity.mjs ${tempMdxPath}`, {
          stdio: 'pipe',
        });
      }).toThrow();
    } finally {
      if (existsSync(tempMdxPath)) {
        unlinkSync(tempMdxPath);
      }
    }
  });
});

describe('MUI Deprecation & Token Enforcement', () => {
  const eslint = new ESLint({ overrideConfigFile: 'eslint.config.js' });

  it('rejects deprecated MUI, Emotion, and Tailwind imports', async () => {
    const code = `
import { Button } from '@mui/material';
import styled from '@emotion/styled';
import tailwindcss from '@tailwindcss/vite';
export { Button, styled, tailwindcss };
`;
    const results = await eslint.lintText(code, {
      filePath: 'src/MuiComponent.tsx',
    });
    const messages = results[0]?.messages.map((m) => m.message) ?? [];
    expect(messages.some((m) => m.includes('MUI is deprecated'))).toBe(true);
    expect(messages.some((m) => m.includes('Emotion is prohibited'))).toBe(
      true
    );
    expect(messages.some((m) => m.includes('Tailwind CSS is disallowed'))).toBe(
      true
    );
  });

  it('prohibits inline style attributes', async () => {
    const code = `
import { Flex } from 'styled-system/jsx';
export function StyledComp() {
  return <Flex style={{ padding: 10 }} />;
}
`;
    const results = await eslint.lintText(code, {
      filePath: 'src/StyledComp.tsx',
    });
    const messages = results[0]?.messages.map((m) => m.message) ?? [];
    expect(
      messages.some((m) =>
        m.includes('Inline `style` attributes are prohibited')
      )
    ).toBe(true);
  });

  it('prohibits hardcoded colors outside token variables', async () => {
    const code = `
export const badStyles = { color: '#ff00aa' };
`;
    const results = await eslint.lintText(code, {
      filePath: 'src/badStyles.ts',
    });
    const messages = results[0]?.messages.map((m) => m.message) ?? [];
    expect(messages.some((m) => m.includes('Hardcoded color'))).toBe(true);
  });

  it('enforces downward-only Atomic Design hierarchy via eslint-plugin-atomic-design', async () => {
    const code = `
import { ErrorBoundaryView } from '../components/error-boundary.tsx';
export { ErrorBoundaryView };
`;
    const results = await eslint.lintText(code, {
      filePath: 'src/tokens/badToken.ts',
    });
    const ruleIds = results[0]?.messages.map((m) => m.ruleId) ?? [];
    expect(ruleIds).toContain('atomic-design/hierarchical-import');
  });

  it('enforces Panda CSS recipes over conditional style props, >3 inline style props, JSXSpreadAttribute, css={{ ... }} / css() abuse, styled-system/patterns imports, and incomplete recipe configs', async () => {
    const code = `
import { css, cva, sva } from 'styled-system/css';
import { Box, Grid, HStack } from 'styled-system/jsx';
import { flex } from 'styled-system/patterns';

export const badCva = cva({
  base: { bg: 'surface' },
  variants: { tone: { primary: { bg: 'primary' } } },
});

export const badSva = sva({
  slots: ['root', 'orphanSlot'],
  base: { root: { padding: '4' } },
  variants: { size: { sm: { root: { padding: '2' } } } },
  defaultVariants: { size: 'sm' },
});

export function BadInlineStyles({
  active,
  extraProps,
}: {
  readonly active: boolean;
  readonly extraProps: Record<string, unknown>;
}) {
  const inlineClass = css({
    padding: '4',
    margin: '2',
    bg: active ? 'primary' : 'surface',
    color: 'onSurface',
  });
  return (
    <Grid
      className={flex()}
      padding="4"
      margin="2"
      bg={active ? 'primary' : 'surface'}
      color="onSurface"
    >
      <HStack className={inlineClass} {...extraProps} />
      <Box
        css={{
          padding: '4',
          margin: '2',
          bg: active ? 'primary' : 'surface',
          color: 'onSurface',
        }}
      />
    </Grid>
  );
}
`;
    const results = await eslint.lintText(code, {
      filePath: 'src/BadRecipeComp.tsx',
    });
    const messages = results[0]?.messages.map((m) => m.message) ?? [];
    expect(
      messages.some((m) =>
        m.includes(
          'Importing pattern functions from styled-system/patterns is prohibited'
        )
      )
    ).toBe(true);
    expect(
      messages.some((m) =>
        m.includes("defines 'variants' without 'defaultVariants'")
      )
    ).toBe(true);
    expect(
      messages.some((m) =>
        m.includes("Slot 'orphanSlot' in slot recipe has no styles")
      )
    ).toBe(true);
    expect(
      messages.some((m) =>
        m.includes("Conditional expression in style prop 'bg' is forbidden")
      )
    ).toBe(true);
    expect(
      messages.filter((m) =>
        m.includes("Conditional expression in style prop 'css.bg' is forbidden")
      )
    ).toHaveLength(2);
    expect(
      messages.some((m) =>
        m.includes('JSX spread attributes are forbidden on Panda layout')
      )
    ).toBe(true);
    expect(
      messages.filter((m) => m.includes('JSX element has 4 inline style props'))
    ).toHaveLength(3);
  });
});
