/**
 * Material Design 3 CSS Token & Native Preservation Plugin
 * Enforces native component preservation, forbids unscoped overrides,
 * eliminates CSS anti-patterns (!important, transition: all, raw colors),
 * and bans Tailwind directives.
 */
import type { ESLint } from 'eslint';
import {
  ALLOWED_COLOR_IDS,
  checkRuleSelectors,
  checkThemeChildNode,
  COLOR_FUNCS,
  COLOR_PROPS,
  type CssAstNode,
  type CssRuleContext,
  getDeclarationValueChildren,
  getNodeName,
  isColorProperty,
  isOverrideSelector,
  isUniversalSelector,
} from './css-tokens-helpers.ts';

const TRANSITION_PROPS: ReadonlySet<string> = new Set([
  'transition',
  'transition-property',
]);

function hasAllIdentifier(node: CssAstNode): boolean {
  return getDeclarationValueChildren(node).some(
    (c) => c.type === 'Identifier' && getNodeName(c).toLowerCase() === 'all'
  );
}

function checkTransitionDeclaration(
  node: CssAstNode,
  currentRuleIsUniversal: boolean,
  context: CssRuleContext
): void {
  const prop = node.property?.toLowerCase() ?? '';
  if (TRANSITION_PROPS.has(prop)) {
    if (currentRuleIsUniversal) {
      context.report({ node, messageId: 'noUniversalTransition' });
    }
    if (hasAllIdentifier(node)) {
      context.report({ node, messageId: 'noTransitionAll' });
    }
    return;
  }
  if (prop === 'animation' && currentRuleIsUniversal) {
    context.report({ node, messageId: 'noUniversalTransition' });
  }
}

function checkRawColorDeclaration(
  node: CssAstNode,
  context: CssRuleContext
): void {
  const prop = node.property?.toLowerCase() ?? '';
  if (!COLOR_PROPS.has(prop)) return;
  for (const child of getDeclarationValueChildren(node)) {
    const idName = getNodeName(child);
    if (
      child.type === 'Identifier' &&
      !ALLOWED_COLOR_IDS.has(idName.toLowerCase())
    ) {
      context.report({
        node: child,
        messageId: 'noRawColor',
        data: { value: idName },
      });
    }
  }
}

export const cssTokensPlugin = {
  meta: { name: 'eslint-plugin-css-tokens' },
  rules: {
    'no-unscoped-component-override': {
      meta: {
        type: 'problem',
        messages: {
          unscopedComponent:
            'Direct override of native component "<{{name}}>" is forbidden. Let native MD3 styles shine through, or scope with "[data-override]" or ".override-*".',
          unscopedPart:
            'Direct override of component shadow part "::part({{name}})" is forbidden. Scope with "[data-override]" or ".override-*".',
        },
      },
      create(context: CssRuleContext) {
        return {
          Rule(node: CssAstNode) {
            checkRuleSelectors(node, context);
          },
        };
      },
    },
    'no-scoped-important': {
      meta: {
        type: 'problem',
        messages: {
          noImportant:
            'Anti-pattern "!important" is forbidden. Component styles must shine through without brute-force overrides. Overrides must be explicitly scoped via "[data-override]" or ".override-*".',
        },
      },
      create(context: CssRuleContext) {
        let currentRuleHasOverride = false;
        return {
          Rule(node: CssAstNode) {
            currentRuleHasOverride =
              node.prelude?.children?.some(isOverrideSelector) ?? false;
          },
          'Rule:exit'() {
            currentRuleHasOverride = false;
          },
          Declaration(node: CssAstNode) {
            if (node.important && !currentRuleHasOverride) {
              context.report({ node, messageId: 'noImportant' });
            }
          },
        };
      },
    },
    'no-raw-colors': {
      meta: {
        type: 'problem',
        messages: {
          noRawColor:
            'Raw color "{{value}}" detected in CSS. Use design tokens or CSS custom properties (var(--...)) instead.',
        },
      },
      create(context: CssRuleContext) {
        return {
          Hash(node: CssAstNode) {
            const val = typeof node.value === 'string' ? node.value : '';
            context.report({
              node,
              messageId: 'noRawColor',
              data: { value: `#${val}` },
            });
          },
          Function(node: CssAstNode) {
            const fnName = getNodeName(node);
            if (COLOR_FUNCS.has(fnName.toLowerCase())) {
              context.report({
                node,
                messageId: 'noRawColor',
                data: { value: `${fnName}(...)` },
              });
            }
          },
          Declaration(node: CssAstNode) {
            checkRawColorDeclaration(node, context);
          },
        };
      },
    },
    'no-unperformant-transitions': {
      meta: {
        type: 'problem',
        messages: {
          noTransitionAll:
            'Anti-pattern "transition: all" detected. Explicitly list animated properties (e.g. opacity, transform) to prevent layout thrashing.',
          noUniversalTransition:
            'Universal selector "*" cannot have transitions or animations. This degrades rendering performance and triggers layout thrashing.',
        },
      },
      create(context: CssRuleContext) {
        let currentRuleIsUniversal = false;
        return {
          Rule(node: CssAstNode) {
            currentRuleIsUniversal =
              node.prelude?.children?.some(isUniversalSelector) ?? false;
          },
          'Rule:exit'() {
            currentRuleIsUniversal = false;
          },
          Declaration(node: CssAstNode) {
            checkTransitionDeclaration(node, currentRuleIsUniversal, context);
          },
        };
      },
    },
    'no-raw-font-family': {
      meta: {
        type: 'problem',
        messages: {
          noRawFont:
            'Raw font-family "{{value}}" detected. Use design tokens (var(--font-family-*)) instead.',
        },
      },
      create(context: CssRuleContext) {
        return {
          Declaration(node: CssAstNode) {
            const prop = node.property?.toLowerCase() ?? '';
            if (prop !== 'font-family' || !node.value) return;
            const text = context.sourceCode
              .getText(node.value as object)
              .trim();
            if (
              !text.includes('var(') &&
              !['inherit', 'initial', 'unset', 'system-ui'].includes(text)
            ) {
              context.report({
                node,
                messageId: 'noRawFont',
                data: { value: text },
              });
            }
          },
        };
      },
    },
    'no-tailwind-directives': {
      meta: {
        type: 'problem',
        messages: {
          noTailwind:
            'Tailwind directive "@{{name}}" is forbidden. This project enforces Panda CSS and Material Design 3 tokens.',
          noTailwindImport:
            'Importing Tailwind CSS is forbidden. This project enforces Panda CSS and Material Design 3 tokens.',
        },
      },
      create(context: CssRuleContext) {
        return {
          Atrule(node: CssAstNode) {
            const name = getNodeName(node).toLowerCase();
            if (name === 'theme' || name === 'apply') {
              context.report({ node, messageId: 'noTailwind', data: { name } });
            } else if (name === 'import' && node.prelude) {
              const text = context.sourceCode.getText(node.prelude);
              if (/tailwind/i.test(text)) {
                context.report({ node, messageId: 'noTailwindImport' });
              }
            }
          },
        };
      },
    },
    'enforce-theme': {
      meta: {
        type: 'problem',
        messages: {
          invalidThemeColor:
            'Color "{{value}}" does not conform to the theme system. Use pure Solarized theme variables (var(--theme-*), var(--colors-*), var(--md-sys-color-*), var(--m3e-*)) or allowed keywords (transparent, currentColor, inherit).',
          rawColorFallback:
            'Raw color fallback "{{value}}" detected inside theme variable. Remove raw fallbacks to ensure 100% pure Solarized theme adherence.',
        },
      },
      create(context: CssRuleContext) {
        return {
          Declaration(node: CssAstNode) {
            const prop = node.property?.toLowerCase();
            if (!prop || !isColorProperty(prop)) return;
            for (const child of getDeclarationValueChildren(node)) {
              checkThemeChildNode(child, prop, context);
            }
          },
        };
      },
    },
  },
} as unknown as ESLint.Plugin;
