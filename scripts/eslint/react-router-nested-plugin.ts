/**
 * Custom ESLint Plugin: React Router Parsimony & Nested UI Hierarchy Enforcement
 *
 * Mechanically enforces that routes are used with parsimony and structured as a
 * nested route tree that mirrors the UI `<Outlet />` hierarchy.
 */
import type { ESLint, Rule } from 'eslint';
import {
  type EstreeAstNode,
  getCalleeIdentifierName,
  type TypedRuleContext,
  unwrapTsExpression,
} from './ast-helpers.ts';

const FORBIDDEN_ROUTER_SPECIFIERS: ReadonlySet<string> = new Set([
  'Routes',
  'Route',
  'BrowserRouter',
  'HashRouter',
  'MemoryRouter',
  'createBrowserRouter',
  'createHashRouter',
  'createMemoryRouter',
]);

const COUNTED_ROUTE_HELPERS: ReadonlySet<string> = new Set([
  'route',
  'index',
  'layout',
]);

function getChildrenArrayArg(
  callNode: EstreeAstNode
): EstreeAstNode | null | undefined {
  const calleeName = getCalleeIdentifierName(callNode);
  if (calleeName === 'layout') return callNode.arguments?.[1];
  if (calleeName === 'route') return callNode.arguments?.[2];
  return null;
}

function getForbiddenRouterSpecifierName(spec: EstreeAstNode): string | null {
  if (spec.type !== 'ImportSpecifier') return null;
  const imported = spec.imported;
  const name =
    imported?.type === 'Identifier' && typeof imported.name === 'string'
      ? imported.name
      : '';
  return FORBIDDEN_ROUTER_SPECIFIERS.has(name) ? name : null;
}

function checkRouterImports(
  context: TypedRuleContext,
  node: EstreeAstNode
): void {
  const sourceVal = node.source?.value;
  if (sourceVal === '@react-router/fs-routes') {
    context.report({
      node,
      message:
        'File-system `flatRoutes()` is prohibited. Declare routes parsimoniously in `src/routes.ts` using explicit nested `layout()` and `route()` hierarchies.',
    });
    return;
  }
  if (sourceVal !== 'react-router') return;

  for (const spec of node.specifiers ?? []) {
    const forbiddenName = getForbiddenRouterSpecifierName(spec);
    if (forbiddenName) {
      context.report({
        node: spec,
        message: `Component-level or ad-hoc router API '${forbiddenName}' is forbidden. Use nested route modules in \`src/routes.ts\` with \`<Outlet />\` to reflect the UI hierarchy.`,
      });
    }
  }
}

function checkTopLevelRouteElement(
  context: TypedRuleContext,
  element: EstreeAstNode | null,
  fallbackNode: EstreeAstNode
): void {
  if (!element || element.type !== 'CallExpression') {
    context.report({
      node: element ?? fallbackNode,
      message:
        'Top-level route entries in `src/routes.ts` must be nested `layout(file, children)` or `route(path, file, children)` calls.',
    });
    return;
  }
  const childrenArg = getChildrenArrayArg(element);
  if (
    !childrenArg ||
    childrenArg.type !== 'ArrayExpression' ||
    (childrenArg.elements ?? []).length === 0
  ) {
    context.report({
      node: element,
      message:
        'Un-nested top-level route detected in `src/routes.ts`. Every top-level entry must be a parent `layout(file, [...children])` or `route(path, file, [...children])` reflecting the UI shell hierarchy.',
    });
  }
}

function checkRoutesDefaultExport(
  context: TypedRuleContext,
  node: EstreeAstNode,
  maxTopLevel: number
): void {
  const expr = unwrapTsExpression(node.declaration);
  if (!expr || expr.type !== 'ArrayExpression') {
    context.report({
      node,
      message:
        '`src/routes.ts` default export must be a `RouteConfig` array of nested routes.',
    });
    return;
  }

  const elements = expr.elements ?? [];
  if (elements.length > maxTopLevel) {
    context.report({
      node: expr,
      message: `Route parsimony violation: found ${elements.length} top-level route entries in \`src/routes.ts\` (max ${maxTopLevel}). Group screens under nested \`layout()\` or parent \`route()\` hierarchies.`,
    });
  }

  for (const element of elements) {
    checkTopLevelRouteElement(context, element, expr);
  }
}

function checkFlatRouteSegment(
  context: TypedRuleContext,
  node: EstreeAstNode
): void {
  const pathArg = node.arguments?.[0];
  if (pathArg?.type !== 'Literal' || typeof pathArg.value !== 'string') return;
  const trimmed = pathArg.value.replace(/^\/+|\/+$/g, '');
  if (trimmed.includes('/')) {
    context.report({
      node: pathArg,
      message: `Flat multi-segment route path '${pathArg.value}' is forbidden. Nest child routes inside a parent \`route()\` so the route tree reflects the UI \`<Outlet />\` hierarchy.`,
    });
  }
}

function isPandaMainElement(node: EstreeAstNode): boolean {
  const nameNode = node.name;
  if (!nameNode || typeof nameNode === 'string') return false;
  return (
    nameNode.type === 'JSXMemberExpression' &&
    nameNode.object?.type === 'JSXIdentifier' &&
    nameNode.object.name === 'panda' &&
    nameNode.property?.name === 'main'
  );
}

function isLeafRouteFilename(filename: string): boolean {
  return (
    filename.includes('src/routes/') &&
    filename.endsWith('.tsx') &&
    !filename.endsWith('.stories.tsx') &&
    !filename.endsWith('.test.tsx') &&
    !filename.endsWith('/layout.tsx') &&
    !filename.endsWith('-layout.tsx')
  );
}

function checkRouteCallExpression(
  state: {
    readonly context: TypedRuleContext;
    readonly maxTotal: number;
    totalRouteCalls: number;
  },
  node: EstreeAstNode
): void {
  const name = getCalleeIdentifierName(node);
  if (!name) return;

  if (name === 'prefix') {
    state.context.report({
      node,
      message:
        '`prefix()` is forbidden because it flattens the UI hierarchy without a parent `<Outlet />`. Use `layout()` or nested `route(segment, file, children)` instead.',
    });
    return;
  }
  if (COUNTED_ROUTE_HELPERS.has(name)) {
    state.totalRouteCalls += 1;
    if (state.totalRouteCalls > state.maxTotal) {
      state.context.report({
        node,
        message: `Route parsimony budget exceeded (${state.totalRouteCalls} > ${state.maxTotal}). Decompose UI sub-sections into Atomic Design components rather than proliferating routes.`,
      });
    }
  }
  if (name === 'route') {
    checkFlatRouteSegment(state.context, node);
  }
}

function resolveNumericOption(val: unknown, fallback: number): number {
  return typeof val === 'number' ? val : fallback;
}

export const reactRouterNestedPlugin = {
  meta: {
    name: 'eslint-plugin-react-router-nested',
    version: '1.0.0',
  },
  rules: {
    'enforce-nested-routes': {
      meta: {
        type: 'problem',
        schema: [
          {
            type: 'object',
            properties: {
              maxTopLevelRoutes: { type: 'number' },
              maxTotalRoutes: { type: 'number' },
            },
            additionalProperties: false,
          },
        ],
      },
      create(context: TypedRuleContext): Rule.RuleListener {
        const filename = context.filename.replace(/\\/g, '/');
        const isRoutesConfig = filename.endsWith('src/routes.ts');
        const isLeafRouteModule = isLeafRouteFilename(filename);

        const options = context.options[0] ?? {};
        const maxTopLevel = resolveNumericOption(options.maxTopLevelRoutes, 2);
        const maxTotal = resolveNumericOption(options.maxTotalRoutes, 12);
        const routeCallState = { context, maxTotal, totalRouteCalls: 0 };

        return {
          ImportDeclaration(node: unknown) {
            checkRouterImports(context, node as EstreeAstNode);
          },
          ExportDefaultDeclaration(node: unknown) {
            if (isRoutesConfig) {
              checkRoutesDefaultExport(
                context,
                node as EstreeAstNode,
                maxTopLevel
              );
            }
          },
          CallExpression(node: unknown) {
            if (isRoutesConfig) {
              checkRouteCallExpression(routeCallState, node as EstreeAstNode);
            }
          },
          JSXOpeningElement(node: unknown) {
            const jsxNode = node as EstreeAstNode;
            if (isLeafRouteModule && isPandaMainElement(jsxNode)) {
              context.report({
                node: jsxNode,
                message:
                  'Leaf route modules must not declare `<panda.main>`. Render `<panda.main>` once in the parent layout route (`src/routes/layout.tsx`) and project child routes via `<Outlet />`.',
              });
            }
          },
        } as unknown as Rule.RuleListener;
      },
    },
  },
} as unknown as ESLint.Plugin;
