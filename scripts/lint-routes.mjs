#!/usr/bin/env node
/**
 * React Router Parsimony & Nested UI Hierarchy Validator
 *
 * Enforces that:
 * 1. Routes in `src/routes.ts` are used with parsimony (max 2 top-level layouts, max 12 total routes).
 * 2. Every top-level entry in `src/routes.ts` is a nested `layout(file, children)` or `route(path, file, children)`.
 * 3. Multi-segment flat paths (`route('a/b', ...)`) and `prefix()` are forbidden.
 * 4. Every parent/layout route module renders `<Outlet />` from `react-router`.
 * 5. Leaf route modules do not duplicate `<panda.main>`, which belongs to the parent layout route.
 * 6. Zero orphan route modules exist in `src/routes/`.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { unwrapExpression } from './lint-storybook-coverage.mjs';

const MAX_TOP_LEVEL_ROUTES = 2;
const MAX_TOTAL_ROUTES = 12;

function parseRouteCall(callNode, depth = 1) {
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

  if (kind === 'index') {
    const fileArg = callNode.arguments[0];
    if (!fileArg || !ts.isStringLiteral(fileArg)) {
      return { error: '`index()` requires a string literal file path.' };
    }
    return {
      node: { kind: 'index', file: fileArg.text, depth, children: [] },
    };
  }

  if (kind === 'layout') {
    const fileArg = callNode.arguments[0];
    const childrenArg = callNode.arguments[1];
    if (!fileArg || !ts.isStringLiteral(fileArg)) {
      return { error: '`layout()` requires a string literal file path.' };
    }
    if (
      !childrenArg ||
      !ts.isArrayLiteralExpression(childrenArg) ||
      childrenArg.elements.length === 0
    ) {
      return {
        error: `\`layout('${fileArg.text}')\` must define a non-empty children array.`,
      };
    }
    const children = [];
    for (const childEl of childrenArg.elements) {
      if (!ts.isCallExpression(childEl)) {
        return {
          error: `Child of layout('${fileArg.text}') must be a route call.`,
        };
      }
      const parsed = parseRouteCall(childEl, depth + 1);
      if (parsed.error) return parsed;
      children.push(parsed.node);
    }
    return {
      node: { kind: 'layout', file: fileArg.text, depth, children },
    };
  }

  if (kind === 'route') {
    const pathArg = callNode.arguments[0];
    const fileArg = callNode.arguments[1];
    const childrenArg = callNode.arguments[2];
    if (
      !pathArg ||
      !ts.isStringLiteral(pathArg) ||
      !fileArg ||
      !ts.isStringLiteral(fileArg)
    ) {
      return {
        error: '`route()` requires string literal path and file arguments.',
      };
    }
    const cleanPath = pathArg.text.replace(/^\/+|\/+$/g, '');
    if (cleanPath.includes('/')) {
      return {
        error: `Flat multi-segment route path '${pathArg.text}' is prohibited. Nest child routes inside a parent route() to mirror the UI hierarchy.`,
      };
    }
    const children = [];
    if (childrenArg) {
      if (
        !ts.isArrayLiteralExpression(childrenArg) ||
        childrenArg.elements.length === 0
      ) {
        return {
          error: `\`route('${pathArg.text}')\` children argument must be a non-empty array.`,
        };
      }
      for (const childEl of childrenArg.elements) {
        if (!ts.isCallExpression(childEl)) {
          return {
            error: `Child of route('${pathArg.text}') must be a route call.`,
          };
        }
        const parsed = parseRouteCall(childEl, depth + 1);
        if (parsed.error) return parsed;
        children.push(parsed.node);
      }
    }
    return {
      node: {
        kind: 'route',
        path: pathArg.text,
        file: fileArg.text,
        depth,
        children,
      },
    };
  }

  return { error: `Unsupported route helper '${kind}()' in src/routes.ts.` };
}

export function analyzeRoutesConfigSource(
  sourceText,
  fileName = 'src/routes.ts'
) {
  const sf = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true
  );
  const errors = [];
  const tree = [];

  let defaultArray = null;
  ts.forEachChild(sf, (node) => {
    if (ts.isExportAssignment(node) && !node.isExportEquals) {
      const unwrapped = unwrapExpression(node.expression);
      if (ts.isArrayLiteralExpression(unwrapped)) {
        defaultArray = unwrapped;
      }
    }
  });

  if (!defaultArray) {
    return {
      errors: [
        '❌ [Route Hierarchy] `src/routes.ts` must export a default array of route definitions.',
      ],
      tree: [],
      flatNodes: [],
    };
  }

  if (
    defaultArray.elements.length === 0 ||
    defaultArray.elements.length > MAX_TOP_LEVEL_ROUTES
  ) {
    errors.push(
      `❌ [Route Parsimony] \`src/routes.ts\` has ${defaultArray.elements.length} top-level entries (allowed: 1..${MAX_TOP_LEVEL_ROUTES}). Group routes under nested layouts.`
    );
  }

  for (const el of defaultArray.elements) {
    if (!ts.isCallExpression(el)) {
      errors.push(
        '❌ [Route Hierarchy] Top-level entry in `src/routes.ts` must be a `layout()` or `route()` call.'
      );
      continue;
    }
    const parsed = parseRouteCall(el, 1);
    if (parsed.error) {
      errors.push(`❌ [Route Hierarchy] ${parsed.error}`);
      continue;
    }
    if (parsed.node.children.length === 0) {
      errors.push(
        `❌ [Route Hierarchy] Top-level route '${parsed.node.file}' has no nested children. Top-level routes in \`src/routes.ts\` must be parent \`layout(file, children)\` or \`route(path, file, children)\` containers reflecting the UI hierarchy.`
      );
    }
    tree.push(parsed.node);
  }

  const flatNodes = [];
  function flatten(nodes) {
    for (const n of nodes) {
      flatNodes.push(n);
      flatten(n.children);
    }
  }
  flatten(tree);

  if (flatNodes.length > MAX_TOTAL_ROUTES) {
    errors.push(
      `❌ [Route Parsimony] Total route count (${flatNodes.length}) exceeds parsimony budget (${MAX_TOTAL_ROUTES}). Use Atomic Design components for intra-page UI composition.`
    );
  }

  return { errors, tree, flatNodes };
}

export function moduleRendersOutlet(sourceText, fileName = 'layout.tsx') {
  const sf = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true
  );
  let hasOutletJsx = false;

  function visit(node) {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      ts.isIdentifier(node.tagName) &&
      node.tagName.text === 'Outlet'
    ) {
      hasOutletJsx = true;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return hasOutletJsx;
}

export function validateRouteHierarchy(rootDir = process.cwd()) {
  const routesConfigPath = resolve(rootDir, 'src/routes.ts');
  if (!existsSync(routesConfigPath)) {
    return {
      errors: ['❌ [Route Hierarchy] Missing `src/routes.ts`.'],
      flatNodes: [],
    };
  }

  const configSource = readFileSync(routesConfigPath, 'utf-8');
  const { errors, flatNodes } = analyzeRoutesConfigSource(
    configSource,
    'src/routes.ts'
  );

  const registeredFiles = new Set();

  for (const routeNode of flatNodes) {
    const absModulePath = resolve(rootDir, 'src', routeNode.file);
    const relModulePath = relative(rootDir, absModulePath);
    registeredFiles.add(absModulePath);

    if (!existsSync(absModulePath)) {
      errors.push(
        `❌ [Route Hierarchy] Route module '${relModulePath}' referenced in \`src/routes.ts\` does not exist.`
      );
      continue;
    }

    const moduleSource = readFileSync(absModulePath, 'utf-8');
    const isParent = routeNode.children.length > 0;

    if (isParent && !moduleRendersOutlet(moduleSource, relModulePath)) {
      errors.push(
        `❌ [Route Hierarchy] Parent/layout route '${relModulePath}' has ${routeNode.children.length} child route(s) but does not render \`<Outlet />\`.`
      );
    }

    if (!isParent && moduleSource.includes('<panda.main')) {
      errors.push(
        `❌ [Route Parsimony] Leaf route '${relModulePath}' duplicates \`<panda.main>\`. Keep \`<panda.main>\` in the parent layout route and render leaf content into \`<Outlet />\`.`
      );
    }
  }

  const routesDir = resolve(rootDir, 'src/routes');
  if (existsSync(routesDir)) {
    const diskRouteModules = readdirSync(routesDir, { recursive: true })
      .filter(
        (entry) =>
          typeof entry === 'string' &&
          entry.endsWith('.tsx') &&
          !entry.endsWith('.stories.tsx') &&
          !entry.endsWith('.test.tsx') &&
          !entry.endsWith('.spec.tsx')
      )
      .map((entry) => join(routesDir, entry));

    for (const diskFile of diskRouteModules) {
      if (!registeredFiles.has(diskFile)) {
        errors.push(
          `❌ [Route Parsimony] Orphan route module '${relative(rootDir, diskFile)}' is not mounted in the nested \`src/routes.ts\` hierarchy.`
        );
      }
    }
  }

  return { errors, flatNodes };
}

function runCli() {
  const { errors, flatNodes } = validateRouteHierarchy();
  if (errors.length > 0) {
    for (const err of errors) console.error(err);
    console.error(
      `\nFatal: ${errors.length} route parsimony / nested hierarchy violation(s) detected.`
    );
    process.exit(1);
  }

  const parents = flatNodes.filter((n) => n.children.length > 0).length;
  const leaves = flatNodes.length - parents;
  console.log(
    `✅ Route parsimony & nested UI hierarchy verified (${parents} parent layout(s), ${leaves} nested child route(s)).`
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  runCli();
}
