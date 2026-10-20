/**
 * Panda CSS Recipe Enforcement Plugin
 *
 * Enforces appropriate use of Panda CSS recipes (cva, sva, defineRecipe, defineSlotRecipe).
 */
import type { ESLint, Rule } from 'eslint';
import {
  type EstreeAstNode,
  getJsxAttrName,
  getPropertyByName,
  type TypedRuleContext,
} from './ast-helpers.ts';
import {
  type CanonicalRecipeBlock,
  checkCssCallExpression,
  checkSlotRecipeAnatomy,
  collectRecipeBaseBlocks,
  findSharedStylePairs,
  inspectCssObjectExpression,
  isAliasedImportSpecifier,
  isConditionalOrLogical,
  isCssCallExpression,
  isNonStyleAttribute,
  isPandaStyledJsxOpening,
  isStyledSystemImportSource,
  MAX_INLINE_STYLE_PROPS,
  RECIPE_CREATORS,
  SLOT_RECIPE_CREATORS,
} from './panda-recipes-helpers.ts';

const MIN_SHARED_RECIPE_PROPS = 3;

function verifyNoDuplicateBlock(
  context: TypedRuleContext,
  seenBlocks: CanonicalRecipeBlock[],
  newBlocks: readonly CanonicalRecipeBlock[]
): void {
  for (const candidate of newBlocks) {
    for (const previous of seenBlocks) {
      const shared = findSharedStylePairs(previous.pairs, candidate.pairs);
      if (shared.length >= MIN_SHARED_RECIPE_PROPS) {
        context.report({
          node: candidate.node,
          messageId: 'duplicateRecipeBlock',
          data: {
            count: String(shared.length),
            shared: shared.join(', '),
          },
        });
        break;
      }
    }
    seenBlocks.push(candidate);
  }
}

function checkRecipeObject(
  context: TypedRuleContext,
  calleeName: string,
  objNode: EstreeAstNode
): void {
  const variantsProp = getPropertyByName(objNode, 'variants');
  const defaultVariantsProp = getPropertyByName(objNode, 'defaultVariants');

  if (variantsProp && !defaultVariantsProp) {
    context.report({
      node: variantsProp,
      messageId: 'missingDefaultVariants',
      data: { fn: calleeName },
    });
  }
  if (SLOT_RECIPE_CREATORS.has(calleeName)) {
    checkSlotRecipeAnatomy(context, objNode);
  }
}

function checkStyledJsxPropValue(
  context: TypedRuleContext,
  attr: EstreeAstNode,
  attrName: string
): number {
  const valNode = attr.value as EstreeAstNode | undefined;
  const expr = valNode?.expression;
  if (attrName === 'css' && expr?.type === 'ObjectExpression') {
    inspectCssObjectExpression(context, expr);
    return Math.max(1, (expr.properties ?? []).length);
  }
  if (isConditionalOrLogical(expr)) {
    context.report({
      node: attr,
      messageId: 'noConditionalStyleProp',
      data: { prop: attrName },
    });
  }
  return 1;
}

function checkSingleJsxAttribute(
  context: TypedRuleContext,
  attr: EstreeAstNode
): number {
  if (attr.type === 'JSXSpreadAttribute') {
    context.report({ node: attr, messageId: 'noSpreadAttribute' });
    return 0;
  }
  const attrName = getJsxAttrName(attr);
  if (!attrName || isNonStyleAttribute(attrName)) return 0;
  return checkStyledJsxPropValue(context, attr, attrName);
}

function checkJsxOpeningElement(
  context: TypedRuleContext,
  node: EstreeAstNode
): void {
  if (!isPandaStyledJsxOpening(node)) return;
  let stylePropCount = 0;
  for (const attr of node.attributes ?? []) {
    stylePropCount += checkSingleJsxAttribute(context, attr);
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
}

function checkImportDeclaration(
  context: TypedRuleContext,
  node: EstreeAstNode
): void {
  if (!isStyledSystemImportSource(node)) return;
  for (const spec of node.specifiers ?? []) {
    if (isAliasedImportSpecifier(spec)) {
      context.report({
        node: spec,
        messageId: 'noAliasedStyledSystemImport',
      });
    }
  }
}

export const pandaRecipesPlugin = {
  meta: { name: 'eslint-plugin-panda-recipes' },
  rules: {
    'enforce-recipe-usage': {
      meta: {
        type: 'problem',
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
          noAliasedStyledSystemImport:
            'Aliasing styled-system imports (e.g. `import { panda as p }` or `import { css as s }`) is prohibited. Use canonical export names.',
          duplicateRecipeBlock:
            'Duplicate Panda recipe style block detected ({{count}} shared style properties regardless of key order: {{shared}}). Extract or reuse a shared recipe instead of duplicating styles.',
        },
      },
      create(context: TypedRuleContext): Rule.RuleListener {
        const seenBlocks: CanonicalRecipeBlock[] = [];
        return {
          ImportDeclaration(node: unknown) {
            checkImportDeclaration(context, node as EstreeAstNode);
          },
          JSXOpeningElement(node: unknown) {
            checkJsxOpeningElement(context, node as EstreeAstNode);
          },
          CallExpression(node: unknown) {
            const callNode = node as EstreeAstNode;
            if (isCssCallExpression(callNode)) {
              checkCssCallExpression(context, callNode);
              return;
            }
            const calleeName =
              typeof callNode.callee?.name === 'string'
                ? callNode.callee.name
                : '';
            const firstArg = callNode.arguments?.[0];
            if (
              RECIPE_CREATORS.has(calleeName) &&
              firstArg?.type === 'ObjectExpression'
            ) {
              checkRecipeObject(context, calleeName, firstArg);
              verifyNoDuplicateBlock(
                context,
                seenBlocks,
                collectRecipeBaseBlocks(firstArg)
              );
            }
          },
        } as unknown as Rule.RuleListener;
      },
    },
  },
} as unknown as ESLint.Plugin;
