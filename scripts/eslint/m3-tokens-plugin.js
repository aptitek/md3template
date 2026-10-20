/**
 * Material Design 3 Design Tokens Enforcement Plugin
 * Enforces tokenized motion, shape corner radii, typography, and color tokens.
 */

const APPROVED_SHAPE_CORNERS = new Set([
  0,
  4,
  8,
  12,
  16,
  20,
  28,
  32,
  48,
  9999,
  '0',
  '0px',
  '4px',
  '8px',
  '12px',
  '16px',
  '20px',
  '28px',
  '32px',
  '48px',
  '9999px',
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

const CORNER_PROPERTIES = new Set([
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

function extractJsxAttributeValue(attrNode) {
  if (!attrNode.value) return undefined;
  if (attrNode.value.type === 'Literal') return attrNode.value.value;
  if (
    attrNode.value.type === 'JSXExpressionContainer' &&
    attrNode.value.expression?.type === 'Literal'
  ) {
    return attrNode.value.expression.value;
  }
  return undefined;
}

export const m3TokensPlugin = {
  meta: { name: 'eslint-plugin-m3-tokens' },
  rules: {
    'no-hardcoded-colors': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Enforce design tokens and CSS variables over hardcoded colors.',
        },
        messages: {
          noRawColor:
            "Hardcoded color '{{value}}' detected. Use Material Design 3 tokens or CSS variables (var(--...)) instead.",
        },
      },
      create(context) {
        const HEX_REGEX = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
        const FN_REGEX = /^(rgb|hsl|oklch|lab|lch)a?\s*\(/i;

        function checkColor(val, node) {
          if (typeof val !== 'string') return;
          const trimmed = val.trim();
          if (
            trimmed.startsWith('var(--') ||
            trimmed === 'transparent' ||
            trimmed === 'inherit' ||
            trimmed === 'currentColor'
          ) {
            return;
          }
          if (HEX_REGEX.test(trimmed) || FN_REGEX.test(trimmed)) {
            context.report({
              node,
              messageId: 'noRawColor',
              data: { value: trimmed },
            });
          }
        }

        return {
          Literal(node) {
            checkColor(node.value, node);
          },
        };
      },
    },

    'enforce-motion-tokens': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Enforce Material Design 3 motion tokens for springs and easing.',
        },
        messages: {
          noHardcodedSpring:
            'Hardcoded spring physics detected. Use tokenized motion physics (M3_SPRINGS or tokens).',
          noHardcodedBezier:
            "Hardcoded cubic-bezier '{{value}}' detected. Use Material Design 3 easing tokens.",
          noHardcodedDuration:
            "Hardcoded animation duration '{{value}}' detected in transition. Use Material Design 3 duration tokens.",
        },
      },
      create(context) {
        function checkMotionProp(key, val, targetNode) {
          if (
            key === 'ease' ||
            key === 'easing' ||
            key === 'transitionTimingFunction'
          ) {
            if (typeof val === 'string' && /cubic-bezier/i.test(val)) {
              context.report({
                node: targetNode,
                messageId: 'noHardcodedBezier',
                data: { value: val },
              });
            }
          }
          if (
            (key === 'duration' || key === 'transitionDuration') &&
            (typeof val === 'number' ||
              (typeof val === 'string' && /^\d+(ms|s)$/.test(val)))
          ) {
            context.report({
              node: targetNode,
              messageId: 'noHardcodedDuration',
              data: { value: String(val) },
            });
          }
        }

        return {
          Property(node) {
            const key = node.key?.name || node.key?.value;
            checkMotionProp(key, node.value?.value, node.value || node);
          },
          JSXAttribute(node) {
            const key = node.name?.name;
            checkMotionProp(
              key,
              extractJsxAttributeValue(node),
              node.value || node
            );
          },
        };
      },
    },

    'enforce-shape-tokens': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Enforce Material Design 3 corner radius scale.',
        },
        messages: {
          invalidCorner:
            "Non-standard corner radius '{{value}}' detected. Adhere to M3 shape tokens (0, 4, 8, 12, 16, 20, 28, 32, 48, 9999).",
        },
      },
      create(context) {
        function checkCornerProp(propName, val, targetNode) {
          if (!CORNER_PROPERTIES.has(propName) || val === undefined) return;
          if (typeof val === 'string' && val.startsWith('var(--')) return;
          if (!APPROVED_SHAPE_CORNERS.has(val)) {
            context.report({
              node: targetNode,
              messageId: 'invalidCorner',
              data: { value: String(val) },
            });
          }
        }

        return {
          Property(node) {
            const propName = node.key?.name || node.key?.value;
            checkCornerProp(propName, node.value?.value, node.value || node);
          },
          JSXAttribute(node) {
            const propName = node.name?.name;
            checkCornerProp(
              propName,
              extractJsxAttributeValue(node),
              node.value || node
            );
          },
        };
      },
    },

    'enforce-typography-tokens': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Enforce typography tokens over raw ad-hoc font families.',
        },
        messages: {
          noRawFontFamily:
            "Raw font-family '{{value}}' detected. Use design tokens (var(--font-family-*)) instead.",
        },
      },
      create(context) {
        function checkFontFamilyProp(propName, val, targetNode) {
          if (propName !== 'fontFamily' && propName !== 'font-family') return;
          if (typeof val !== 'string') return;
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

        return {
          Property(node) {
            const propName = node.key?.name || node.key?.value;
            checkFontFamilyProp(
              propName,
              node.value?.value,
              node.value || node
            );
          },
          JSXAttribute(node) {
            const propName = node.name?.name;
            checkFontFamilyProp(
              propName,
              extractJsxAttributeValue(node),
              node.value || node
            );
          },
        };
      },
    },
  },
};
