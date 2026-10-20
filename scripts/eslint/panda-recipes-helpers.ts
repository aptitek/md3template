/**
 * Typed AST Helpers for Panda CSS Recipe Enforcement Plugin
 */
import {
  type EstreeAstNode,
  getPropertyByName,
  getPropertyKeyName,
  type TypedRuleContext,
} from './ast-helpers.ts';

export const NON_STYLE_JSX_ATTRIBUTES: ReadonlySet<string> = new Set(
  'id,key,ref,className,role,tabIndex,charSet,name,content,lang,type,href,target,rel,src,alt,title,value,defaultValue,checked,disabled,required,readOnly,htmlFor,children'.split(
    ','
  )
);

export const PANDA_JSX_CONTAINERS: ReadonlySet<string> = new Set(
  'Box,Flex,Stack,Container,Grid,HStack,VStack,Center,Wrap,Circle,Square'.split(
    ','
  )
);

export const RECIPE_CREATORS: ReadonlySet<string> = new Set([
  'cva',
  'sva',
  'defineRecipe',
  'defineSlotRecipe',
]);
export const SLOT_RECIPE_CREATORS: ReadonlySet<string> = new Set([
  'sva',
  'defineSlotRecipe',
]);
export const MAX_INLINE_STYLE_PROPS = 3;

export function isNonStyleAttribute(attrName: string): boolean {
  return (
    NON_STYLE_JSX_ATTRIBUTES.has(attrName) ||
    attrName.startsWith('aria-') ||
    attrName.startsWith('data-') ||
    /^on[A-Z]/.test(attrName)
  );
}

export function isPandaStyledJsxOpening(node: EstreeAstNode): boolean {
  const nameNode = node.name;
  if (!nameNode || typeof nameNode === 'string') return false;
  if (nameNode.type === 'JSXMemberExpression') return true;
  return (
    nameNode.type === 'JSXIdentifier' &&
    typeof nameNode.name === 'string' &&
    PANDA_JSX_CONTAINERS.has(nameNode.name)
  );
}

export function isConditionalOrLogical(expr?: EstreeAstNode): boolean {
  return (
    expr?.type === 'ConditionalExpression' || expr?.type === 'LogicalExpression'
  );
}

function inspectCssProperty(
  context: TypedRuleContext,
  prop: EstreeAstNode
): void {
  if (prop.type === 'SpreadElement') {
    context.report({ node: prop, messageId: 'noSpreadAttribute' });
    return;
  }
  if (prop.type !== 'Property') return;

  const valNode = prop.value as EstreeAstNode | undefined;
  if (isConditionalOrLogical(valNode)) {
    const keyName = getPropertyKeyName(prop) || 'css';
    context.report({
      node: prop,
      messageId: 'noConditionalStyleProp',
      data: { prop: `css.${keyName}` },
    });
  } else if (valNode?.type === 'ObjectExpression') {
    inspectCssObjectExpression(context, valNode);
  }
}

export function inspectCssObjectExpression(
  context: TypedRuleContext,
  objExpr: EstreeAstNode
): void {
  for (const prop of objExpr.properties ?? []) {
    inspectCssProperty(context, prop);
  }
}

export function isCssCallExpression(node: EstreeAstNode): boolean {
  const callee = node.callee;
  if (!callee) return false;
  if (callee.type === 'Identifier' && callee.name === 'css') return true;
  return (
    callee.type === 'MemberExpression' &&
    callee.object?.name === 'css' &&
    callee.property?.name === 'raw'
  );
}

export function checkCssCallExpression(
  context: TypedRuleContext,
  node: EstreeAstNode
): void {
  let totalProps = 0;
  for (const arg of node.arguments ?? []) {
    if (arg?.type !== 'ObjectExpression') {
      context.report({ node: arg ?? node, messageId: 'noSpreadAttribute' });
      continue;
    }
    totalProps += (arg.properties ?? []).length;
    inspectCssObjectExpression(context, arg);
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

function extractObjectPropertyValue(
  objNode: EstreeAstNode,
  propName: string,
  expectedType: string
): EstreeAstNode | null {
  const prop = getPropertyByName(objNode, propName);
  const val = prop?.value as EstreeAstNode | undefined;
  return val?.type === expectedType ? val : null;
}

function checkSlotElementStyled(
  context: TypedRuleContext,
  el: EstreeAstNode | null,
  baseVal: EstreeAstNode
): void {
  if (el?.type !== 'Literal' || typeof el.value !== 'string') return;
  if (!getPropertyByName(baseVal, el.value)) {
    context.report({
      node: el,
      messageId: 'unstyledRecipeSlot',
      data: { slot: el.value },
    });
  }
}

export function checkSlotRecipeAnatomy(
  context: TypedRuleContext,
  objNode: EstreeAstNode
): void {
  const slotsVal = extractObjectPropertyValue(
    objNode,
    'slots',
    'ArrayExpression'
  );
  const baseVal = extractObjectPropertyValue(
    objNode,
    'base',
    'ObjectExpression'
  );
  if (!slotsVal || !baseVal) return;

  for (const el of slotsVal.elements ?? []) {
    checkSlotElementStyled(context, el, baseVal);
  }
}

export function isStyledSystemImportSource(node: EstreeAstNode): boolean {
  const sourceVal = node.source?.value;
  return typeof sourceVal === 'string' && sourceVal.includes('styled-system');
}

export function isAliasedImportSpecifier(spec: EstreeAstNode): boolean {
  if (spec.type !== 'ImportSpecifier') return false;
  return spec.imported?.name !== spec.local?.name;
}

export interface CanonicalRecipeBlock {
  readonly node: EstreeAstNode;
  readonly pairs: readonly string[];
}

function toStylePair(prop: EstreeAstNode): string | null {
  if (prop.type !== 'Property') return null;
  const key = getPropertyKeyName(prop);
  const valNode = prop.value as EstreeAstNode | undefined;
  const raw = valNode?.type === 'Literal' ? valNode.value : undefined;
  if (!key || (typeof raw !== 'string' && typeof raw !== 'number')) {
    return null;
  }
  return `${key}=${String(raw)}`;
}

export function extractCanonicalStylePairs(objNode: EstreeAstNode): string[] {
  const pairs: string[] = [];
  for (const prop of objNode.properties ?? []) {
    const pair = toStylePair(prop);
    if (pair) pairs.push(pair);
  }
  return pairs.toSorted();
}

function toSlotCanonicalBlock(
  prop: EstreeAstNode
): CanonicalRecipeBlock | null {
  const slotObj = prop.value as EstreeAstNode | undefined;
  if (prop.type !== 'Property' || slotObj?.type !== 'ObjectExpression') {
    return null;
  }
  const slotPairs = extractCanonicalStylePairs(slotObj);
  return slotPairs.length > 0 ? { node: slotObj, pairs: slotPairs } : null;
}

export function collectRecipeBaseBlocks(
  objNode: EstreeAstNode
): CanonicalRecipeBlock[] {
  const baseVal = extractObjectPropertyValue(
    objNode,
    'base',
    'ObjectExpression'
  );
  if (!baseVal) return [];
  const directPairs = extractCanonicalStylePairs(baseVal);
  if (directPairs.length > 0) {
    return [{ node: baseVal, pairs: directPairs }];
  }
  const slotBlocks: CanonicalRecipeBlock[] = [];
  for (const prop of baseVal.properties ?? []) {
    const block = toSlotCanonicalBlock(prop);
    if (block) slotBlocks.push(block);
  }
  return slotBlocks;
}

export function findSharedStylePairs(
  a: readonly string[],
  b: readonly string[]
): string[] {
  const setA = new Set(a);
  return b.filter((item) => setA.has(item));
}
