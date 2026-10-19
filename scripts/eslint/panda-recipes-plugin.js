/**
 * Panda CSS Recipe Enforcement Plugin
 *
 * Enforces appropriate use of Panda CSS recipes (cva, sva, defineRecipe, defineSlotRecipe):
 * 1. Prohibits conditional/ternary expressions in JSX style props and css={{ ... }} objects (requires recipe variants).
 * 2. Prohibits JSXSpreadAttribute on Panda JSX elements to prevent bypassing inline style limits.
 * 3. Prohibits accumulating >3 inline style props or >3 properties in css={{ ... }} on a JSX element (requires recipe extraction).
 * 4. Requires `defaultVariants` whenever `variants` is declared in a recipe.
 * 5. Requires every slot in a slot recipe (`sva` / `defineSlotRecipe`) to be styled in `base`.
 */

const NON_STYLE_JSX_ATTRIBUTES = new Set([
  'id',
  'key',
  'ref',
  'className',
  'role',
  'tabIndex',
  'charSet',
  'name',
  'content',
  'lang',
  'type',
  'href',
  'target',
  'rel',
  'src',
  'alt',
  'title',
  'value',
  'defaultValue',
  'checked',
  'disabled',
  'required',
  'readOnly',
  'htmlFor',
  'children',
]);

const PANDA_JSX_CONTAINERS = new Set([
  'Box',
  'Flex',
  'Stack',
  'Container',
  'Grid',
  'HStack',
  'VStack',
  'Center',
  'Wrap',
  'Circle',
  'Square',
]);
const RECIPE_CREATORS = new Set([
  'cva',
  'sva',
  'defineRecipe',
  'defineSlotRecipe',
]);
const SLOT_RECIPE_CREATORS = new Set(['sva', 'defineSlotRecipe']);
const MAX_INLINE_STYLE_PROPS = 3;

function isNonStyleAttribute(attrName) {
  return (
    NON_STYLE_JSX_ATTRIBUTES.has(attrName) ||
    attrName.startsWith('aria-') ||
    attrName.startsWith('data-') ||
    /^on[A-Z]/.test(attrName)
  );
}

function isPandaStyledJsxOpening(node) {
  const nameNode = node.name;
  if (nameNode.type === 'JSXMemberExpression') {
    return true;
  }
  if (nameNode.type === 'JSXIdentifier') {
    return PANDA_JSX_CONTAINERS.has(nameNode.name);
  }
  return false;
}

function isConditionalOrLogical(expr) {
  return (
    expr?.type === 'ConditionalExpression' || expr?.type === 'LogicalExpression'
  );
}

function inspectCssObjectExpression(context, objExpr) {
  for (const prop of objExpr.properties ?? []) {
    if (prop.type === 'SpreadElement') {
      context.report({
        node: prop,
        messageId: 'noSpreadAttribute',
      });
      continue;
    }
    if (prop.type !== 'Property') continue;

    if (isConditionalOrLogical(prop.value)) {
      const keyName = prop.key?.name ?? prop.key?.value ?? 'css';
      context.report({
        node: prop,
        messageId: 'noConditionalStyleProp',
        data: { prop: `css.${keyName}` },
      });
    } else if (prop.value?.type === 'ObjectExpression') {
      inspectCssObjectExpression(context, prop.value);
    }
  }
}

function isCssCallExpression(node) {
  if (node.callee?.type === 'Identifier' && node.callee.name === 'css') {
    return true;
  }
  return (
    node.callee?.type === 'MemberExpression' &&
    node.callee.object?.name === 'css' &&
    node.callee.property?.name === 'raw'
  );
}

function checkCssCallExpression(context, node) {
  let totalProps = 0;
  for (const arg of node.arguments ?? []) {
    if (arg?.type === 'ObjectExpression') {
      totalProps += arg.properties.length;
      inspectCssObjectExpression(context, arg);
    }
  }
  if (totalProps > MAX_INLINE_STYLE_PROPS) {
    context.report({
      node,
      messageId: 'tooManyInlineStyleProps',
      data: {
        count: String(totalProps),
        max: String(MAX_INLINE_STYLE_PROPS),
      },
    });
  }
}

function getPropertyByName(objectExpr, propName) {
  return objectExpr.properties?.find(
    (p) =>
      p.type === 'Property' &&
      (p.key?.name === propName || p.key?.value === propName)
  );
}

function checkRecipeObject(context, callNode, calleeName, objNode) {
  const variantsProp = getPropertyByName(objNode, 'variants');
  const defaultVariantsProp = getPropertyByName(objNode, 'defaultVariants');

  if (variantsProp && !defaultVariantsProp) {
    context.report({
      node: variantsProp,
      messageId: 'missingDefaultVariants',
      data: { fn: calleeName },
    });
  }

  if (!SLOT_RECIPE_CREATORS.has(calleeName)) return;

  const slotsProp = getPropertyByName(objNode, 'slots');
  const baseProp = getPropertyByName(objNode, 'base');
  if (
    slotsProp?.value?.type !== 'ArrayExpression' ||
    baseProp?.value?.type !== 'ObjectExpression'
  ) {
    return;
  }

  for (const el of slotsProp.value.elements) {
    if (el?.type === 'Literal' && typeof el.value === 'string') {
      if (!getPropertyByName(baseProp.value, el.value)) {
        context.report({
          node: el,
          messageId: 'unstyledRecipeSlot',
          data: { slot: el.value },
        });
      }
    }
  }
}

export const pandaRecipesPlugin = {
  meta: { name: 'eslint-plugin-panda-recipes' },
  rules: {
    'enforce-recipe-usage': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Enforce Panda CSS recipes (cva, sva, defineRecipe, defineSlotRecipe) over ad-hoc inline or conditional style props.',
        },
        messages: {
          noSpreadAttribute:
            'JSX spread attributes are forbidden on Panda layout elements. Pass explicit props or extract a Panda CSS recipe (cva, sva, defineRecipe, or defineSlotRecipe).',
          noConditionalStyleProp:
            "Conditional expression in style prop '{{prop}}' is forbidden. Define a Panda CSS recipe (cva, sva, defineRecipe, or defineSlotRecipe) with declarative 'variants' and 'defaultVariants'.",
          tooManyInlineStyleProps:
            'JSX element has {{count}} inline style props (max {{max}} allowed for layout). Extract component styling into a Panda CSS recipe (cva, sva, defineRecipe, or defineSlotRecipe).',
          missingDefaultVariants:
            "Panda CSS recipe '{{fn}}' defines 'variants' without 'defaultVariants'. Always specify 'defaultVariants' for deterministic static extraction.",
          unstyledRecipeSlot:
            "Slot '{{slot}}' in slot recipe has no styles under 'base'. Every declared slot in a slot recipe anatomy must be styled.",
        },
      },
      create(context) {
        return {
          JSXOpeningElement(node) {
            if (!isPandaStyledJsxOpening(node)) return;

            let stylePropCount = 0;
            for (const attr of node.attributes) {
              if (attr.type === 'JSXSpreadAttribute') {
                context.report({
                  node: attr,
                  messageId: 'noSpreadAttribute',
                });
                continue;
              }

              if (attr.type !== 'JSXAttribute' || !attr.name?.name) continue;
              const attrName = String(attr.name.name);
              if (isNonStyleAttribute(attrName)) continue;

              const expr = attr.value?.expression;
              if (attrName === 'css' && expr?.type === 'ObjectExpression') {
                stylePropCount += Math.max(1, expr.properties.length);
                inspectCssObjectExpression(context, expr);
                continue;
              }

              stylePropCount += 1;
              if (isConditionalOrLogical(expr)) {
                context.report({
                  node: attr,
                  messageId: 'noConditionalStyleProp',
                  data: { prop: attrName },
                });
              }
            }

            if (stylePropCount > MAX_INLINE_STYLE_PROPS) {
              context.report({
                node,
                messageId: 'tooManyInlineStyleProps',
                data: {
                  count: String(stylePropCount),
                  max: String(MAX_INLINE_STYLE_PROPS),
                },
              });
            }
          },

          CallExpression(node) {
            if (isCssCallExpression(node)) {
              checkCssCallExpression(context, node);
              return;
            }
            const calleeName = node.callee?.name;
            const firstArg = node.arguments?.[0];
            if (
              !RECIPE_CREATORS.has(calleeName) ||
              firstArg?.type !== 'ObjectExpression'
            ) {
              return;
            }
            checkRecipeObject(context, node, calleeName, firstArg);
          },
        };
      },
    },
  },
};
