/**
 * Typed AST Helpers for React Router Parsimony & Nested UI Hierarchy Validator
 */
import ts from 'typescript';

export interface ParsedRouteNode {
  readonly kind: 'index' | 'layout' | 'route';
  readonly path?: string;
  readonly file: string;
  readonly depth: number;
  readonly children: readonly ParsedRouteNode[];
}

export interface RouteParseResult {
  readonly error?: string;
  readonly node?: ParsedRouteNode;
}

function getStringArg(callNode: ts.CallExpression, idx: number): string | null {
  const arg = callNode.arguments[idx];
  return arg && ts.isStringLiteral(arg) ? arg.text : null;
}

function parseChildRoutesArray(
  childrenArg: ts.Expression,
  parentLabel: string,
  depth: number
): { readonly error?: string; readonly children?: ParsedRouteNode[] } {
  if (
    !ts.isArrayLiteralExpression(childrenArg) ||
    childrenArg.elements.length === 0
  ) {
    return {
      error: `\`${parentLabel}\` must define a non-empty children array.`,
    };
  }
  const children: ParsedRouteNode[] = [];
  for (const childEl of childrenArg.elements) {
    if (!ts.isCallExpression(childEl)) {
      return { error: `Child of ${parentLabel} must be a route call.` };
    }
    const parsed = parseRouteCall(childEl, depth + 1);
    if (parsed.error || !parsed.node) return { error: parsed.error };
    children.push(parsed.node);
  }
  return { children };
}

function parseIndexCall(
  callNode: ts.CallExpression,
  depth: number
): RouteParseResult {
  const file = getStringArg(callNode, 0);
  if (!file) return { error: '`index()` requires a string literal file path.' };
  return { node: { kind: 'index', file, depth, children: [] } };
}

function parseLayoutCall(
  callNode: ts.CallExpression,
  depth: number
): RouteParseResult {
  const file = getStringArg(callNode, 0);
  const childrenArg = callNode.arguments[1];
  if (!file) {
    return { error: '`layout()` requires a string literal file path.' };
  }
  if (!childrenArg) {
    return {
      error: `\`layout('${file}')\` must define a non-empty children array.`,
    };
  }
  const childRes = parseChildRoutesArray(
    childrenArg,
    `layout('${file}')`,
    depth
  );
  if (childRes.error || !childRes.children) return { error: childRes.error };
  return {
    node: { kind: 'layout', file, depth, children: childRes.children },
  };
}

function parseStandardRouteCall(
  callNode: ts.CallExpression,
  depth: number
): RouteParseResult {
  const pathText = getStringArg(callNode, 0);
  const fileText = getStringArg(callNode, 1);
  if (!pathText || !fileText) {
    return {
      error: '`route()` requires string literal path and file arguments.',
    };
  }
  if (pathText.replace(/^\/+|\/+$/g, '').includes('/')) {
    return {
      error: `Flat multi-segment route path '${pathText}' is prohibited. Nest child routes inside a parent route() to mirror the UI hierarchy.`,
    };
  }
  const childrenArg = callNode.arguments[2];
  if (!childrenArg) {
    return {
      node: {
        kind: 'route',
        path: pathText,
        file: fileText,
        depth,
        children: [],
      },
    };
  }
  const childRes = parseChildRoutesArray(
    childrenArg,
    `route('${pathText}')`,
    depth
  );
  if (childRes.error || !childRes.children) return { error: childRes.error };
  return {
    node: {
      kind: 'route',
      path: pathText,
      file: fileText,
      depth,
      children: childRes.children,
    },
  };
}

export function parseRouteCall(
  callNode: ts.CallExpression,
  depth = 1
): RouteParseResult {
  if (!ts.isIdentifier(callNode.expression)) {
    return {
      error:
        'Route entry must be a direct call to layout(), route(), or index()',
    };
  }
  const kind = callNode.expression.text;
  if (kind === 'prefix') {
    return {
      error:
        '`prefix()` is prohibited because it flattens URL segments without a parent UI `<Outlet />` layout.',
    };
  }
  if (kind === 'index') return parseIndexCall(callNode, depth);
  if (kind === 'layout') return parseLayoutCall(callNode, depth);
  if (kind === 'route') return parseStandardRouteCall(callNode, depth);
  return { error: `Unsupported route helper '${kind}()' in src/routes.ts.` };
}

export function flattenRouteNodes(
  nodes: readonly ParsedRouteNode[]
): ParsedRouteNode[] {
  const flatNodes: ParsedRouteNode[] = [];
  function flatten(items: readonly ParsedRouteNode[]): void {
    for (const n of items) {
      flatNodes.push(n);
      flatten(n.children);
    }
  }
  flatten(nodes);
  return flatNodes;
}
