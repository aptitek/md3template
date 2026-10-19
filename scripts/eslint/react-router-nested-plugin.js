/**
 * Custom ESLint Plugin: React Router Parsimony & Nested UI Hierarchy Enforcement
 *
 * Mechanically enforces that routes are used with parsimony and structured as a
 * nested route tree that mirrors the UI `<Outlet />` hierarchy:
 * 1. Top-level routes in `src/routes.ts` are capped (max 2) and MUST be nested
 *    containers (`layout(file, children)` or `route(path, file, children)`).
 * 2. Multi-segment flat route paths (`route('a/b', ...)`) are forbidden; each
 *    URL segment level must be a nested `route('a', ..., [route('b', ...)])`.
 * 3. `prefix(...)` without a layout route is forbidden because it flattens the UI tree.
 * 4. Declarative `<Routes>` / `<Route>` or `flatRoutes` imports are forbidden.
 * 5. Leaf route modules (`src/routes/*.tsx` except `layout.tsx`) cannot re-declare
 *    `<panda.main>`, which belongs to the parent layout route.
 */

const FORBIDDEN_ROUTER_SPECIFIERS = new Set([
  'Routes',
  'Route',
  'BrowserRouter',
  'HashRouter',
  'MemoryRouter',
  'createBrowserRouter',
  'createHashRouter',
  'createMemoryRouter',
]);

function unwrapTsExpression(node) {
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

function getChildrenArrayArg(callNode) {
  const calleeName =
    callNode.callee.type === 'Identifier' ? callNode.callee.name : '';
  if (calleeName === 'layout') {
    return callNode.arguments[1];
  }
  if (calleeName === 'route') {
    return callNode.arguments[2];
  }
  return null;
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
        docs: {
          description:
            'Enforce parsimonious, nested React Router configuration reflecting the UI hierarchy.',
        },
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
      create(context) {
        const filename = context.filename.replace(/\\/g, '/');
        const isRoutesConfig = filename.endsWith('src/routes.ts');
        const isLeafRouteModule =
          filename.includes('src/routes/') &&
          filename.endsWith('.tsx') &&
          !filename.endsWith('.stories.tsx') &&
          !filename.endsWith('.test.tsx') &&
          !filename.endsWith('/layout.tsx') &&
          !filename.endsWith('-layout.tsx');

        const options = context.options[0] ?? {};
        const maxTopLevel = options.maxTopLevelRoutes ?? 2;
        const maxTotal = options.maxTotalRoutes ?? 12;
        let totalRouteCalls = 0;

        return {
          ImportDeclaration(node) {
            if (node.source.value === '@react-router/fs-routes') {
              context.report({
                node,
                message:
                  'File-system `flatRoutes()` is prohibited. Declare routes parsimoniously in `src/routes.ts` using explicit nested `layout()` and `route()` hierarchies.',
              });
            }
            if (node.source.value === 'react-router') {
              for (const spec of node.specifiers) {
                if (
                  spec.type === 'ImportSpecifier' &&
                  spec.imported.type === 'Identifier' &&
                  FORBIDDEN_ROUTER_SPECIFIERS.has(spec.imported.name)
                ) {
                  context.report({
                    node: spec,
                    message: `Component-level or ad-hoc router API '${spec.imported.name}' is forbidden. Use nested route modules in \`src/routes.ts\` with \`<Outlet />\` to reflect the UI hierarchy.`,
                  });
                }
              }
            }
          },

          ExportDefaultDeclaration(node) {
            if (!isRoutesConfig) return;
            const expr = unwrapTsExpression(node.declaration);
            if (!expr || expr.type !== 'ArrayExpression') {
              context.report({
                node,
                message:
                  '`src/routes.ts` default export must be a `RouteConfig` array of nested routes.',
              });
              return;
            }

            if (expr.elements.length > maxTopLevel) {
              context.report({
                node: expr,
                message: `Route parsimony violation: found ${expr.elements.length} top-level route entries in \`src/routes.ts\` (max ${maxTopLevel}). Group screens under nested \`layout()\` or parent \`route()\` hierarchies.`,
              });
            }

            for (const element of expr.elements) {
              if (!element || element.type !== 'CallExpression') {
                context.report({
                  node: element ?? expr,
                  message:
                    'Top-level route entries in `src/routes.ts` must be nested `layout(file, children)` or `route(path, file, children)` calls.',
                });
                continue;
              }
              const childrenArg = getChildrenArrayArg(element);
              if (
                !childrenArg ||
                childrenArg.type !== 'ArrayExpression' ||
                childrenArg.elements.length === 0
              ) {
                context.report({
                  node: element,
                  message:
                    'Un-nested top-level route detected in `src/routes.ts`. Every top-level entry must be a parent `layout(file, [...children])` or `route(path, file, [...children])` reflecting the UI shell hierarchy.',
                });
              }
            }
          },

          CallExpression(node) {
            if (!isRoutesConfig || node.callee.type !== 'Identifier') return;
            const name = node.callee.name;

            if (name === 'prefix') {
              context.report({
                node,
                message:
                  '`prefix()` is forbidden because it flattens the UI hierarchy without a parent `<Outlet />`. Use `layout()` or nested `route(segment, file, children)` instead.',
              });
              return;
            }

            if (name === 'route' || name === 'index' || name === 'layout') {
              totalRouteCalls += 1;
              if (totalRouteCalls > maxTotal) {
                context.report({
                  node,
                  message: `Route parsimony budget exceeded (${totalRouteCalls} > ${maxTotal}). Decompose UI sub-sections into Atomic Design components rather than proliferating routes.`,
                });
              }
            }

            if (name === 'route') {
              const pathArg = node.arguments[0];
              if (
                pathArg &&
                pathArg.type === 'Literal' &&
                typeof pathArg.value === 'string'
              ) {
                const trimmed = pathArg.value.replace(/^\/+|\/+$/g, '');
                if (trimmed.includes('/')) {
                  context.report({
                    node: pathArg,
                    message: `Flat multi-segment route path '${pathArg.value}' is forbidden. Nest child routes inside a parent \`route()\` so the route tree reflects the UI \`<Outlet />\` hierarchy.`,
                  });
                }
              }
            }
          },

          JSXOpeningElement(node) {
            if (!isLeafRouteModule) return;
            if (
              node.name.type === 'JSXMemberExpression' &&
              node.name.object.type === 'JSXIdentifier' &&
              node.name.object.name === 'panda' &&
              node.name.property.name === 'main'
            ) {
              context.report({
                node,
                message:
                  'Leaf route modules must not declare `<panda.main>`. Render `<panda.main>` once in the parent layout route (`src/routes/layout.tsx`) and project child routes via `<Outlet />`.',
              });
            }
          },
        };
      },
    },
  },
};
