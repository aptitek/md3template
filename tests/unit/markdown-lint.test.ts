import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateMarkdownContent } from '../../scripts/lint-markdown-structure.mjs';

describe('Markdown Fenced Divs & Depth-Matched Colons', () => {
  it('accepts single-level and multi-level depth-matched fenced divs', () => {
    const validMarkdown = `
# System Architecture

::: callout-primary
Root level container opened with 3 colons.

:::: nested-note
Nested level 2 container opened with 4 colons.

::::: deep-alert
Nested level 3 container opened with 5 colons.
:::::

::::

:::
`;
    const errors = validateMarkdownContent(validMarkdown, 'valid.md');
    expect(errors).toHaveLength(0);
  });

  it('rejects mismatched opening colon count for nested depth', () => {
    const invalidOpenMarkdown = `
::: outer
::: inner-should-be-4-colons
:::
:::
`;
    const errors = validateMarkdownContent(invalidOpenMarkdown, 'bad-open.md');
    expect(errors.some((e) => e.includes('must use 4 colons'))).toBe(true);
  });

  it('rejects mismatched closing colon count', () => {
    const invalidCloseMarkdown = `
::: outer
:::: inner
:::
:::
`;
    const errors = validateMarkdownContent(
      invalidCloseMarkdown,
      'bad-close.md'
    );
    expect(errors.some((e) => e.includes('Mismatched closing fence'))).toBe(
      true
    );
  });
});

describe('Markdown Code Fences & Div Closure', () => {
  it('detects unclosed code blocks before EOF', () => {
    const unclosedCode = `
# Unclosed Code Block

\`\`\`typescript
const forbidden = true;
`;
    const errors = validateMarkdownContent(unclosedCode, 'unclosed-code.md');
    expect(errors.some((e) => e.includes('Unclosed code block'))).toBe(true);
  });

  it('detects unclosed fenced divs before EOF', () => {
    const unclosedDiv = `
# Unclosed Div

::: info
Some information that is never closed.
`;
    const errors = validateMarkdownContent(unclosedDiv, 'unclosed-div.md');
    expect(errors.some((e) => e.includes('Unclosed fenced div'))).toBe(true);
  });
});

describe('Pure Markdown Mandate (Zero Raw HTML)', () => {
  it('rejects raw HTML tags outside code blocks', () => {
    const rawHtml = `
# Document

<div>Raw HTML div is forbidden</div>
<span class="bad">Raw span is forbidden</span>
`;
    const errors = validateMarkdownContent(rawHtml, 'raw-html.md');
    expect(errors.some((e) => e.includes("Raw HTML tag '<div>'"))).toBe(true);
    expect(
      errors.some((e) => e.includes('Raw HTML tag \'<span class="bad">\''))
    ).toBe(true);
  });

  it('permits HTML inside fenced code blocks and inline backticks', () => {
    const codeWithHtml = `
# Documentation

Use the \`<div>\` or \`<span>\` elements in HTML.

\`\`\`html
<div class="demo">
  <span>Valid in code block</span>
</div>
\`\`\`
`;
    const errors = validateMarkdownContent(codeWithHtml, 'allowed-html.md');
    expect(errors).toHaveLength(0);
  });

  it('validates that production README.md passes all structural rules', () => {
    const content = readFileSync('README.md', 'utf-8');
    const errors = validateMarkdownContent(content, 'README.md');
    expect(errors).toHaveLength(0);
  });
});
