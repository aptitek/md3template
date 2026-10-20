/**
 * Material Design 3 Design Tokens Enforcement Plugin
 * Enforces tokenized motion, shape corner radii, typography, and color tokens.
 */
import type { ESLint, Rule } from 'eslint';
import {
  checkJsxColorPairing,
  checkObjectColorPairing,
  createPropAndJsxListener,
  type EstreeAstNode,
  type PropTarget,
  type TypedRuleContext,
} from './ast-helpers.ts';

const APPROVED_NUM_CORNERS = [0, 4, 8, 12, 16, 20, 28, 32, 48, 9999];
const APPROVED_SHAPE_CORNERS: ReadonlySet<string | number> = new Set<
  string | number
>([
  ...APPROVED_NUM_CORNERS,
  ...APPROVED_NUM_CORNERS.map(String),
  ...APPROVED_NUM_CORNERS.map((n) => `${n}px`),
  '50%',
  '100%',
  'none',
  'extraSmall',
  'small',
  'medium',
  'large',
  'extraLarge',
  'full',
  'inherit',
  'initial',
  'unset',
]);

const CORNER_PROPERTIES: ReadonlySet<string> = new Set([
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderStartStartRadius',
  'borderStartEndRadius',
  'borderEndStartRadius',
  'borderEndEndRadius',
  'rounded',
  'roundedTop',
  'roundedBottom',
  'roundedLeft',
  'roundedRight',
]);

const TIMING_KEYS: ReadonlySet<string> = new Set([
  'ease',
  'easing',
  'transitionTimingFunction',
]);
const DURATION_KEYS: ReadonlySet<string> = new Set([
  'duration',
  'transitionDuration',
]);
const HEX_REGEX = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const FN_REGEX = /^(rgb|hsl|oklch|lab|lch)a?\s*\(/i;

function isAllowedColorLiteral(trimmed: string): boolean {
  return (
    trimmed.startsWith('var(--') ||
    trimmed === 'transparent' ||
    trimmed === 'inherit' ||
    trimmed === 'currentColor'
  );
}

function checkColorLiteral(
  node: EstreeAstNode,
  context: TypedRuleContext
): void {
  if (typeof node.value !== 'string') return;
  const trimmed = node.value.trim();
  if (isAllowedColorLiteral(trimmed)) return;
  if (HEX_REGEX.test(trimmed) || FN_REGEX.test(trimmed)) {
    context.report({
      node,
      messageId: 'noRawColor',
      data: { value: trimmed },
    });
  }
}

function isRawDurationValue(val: unknown): boolean {
  return (
    typeof val === 'number' ||
    (typeof val === 'string' && /^\d+(ms|s)$/.test(val))
  );
}

function checkMotionProp(target: PropTarget, context: TypedRuleContext): void {
  const { propName, val, targetNode } = target;
  if (
    TIMING_KEYS.has(propName) &&
    typeof val === 'string' &&
    /cubic-bezier/i.test(val)
  ) {
    context.report({
      node: targetNode,
      messageId: 'noHardcodedBezier',
      data: { value: val },
    });
    return;
  }
  if (DURATION_KEYS.has(propName) && isRawDurationValue(val)) {
    context.report({
      node: targetNode,
      messageId: 'noHardcodedDuration',
      data: { value: String(val) },
    });
  }
}

function isApprovedCornerValue(val: unknown): boolean {
  if (typeof val === 'string' && val.startsWith('var(--')) return true;
  if (typeof val !== 'string' && typeof val !== 'number') return false;
  return APPROVED_SHAPE_CORNERS.has(val);
}

function checkCornerProp(target: PropTarget, context: TypedRuleContext): void {
  const { propName, val, targetNode } = target;
  if (!CORNER_PROPERTIES.has(propName) || val === undefined) return;
  if (!isApprovedCornerValue(val)) {
    context.report({
      node: targetNode,
      messageId: 'invalidCorner',
      data: { value: String(val) },
    });
  }
}

function checkFontFamilyProp(
  target: PropTarget,
  context: TypedRuleContext
): void {
  const { propName, val, targetNode } = target;
  if (
    (propName !== 'fontFamily' && propName !== 'font-family') ||
    typeof val !== 'string'
  ) {
    return;
  }
  if (
    val.includes('var(--font-family-') ||
    val === 'inherit' ||
    val === 'initial'
  ) {
    return;
  }
  context.report({
    node: targetNode,
    messageId: 'noRawFontFamily',
    data: { value: val },
  });
}

export const m3TokensPlugin = {
  meta: { name: 'eslint-plugin-m3-tokens' },
  rules: {
    'no-hardcoded-colors': {
      meta: {
        type: 'problem',
        messages: {
          noRawColor:
            "Hardcoded color '{{value}}' detected. Use Material Design 3 tokens or CSS variables (var(--...)) instead.",
        },
      },
      create(context: TypedRuleContext): Rule.RuleListener {
        return {
          Literal(node: unknown) {
            checkColorLiteral(node as EstreeAstNode, context);
          },
        };
      },
    },
    'enforce-color-pairing': {
      meta: {
        type: 'problem',
        messages: {
          invalidColorPairing:
            "MD3 Color Pairing violation: background '{{bg}}' cannot be paired with foreground '{{color}}'. Expected {{expected}}.",
          missingColorPairing:
            "MD3 Color Pairing violation: recipe base with background '{{bg}}' must explicitly declare paired foreground color ({{expected}}).",
        },
      },
      create(context: TypedRuleContext): Rule.RuleListener {
        return {
          ObjectExpression(node: unknown) {
            checkObjectColorPairing(node as EstreeAstNode, context);
          },
          JSXOpeningElement(node: unknown) {
            checkJsxColorPairing(node as EstreeAstNode, context);
          },
        };
      },
    },
    'enforce-motion-tokens': {
      meta: {
        type: 'problem',
        messages: {
          noHardcodedSpring:
            'Hardcoded spring physics detected. Use tokenized motion physics (M3_SPRINGS or tokens).',
          noHardcodedBezier:
            "Hardcoded cubic-bezier '{{value}}' detected. Use Material Design 3 easing tokens.",
          noHardcodedDuration:
            "Hardcoded animation duration '{{value}}' detected in transition. Use Material Design 3 duration tokens.",
        },
      },
      create(context: TypedRuleContext): Rule.RuleListener {
        return createPropAndJsxListener(checkMotionProp, context);
      },
    },
    'enforce-shape-tokens': {
      meta: {
        type: 'problem',
        messages: {
          invalidCorner:
            "Non-standard corner radius '{{value}}' detected. Adhere to M3 shape tokens (0, 4, 8, 12, 16, 20, 28, 32, 48, 9999).",
        },
      },
      create(context: TypedRuleContext): Rule.RuleListener {
        return createPropAndJsxListener(checkCornerProp, context);
      },
    },
    'enforce-typography-tokens': {
      meta: {
        type: 'problem',
        messages: {
          noRawFontFamily:
            "Raw font-family '{{value}}' detected. Use design tokens (var(--font-family-*)) instead.",
        },
      },
      create(context: TypedRuleContext): Rule.RuleListener {
        return createPropAndJsxListener(checkFontFamilyProp, context);
      },
    },
  },
} as unknown as ESLint.Plugin;
