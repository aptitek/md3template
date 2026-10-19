import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

describe('ESLint Syntax Enforcement', () => {
  const eslint = new ESLint({ overrideConfigFile: 'eslint.config.js' });

  it('prohibits intrinsic HTML elements (<div />, <button />)', async () => {
    const code = `
export function BadComponent() {
  return <div><button type="button">Bad</button></div>;
}
`;
    const results = await eslint.lintText(code, {
      filePath: 'src/BadComponent.tsx',
    });
    const messages = results[0]?.messages.map((m) => m.message) ?? [];
    expect(messages.some((m) => /intrinsic HTML element/i.test(m))).toBe(true);
  });

  it('prohibits hardcoded text literals in JSX', async () => {
    const code = `
import { Flex } from 'styled-system/jsx';
export function TextComponent() {
  return <Flex>Unlocalized Content</Flex>;
}
`;
    const results = await eslint.lintText(code, {
      filePath: 'src/TextComponent.tsx',
    });
    const messages = results[0]?.messages.map((m) => m.message) ?? [];
    expect(
      messages.some((m) => m.includes('Raw text literal detected in JSX'))
    ).toBe(true);
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
});
