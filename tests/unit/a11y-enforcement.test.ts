import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import { a11yConfig } from '../../scripts/eslint/a11y-config.ts';
import { restrictedSyntaxRules } from '../../scripts/eslint/restricted-rules.ts';
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  SUPPORTED_LOCALES,
} from '../../src/i18n/locales.ts';
import {
  A11Y_STRINGS,
  type A11yStringKey,
  i18n,
  resolveA11yString,
} from '../../src/i18n/strings.ts';

const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [
    a11yConfig,
    {
      files: ['**/*.tsx'],
      languageOptions: {
        parser: (await import('typescript-eslint')).parser,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      rules: {
        'no-restricted-syntax': ['error', ...restrictedSyntaxRules],
      },
    },
  ],
});

async function lintSnippet(code: string): Promise<string[]> {
  const results = await eslint.lintText(code, {
    filePath: 'src/TestSnippet.tsx',
  });
  return results[0]?.messages.map((m) => `${m.ruleId}: ${m.message}`) ?? [];
}

describe('ARIA Specifications Enforcement', () => {
  it('rejects invalid ARIA attribute names', async () => {
    const errors = await lintSnippet(
      'export function Test() { return <Box aria-fakeprop="true" />; }'
    );
    expect(errors.some((e) => e.includes('jsx-a11y/aria-props'))).toBe(true);
  });

  it('rejects invalid ARIA attribute value types', async () => {
    const errors = await lintSnippet(
      'export function Test() { return <Box aria-hidden="not-a-boolean" />; }'
    );
    expect(errors.some((e) => e.includes('jsx-a11y/aria-proptypes'))).toBe(
      true
    );
  });

  it('rejects invalid or abstract ARIA roles', async () => {
    const errors = await lintSnippet(
      'export function Test() { return <Box role="fake-role" />; }'
    );
    expect(errors.some((e) => e.includes('jsx-a11y/aria-role'))).toBe(true);
  });

  it('enforces required ARIA props for roles (role="checkbox" requires aria-checked)', async () => {
    const errors = await lintSnippet(
      'export function Test() { return <Box role="checkbox" />; }'
    );
    expect(
      errors.some((e) => e.includes('jsx-a11y/role-has-required-aria-props'))
    ).toBe(true);
  });

  it('rejects unsupported ARIA attributes on defined roles', async () => {
    const errors = await lintSnippet(
      'export function Test() { return <Box role="presentation" aria-checked="true" />; }'
    );
    expect(
      errors.some((e) => e.includes('jsx-a11y/role-supports-aria-props'))
    ).toBe(true);
  });

  it('enforces associated label or aria-label on interactive controls (M3eButton)', async () => {
    const errors = await lintSnippet(
      'export function Test() { return <M3eButton variant="filled" />; }'
    );
    expect(
      errors.some((e) => e.includes('jsx-a11y/control-has-associated-label'))
    ).toBe(true);
  });
});

describe('Alt Text & i18n Accessibility Enforcement', () => {
  it('rejects hardcoded string literals in alt attribute', async () => {
    const errors = await lintSnippet(
      'export function Test() { return <Image src="/logo.png" alt="Company Logo" />; }'
    );
    expect(
      errors.some(
        (e) =>
          e.includes('no-restricted-syntax') &&
          e.includes(
            'all user-facing alt text and accessibility labels must originate from i18n content'
          )
      )
    ).toBe(true);
  });

  it('rejects hardcoded string literals in aria-label attribute', async () => {
    const errors = await lintSnippet(
      'export function Test({ text }: { text: string }) { return <M3eButton variant="filled" aria-label="Click me">{text}</M3eButton>; }'
    );
    expect(
      errors.some(
        (e) =>
          e.includes('no-restricted-syntax') &&
          e.includes(
            'all user-facing alt text and accessibility labels must originate from i18n content'
          )
      )
    ).toBe(true);
  });

  it('permits decorative empty alt="" attributes', async () => {
    const errors = await lintSnippet(
      'export function Test() { return <Image src="/bg.png" alt="" />; }'
    );
    const syntaxErrors = errors.filter((e) =>
      e.includes('no-restricted-syntax')
    );
    expect(syntaxErrors).toHaveLength(0);
  });

  it('permits localized expressions in alt and aria-label', async () => {
    const errors = await lintSnippet(
      'export function Test({ label, altText }: { label: string; altText: string }) { return <M3eButton variant="filled" aria-label={label}><Image src="/icon.png" alt={altText} /></M3eButton>; }'
    );
    expect(errors).toHaveLength(0);
  });
});

describe('Localized Accessibility Strings (i18n)', () => {
  it('validates supported locales and default locale', () => {
    expect(DEFAULT_LOCALE).toBe('en');
    expect(isSupportedLocale('en')).toBe(true);
    expect(isSupportedLocale('fr')).toBe(true);
    expect(isSupportedLocale('es')).toBe(false);
  });

  it('provides all accessibility keys across all supported locales', () => {
    const requiredKeys: readonly A11yStringKey[] = [
      'appMain',
      'appTitle',
      'appDescription',
      'errorTitle',
      'notFoundTitle',
      'notFoundDetails',
      'unexpectedErrorDetails',
    ];

    for (const loc of SUPPORTED_LOCALES) {
      for (const key of requiredKeys) {
        const resolved = resolveA11yString(loc, key);
        expect(resolved.length).toBeGreaterThan(0);
      }
    }
  });

  it('falls back to default locale for unknown locales and initializes i18next instance', () => {
    expect(i18n.isInitialized).toBe(true);
    const fallback = resolveA11yString('unknown', 'appMain');
    expect(fallback).toBe(A11Y_STRINGS.en.appMain);
  });
});
