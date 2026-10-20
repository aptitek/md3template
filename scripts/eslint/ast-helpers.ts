/**
 * Shared Strictly-Typed ESTree & JSX AST Helpers for Custom ESLint Plugins
 */
import type { Rule } from 'eslint';

export interface EstreeAstNode {
  readonly type: string;
  readonly name?: string | EstreeAstNode;
  readonly value?: unknown;
  readonly key?: EstreeAstNode;
  readonly expression?: EstreeAstNode;
  readonly object?: EstreeAstNode;
  readonly property?: EstreeAstNode;
  readonly callee?: EstreeAstNode;
  readonly arguments?: readonly (EstreeAstNode | null)[];
  readonly properties?: readonly EstreeAstNode[];
  readonly elements?: readonly (EstreeAstNode | null)[];
  readonly attributes?: readonly EstreeAstNode[];
  readonly specifiers?: readonly EstreeAstNode[];
  readonly imported?: EstreeAstNode;
  readonly local?: EstreeAstNode;
  readonly source?: EstreeAstNode;
  readonly declaration?: EstreeAstNode;
  readonly parent?: EstreeAstNode;
}

export interface TypedRuleContext {
  readonly filename: string;
  readonly options: readonly Record<string, unknown>[];
  report(descriptor: {
    readonly node: EstreeAstNode;
    readonly messageId?: string;
    readonly message?: string;
    readonly data?: Readonly<Record<string, string>>;
  }): void;
}

export interface PropTarget {
  readonly propName: string;
  readonly val: unknown;
  readonly targetNode: EstreeAstNode;
}

export function getPropertyKeyName(node: EstreeAstNode): string {
  const key = node.key;
  if (!key) return '';
  if (typeof key.name === 'string') return key.name;
  return typeof key.value === 'string' ? key.value : '';
}

export function getJsxAttrName(node: EstreeAstNode): string {
  const nameNode = node.name;
  if (typeof nameNode === 'string') return nameNode;
  return nameNode && typeof nameNode.name === 'string' ? nameNode.name : '';
}

export function extractJsxAttributeValue(attrNode: EstreeAstNode): unknown {
  const valNode = attrNode.value as EstreeAstNode | undefined;
  if (!valNode) return undefined;
  if (valNode.type === 'Literal') return valNode.value;
  if (
    valNode.type === 'JSXExpressionContainer' &&
    valNode.expression?.type === 'Literal'
  ) {
    return valNode.expression.value;
  }
  return undefined;
}

export function unwrapTsExpression(
  node: EstreeAstNode | undefined
): EstreeAstNode | undefined {
  let current = node;
  while (
    current &&
    (current.type === 'TSAsExpression' ||
      current.type === 'TSSatisfiesExpression' ||
      current.type === 'ParenthesizedExpression')
  ) {
    current = current.expression;
  }
  return current;
}

export function getCalleeIdentifierName(callNode: EstreeAstNode): string {
  return callNode.callee?.type === 'Identifier' &&
    typeof callNode.callee.name === 'string'
    ? callNode.callee.name
    : '';
}

export function getPropertyByName(
  objectExpr: EstreeAstNode,
  propName: string
): EstreeAstNode | undefined {
  return objectExpr.properties?.find(
    (p) => p.type === 'Property' && getPropertyKeyName(p) === propName
  );
}

export function createPropAndJsxListener(
  checker: (target: PropTarget, context: TypedRuleContext) => void,
  context: TypedRuleContext
): Rule.RuleListener {
  return {
    Property(node: unknown) {
      const n = node as EstreeAstNode;
      const valNode = n.value as EstreeAstNode | undefined;
      checker(
        {
          propName: getPropertyKeyName(n),
          val: valNode?.value,
          targetNode: valNode ?? n,
        },
        context
      );
    },
    JSXAttribute(node: unknown) {
      const n = node as EstreeAstNode;
      const valNode = n.value as EstreeAstNode | undefined;
      checker(
        {
          propName: getJsxAttrName(n),
          val: extractJsxAttributeValue(n),
          targetNode: valNode ?? n,
        },
        context
      );
    },
  } as unknown as Rule.RuleListener;
}

export const MD3_COLOR_PAIRINGS: Readonly<Record<string, readonly string[]>> = {
  primary: ['onPrimary'],
  primaryContainer: ['onPrimaryContainer'],
  secondary: ['onSecondary'],
  secondaryContainer: ['onSecondaryContainer'],
  tertiary: ['onTertiary'],
  tertiaryContainer: ['onTertiaryContainer'],
  error: ['onError'],
  errorContainer: ['onErrorContainer'],
  background: ['onBackground'],
  surface: ['onSurface', 'onSurfaceVariant'],
  surfaceDim: ['onSurface', 'onSurfaceVariant'],
  surfaceBright: ['onSurface', 'onSurfaceVariant'],
  surfaceContainerLowest: ['onSurface', 'onSurfaceVariant'],
  surfaceContainerLow: ['onSurface', 'onSurfaceVariant'],
  surfaceContainer: ['onSurface', 'onSurfaceVariant'],
  surfaceContainerHigh: ['onSurface', 'onSurfaceVariant'],
  surfaceContainerHighest: ['onSurface', 'onSurfaceVariant'],
  surfaceVariant: ['onSurfaceVariant', 'onSurface'],
  inverseSurface: ['inverseOnSurface'],
};

function extractObjectPropString(
  objNode: EstreeAstNode,
  names: readonly string[]
): { readonly prop: EstreeAstNode; readonly val: string } | undefined {
  for (const prop of objNode.properties ?? []) {
    const key = getPropertyKeyName(prop);
    const valNode = prop.value as EstreeAstNode | undefined;
    const val = valNode?.type === 'Literal' ? valNode.value : undefined;
    if (key && names.includes(key) && typeof val === 'string') {
      return { prop, val };
    }
  }
  return undefined;
}

function isInsideRecipeBase(node: EstreeAstNode): boolean {
  let curr = node.parent;
  while (curr) {
    if (curr.type === 'Property' && getPropertyKeyName(curr) === 'base') {
      return true;
    }
    curr = curr.parent;
  }
  return false;
}

export function checkObjectColorPairing(
  objNode: EstreeAstNode,
  context: TypedRuleContext
): void {
  const bgEntry = extractObjectPropString(objNode, ['bg', 'backgroundColor']);
  if (!bgEntry) return;
  const allowed = MD3_COLOR_PAIRINGS[bgEntry.val];
  if (!allowed) return;
  const colorEntry = extractObjectPropString(objNode, ['color']);
  if (colorEntry) {
    if (!allowed.includes(colorEntry.val)) {
      context.report({
        node: colorEntry.prop,
        messageId: 'invalidColorPairing',
        data: {
          bg: bgEntry.val,
          color: colorEntry.val,
          expected: allowed.join(' or '),
        },
      });
    }
    return;
  }
  if (isInsideRecipeBase(objNode)) {
    context.report({
      node: bgEntry.prop,
      messageId: 'missingColorPairing',
      data: { bg: bgEntry.val, expected: allowed.join(' or ') },
    });
  }
}

function findJsxAttrWithString(
  attrs: readonly EstreeAstNode[],
  names: readonly string[]
): { readonly attr: EstreeAstNode; readonly val: string } | undefined {
  for (const attr of attrs) {
    const name = getJsxAttrName(attr);
    const val = extractJsxAttributeValue(attr);
    if (names.includes(name) && typeof val === 'string') {
      return { attr, val };
    }
  }
  return undefined;
}

export function checkJsxColorPairing(
  jsxNode: EstreeAstNode,
  context: TypedRuleContext
): void {
  const attrs = jsxNode.attributes ?? [];
  const bg = findJsxAttrWithString(attrs, ['bg', 'backgroundColor']);
  const allowed = bg ? MD3_COLOR_PAIRINGS[bg.val] : undefined;
  const fg = findJsxAttrWithString(attrs, ['color']);
  if (bg && allowed && fg && !allowed.includes(fg.val)) {
    context.report({
      node: fg.attr,
      messageId: 'invalidColorPairing',
      data: { bg: bg.val, color: fg.val, expected: allowed.join(' or ') },
    });
  }
}
