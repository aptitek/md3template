/**
 * Material Design 3 CSS Token & Native Preservation Plugin
 * Enforces native component preservation, forbids unscoped overrides,
 * eliminates CSS anti-patterns (!important, transition: all, raw colors),
 * and bans Tailwind directives.
 */

const COLOR_FUNCS = new Set([
  'rgb',
  'rgba',
  'hsl',
  'hsla',
  'hwb',
  'lab',
  'lch',
  'oklab',
  'oklch',
  'color',
]);

const COLOR_PROPS = new Set([
  'color',
  'background-color',
  'border-color',
  'outline-color',
  'fill',
  'stroke',
]);

const ALLOWED_COLOR_IDS = new Set([
  'transparent',
  'currentcolor',
  'inherit',
  'initial',
  'unset',
  'none',
]);

function isOverrideSelector(selector) {
  if (!selector?.children) return false;
  return selector.children.some((child) => {
    if (child.type === 'ClassSelector') {
      const n = child.name;
      return (
        n === 'override' || n.startsWith('override-') || n.endsWith('-override')
      );
    }
    if (child.type === 'AttributeSelector') {
      const attr = child.name?.name || child.name;
      return attr === 'data-override' || attr === 'override';
    }
    return false;
  });
}

function isNativeComponent(name) {
  return (
    typeof name === 'string' &&
    (name.startsWith('m3e-') || name.startsWith('md-'))
  );
}

function checkRuleSelectors(node, context) {
  if (!node.prelude?.children) return;
  for (const selector of node.prelude.children) {
    if (selector.type !== 'Selector' || isOverrideSelector(selector)) continue;
    for (const child of selector.children || []) {
      if (child.type === 'TypeSelector' && isNativeComponent(child.name)) {
        context.report({
          node: child,
          messageId: 'unscopedComponent',
          data: { name: child.name },
        });
      } else if (
        child.type === 'PseudoElementSelector' &&
        child.name === 'part'
      ) {
        const partName = child.children?.[0]?.value || 'unknown';
        context.report({
          node: child,
          messageId: 'unscopedPart',
          data: { name: partName.trim() },
        });
      }
    }
  }
}

function isUniversalSelector(selector) {
  return selector.children?.some(
    (c) => c.type === 'TypeSelector' && c.name === '*'
  );
}

const THEME_TOKEN_PREFIXES = [
  '--theme-',
  '--colors-',
  '--md-sys-color-',
  '--m3e-',
  '--fancy-switch-',
  '--switch-',
  '--vertical-nav-bar-',
  '--vertical-app-bar-',
  '--map-pin-',
  '--ticker-',
  '--print-page-',
  '--shape-',
  '--number-picker-',
  '--email-field-',
  '--segmented-chip-',
  '--pill-chip-',
  '--hold-button-',
  '--hold-',
  '--mesh-',
  '--holo-',
  '--aurora-',
  '--color-',
  '--social-',
  '--shadows-',
];

function isThemeTokenVar(varName) {
  return THEME_TOKEN_PREFIXES.some((prefix) => varName.startsWith(prefix));
}

function checkThemeFunctionNode(child, prop, context) {
  const funcName = child.name?.toLowerCase();
  if (COLOR_FUNCS.has(funcName)) {
    context.report({
      node: child,
      messageId: 'invalidThemeColor',
      data: { value: `${child.name}(...)` },
    });
    return;
  }
  if (funcName !== 'var') return;
  const varText = context.sourceCode.getText(child);
  const varMatch = varText.match(
    /^var\(\s*(--[a-zA-Z0-9_-]+)(?:\s*,\s*([^)]+))?\s*\)/
  );
  if (!varMatch) return;
  const varName = varMatch[1];
  const fallback = varMatch[2]?.trim();
  if (
    !isThemeTokenVar(varName) &&
    (COLOR_PROPS.has(prop) || prop.endsWith('-color'))
  ) {
    context.report({
      node: child,
      messageId: 'invalidThemeColor',
      data: { value: varName },
    });
  }
  if (fallback && (fallback.startsWith('#') || /^(rgb|hsl)/i.test(fallback))) {
    context.report({
      node: child,
      messageId: 'rawColorFallback',
      data: { value: fallback },
    });
  }
}

function isColorProperty(prop) {
  return (
    COLOR_PROPS.has(prop) ||
    prop.endsWith('-color') ||
    prop.startsWith('border') ||
    prop.startsWith('outline') ||
    prop === 'box-shadow' ||
    prop === 'background'
  );
}

export const cssTokensPlugin = {
  meta: { name: 'eslint-plugin-css-tokens' },
  rules: {
    'no-unscoped-component-override': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Disallow direct, un-scoped overrides of native MD3 web components.',
        },
        messages: {
          unscopedComponent:
            'Direct override of native component "<{{name}}>" is forbidden. Let native MD3 styles shine through, or scope with "[data-override]" or ".override-*".',
          unscopedPart:
            'Direct override of component shadow part "::part({{name}})" is forbidden. Scope with "[data-override]" or ".override-*".',
        },
      },
      create(context) {
        return {
          Rule(node) {
            checkRuleSelectors(node, context);
          },
        };
      },
    },

    'no-scoped-important': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Disallow !important flags unless explicitly scoped under an override selector.',
        },
        messages: {
          noImportant:
            'Anti-pattern "!important" is forbidden. Component styles must shine through without brute-force overrides. Overrides must be explicitly scoped via "[data-override]" or ".override-*".',
        },
      },
      create(context) {
        let currentRuleHasOverride = false;
        return {
          Rule(node) {
            currentRuleHasOverride =
              node.prelude?.children?.some(isOverrideSelector) ?? false;
          },
          'Rule:exit'() {
            currentRuleHasOverride = false;
          },
          Declaration(node) {
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
        docs: {
          description:
            'Forbid raw hex/rgb/hsl colors in CSS in favor of tokens and CSS variables.',
        },
        messages: {
          noRawColor:
            'Raw color "{{value}}" detected in CSS. Use design tokens or CSS custom properties (var(--...)) instead.',
        },
      },
      create(context) {
        return {
          Hash(node) {
            context.report({
              node,
              messageId: 'noRawColor',
              data: { value: `#${node.value}` },
            });
          },
          Function(node) {
            if (COLOR_FUNCS.has(node.name.toLowerCase())) {
              context.report({
                node,
                messageId: 'noRawColor',
                data: { value: `${node.name}(...)` },
              });
            }
          },
          Declaration(node) {
            const prop = node.property?.toLowerCase();
            if (!COLOR_PROPS.has(prop)) return;
            for (const child of node.value?.children || []) {
              if (
                child.type === 'Identifier' &&
                !ALLOWED_COLOR_IDS.has(child.name.toLowerCase())
              ) {
                context.report({
                  node: child,
                  messageId: 'noRawColor',
                  data: { value: child.name },
                });
              }
            }
          },
        };
      },
    },

    'no-unperformant-transitions': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Disallow transition: all and transitions on universal selectors to prevent layout thrashing.',
        },
        messages: {
          noTransitionAll:
            'Anti-pattern "transition: all" detected. Explicitly list animated properties (e.g. opacity, transform) to prevent layout thrashing.',
          noUniversalTransition:
            'Universal selector "*" cannot have transitions or animations. This degrades rendering performance and triggers layout thrashing.',
        },
      },
      create(context) {
        let currentRuleIsUniversal = false;
        return {
          Rule(node) {
            currentRuleIsUniversal =
              node.prelude?.children?.some(isUniversalSelector) ?? false;
          },
          'Rule:exit'() {
            currentRuleIsUniversal = false;
          },
          Declaration(node) {
            const prop = node.property?.toLowerCase();
            if (prop === 'transition' || prop === 'transition-property') {
              if (currentRuleIsUniversal) {
                context.report({ node, messageId: 'noUniversalTransition' });
              }
              const hasAll = node.value?.children?.some(
                (c) => c.type === 'Identifier' && c.name.toLowerCase() === 'all'
              );
              if (hasAll) {
                context.report({ node, messageId: 'noTransitionAll' });
              }
            } else if (prop === 'animation' && currentRuleIsUniversal) {
              context.report({ node, messageId: 'noUniversalTransition' });
            }
          },
        };
      },
    },

    'no-raw-font-family': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Forbid raw font-family declarations without tokens or CSS variables.',
        },
        messages: {
          noRawFont:
            'Raw font-family "{{value}}" detected. Use design tokens (var(--font-family-*)) instead.',
        },
      },
      create(context) {
        return {
          Declaration(node) {
            const prop = node.property?.toLowerCase();
            if (prop !== 'font-family') return;
            const text = context.sourceCode.getText(node.value);
            if (
              !text.includes('var(') &&
              !['inherit', 'initial', 'unset', 'system-ui'].includes(
                text.trim()
              )
            ) {
              context.report({
                node,
                messageId: 'noRawFont',
                data: { value: text.trim() },
              });
            }
          },
        };
      },
    },

    'no-tailwind-directives': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Forbid Tailwind CSS directives (@theme, @apply, @import "tailwindcss").',
        },
        messages: {
          noTailwind:
            'Tailwind directive "@{{name}}" is forbidden. This project enforces Panda CSS and Material Design 3 tokens.',
          noTailwindImport:
            'Importing Tailwind CSS is forbidden. This project enforces Panda CSS and Material Design 3 tokens.',
        },
      },
      create(context) {
        return {
          Atrule(node) {
            const name = node.name?.toLowerCase();
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
        docs: {
          description:
            'Enforce that all CSS colors originate strictly from the Solarized theme system (--theme-*, --colors-*, --md-sys-color-*, --m3e-*, --shadows-*, or component tokens).',
        },
        messages: {
          invalidThemeColor:
            'Color "{{value}}" does not conform to the theme system. Use pure Solarized theme variables (var(--theme-*), var(--colors-*), var(--md-sys-color-*), var(--m3e-*)) or allowed keywords (transparent, currentColor, inherit).',
          rawColorFallback:
            'Raw color fallback "{{value}}" detected inside theme variable. Remove raw fallbacks to ensure 100% pure Solarized theme adherence.',
        },
      },
      create(context) {
        return {
          Declaration(node) {
            const prop = node.property?.toLowerCase();
            if (!prop || !isColorProperty(prop)) return;

            for (const child of node.value?.children || []) {
              if (child.type === 'Hash') {
                context.report({
                  node: child,
                  messageId: 'invalidThemeColor',
                  data: { value: `#${child.value}` },
                });
              } else if (child.type === 'Function') {
                checkThemeFunctionNode(child, prop, context);
              } else if (child.type === 'Identifier') {
                const idName = child.name?.toLowerCase();
                if (COLOR_PROPS.has(prop) && !ALLOWED_COLOR_IDS.has(idName)) {
                  context.report({
                    node: child,
                    messageId: 'invalidThemeColor',
                    data: { value: child.name },
                  });
                }
              }
            }
          },
        };
      },
    },
  },
};
