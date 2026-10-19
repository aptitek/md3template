import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ overrideConfigFile: 'eslint.config.js' });

describe('CSS Component Overrides', () => {
  it('rejects direct unscoped overrides of native MD3 components', async () => {
    const code = `
m3e-button {
  color: var(--theme-primary);
}
m3e-card::part(container) {
  padding: var(--spacing-sm);
}
`;
    const results = await eslint.lintText(code, { filePath: 'src/bad.css' });
    const msgs = results[0]?.messages.map((m) => m.message) ?? [];
    expect(
      msgs.some((m) =>
        m.includes('Direct override of native component "<m3e-button>"')
      )
    ).toBe(true);
    expect(
      msgs.some((m) =>
        m.includes(
          'Direct override of component shadow part "::part(container)"'
        )
      )
    ).toBe(true);
  });

  it('allows native component overrides when explicitly scoped', async () => {
    const code = `
.override-btn m3e-button {
  color: var(--theme-primary);
}
m3e-button[data-override] {
  color: var(--theme-primary);
}
.override-card m3e-card::part(container) {
  padding: var(--spacing-sm);
}
`;
    const results = await eslint.lintText(code, {
      filePath: 'src/good-override.css',
    });
    const msgs =
      results[0]?.messages.filter((m) => m.ruleId?.startsWith('css-tokens/')) ??
      [];
    expect(msgs).toHaveLength(0);
  });
});

describe('CSS Important Flag Overrides', () => {
  it('rejects !important unless explicitly scoped under override selectors', async () => {
    const badCode = `\n.normal-rule { color: var(--theme-primary) !important; }\n`;
    const badResults = await eslint.lintText(badCode, {
      filePath: 'src/bad-important.css',
    });
    const badMsgs = badResults[0]?.messages.map((m) => m.message) ?? [];
    expect(
      badMsgs.some((m) => m.includes('Anti-pattern "!important" is forbidden'))
    ).toBe(true);

    const goodCode = `\n.override-alert { color: var(--theme-primary) !important; }\n`;
    const goodResults = await eslint.lintText(goodCode, {
      filePath: 'src/good-important.css',
    });
    const goodMsgs =
      goodResults[0]?.messages.filter(
        (m) => m.ruleId === 'css-tokens/no-scoped-important'
      ) ?? [];
    expect(goodMsgs).toHaveLength(0);
  });
});

describe('CSS Color & Transition Anti-Patterns', () => {
  it('rejects raw colors and enforces tokens', async () => {
    const code = `
.box {
  color: #ff0055;
  background-color: rgb(255, 0, 0);
  border-color: red;
}
`;
    const results = await eslint.lintText(code, { filePath: 'src/colors.css' });
    const msgs = results[0]?.messages.map((m) => m.message) ?? [];
    expect(msgs.some((m) => m.includes('Raw color "#ff0055"'))).toBe(true);
    expect(msgs.some((m) => m.includes('Raw color "rgb(...)"'))).toBe(true);
    expect(msgs.some((m) => m.includes('Raw color "red"'))).toBe(true);
  });

  it('rejects transition: all and universal transitions', async () => {
    const code = `
.bad-trans {
  transition: all 200ms ease;
}
* {
  transition: opacity 200ms ease;
}
`;
    const results = await eslint.lintText(code, {
      filePath: 'src/transitions.css',
    });
    const msgs = results[0]?.messages.map((m) => m.message) ?? [];
    expect(msgs.some((m) => m.includes('Anti-pattern "transition: all"'))).toBe(
      true
    );
    expect(
      msgs.some((m) =>
        m.includes('Universal selector "*" cannot have transitions')
      )
    ).toBe(true);
  });
});

describe('CSS Directives & Production Styles', () => {
  it('rejects Tailwind CSS directives', async () => {
    const code = `
@theme {
  --color-primary: red;
}
.box {
  @apply flex;
}
@import "tailwindcss";
`;
    const results = await eslint.lintText(code, {
      filePath: 'src/tailwind.css',
    });
    const msgs = results[0]?.messages.map((m) => m.message) ?? [];
    expect(msgs.some((m) => m.includes('Tailwind directive "@theme"'))).toBe(
      true
    );
    expect(msgs.some((m) => m.includes('Tailwind directive "@apply"'))).toBe(
      true
    );
    expect(
      msgs.some((m) => m.includes('Importing Tailwind CSS is forbidden'))
    ).toBe(true);
  });

  it('validates that production src/index.css passes cleanly', async () => {
    const results = await eslint.lintFiles(['src/index.css']);
    const msgs = results[0]?.messages ?? [];
    expect(msgs).toHaveLength(0);
  });
});

describe('CSS Theme Enforcement', () => {
  it('enforces theme variables and forbids raw color fallbacks via enforce-theme', async () => {
    const badCode = `
.bad-theme-box {
  color: var(--custom-unknown-color);
  background-color: var(--theme-primary, #859900);
}
`;
    const badResults = await eslint.lintText(badCode, {
      filePath: 'src/bad-theme.css',
    });
    const badMsgs = badResults[0]?.messages.map((m) => m.message) ?? [];
    expect(
      badMsgs.some((m) =>
        m.includes(
          'Color "--custom-unknown-color" does not conform to the theme system'
        )
      )
    ).toBe(true);
    expect(
      badMsgs.some((m) =>
        m.includes(
          'Raw color fallback "#859900" detected inside theme variable'
        )
      )
    ).toBe(true);

    const goodCode = `
.good-theme-box {
  color: var(--theme-on-surface);
  background-color: var(--colors-surface);
  border-color: var(--theme-outline);
}
`;
    const goodResults = await eslint.lintText(goodCode, {
      filePath: 'src/good-theme.css',
    });
    const goodMsgs =
      goodResults[0]?.messages.filter(
        (m) => m.ruleId === 'css-tokens/enforce-theme'
      ) ?? [];
    expect(goodMsgs).toHaveLength(0);
  });
});
