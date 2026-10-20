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
import {
  flattenRouteNodes,
  type ParsedRouteNode,
  parseRouteCall,
} from './route-ast-helpers.ts';
import {
  findDefaultExportArray,
  moduleRendersOutlet,
} from './ts-ast-helpers.ts';

export { moduleRendersOutlet, type ParsedRouteNode };

const MAX_TOP_LEVEL_ROUTES = 2;
const MAX_TOTAL_ROUTES = 12;

function parseTopLevelRouteElement(
  el: ts.Expression,
  errors: string[],
  tree: ParsedRouteNode[]
): void {
  if (!ts.isCallExpression(el)) {
    errors.push(
      '❌ [Route Hierarchy] Top-level entry in `src/routes.ts` must be a `layout()` or `route()` call.'
    );
    return;
  }
  const parsed = parseRouteCall(el, 1);
  if (parsed.error || !parsed.node) {
    errors.push(`❌ [Route Hierarchy] ${parsed.error ?? 'Invalid route call'}`);
    return;
  }
  if (parsed.node.children.length === 0) {
    errors.push(
      `❌ [Route Hierarchy] Top-level route '${parsed.node.file}' has no nested children. Top-level routes in \`src/routes.ts\` must be parent \`layout(file, children)\` or \`route(path, file, children)\` containers reflecting the UI hierarchy.`
    );
  }
  tree.push(parsed.node);
}

export function analyzeRoutesConfigSource(
  sourceText: string,
  fileName = 'src/routes.ts'
): {
  readonly errors: string[];
  readonly tree: ParsedRouteNode[];
  readonly flatNodes: ParsedRouteNode[];
} {
  const sf = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true
  );
  const defaultArray = findDefaultExportArray(sf);
  if (!defaultArray) {
    return {
      errors: [
        '❌ [Route Hierarchy] `src/routes.ts` must export a default array of route definitions.',
      ],
      tree: [],
      flatNodes: [],
    };
  }

  const errors: string[] = [];
  const tree: ParsedRouteNode[] = [];
  const topCount = defaultArray.elements.length;

  if (topCount === 0 || topCount > MAX_TOP_LEVEL_ROUTES) {
    errors.push(
      `❌ [Route Parsimony] \`src/routes.ts\` has ${topCount} top-level entries (allowed: 1..${MAX_TOP_LEVEL_ROUTES}). Group routes under nested layouts.`
    );
  }

  for (const el of defaultArray.elements) {
    parseTopLevelRouteElement(el, errors, tree);
  }

  const flatNodes = flattenRouteNodes(tree);
  if (flatNodes.length > MAX_TOTAL_ROUTES) {
    errors.push(
      `❌ [Route Parsimony] Total route count (${flatNodes.length}) exceeds parsimony budget (${MAX_TOTAL_ROUTES}). Use Atomic Design components for intra-page UI composition.`
    );
  }

  return { errors, tree, flatNodes };
}

function checkRegisteredRouteModule(
  rootDir: string,
  routeNode: ParsedRouteNode,
  errors: string[]
): string {
  const absModulePath = resolve(rootDir, 'src', routeNode.file);
  const relModulePath = relative(rootDir, absModulePath);
  if (!existsSync(absModulePath)) {
    errors.push(
      `❌ [Route Hierarchy] Route module '${relModulePath}' referenced in \`src/routes.ts\` does not exist.`
    );
    return absModulePath;
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
  return absModulePath;
}

function checkOrphanRouteModules(
  rootDir: string,
  registeredFiles: ReadonlySet<string>,
  errors: string[]
): void {
  const routesDir = resolve(rootDir, 'src/routes');
  if (!existsSync(routesDir)) return;
  const diskRouteModules = readdirSync(routesDir, { recursive: true })
    .filter(
      (entry): entry is string =>
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

export function validateRouteHierarchy(rootDir: string = process.cwd()): {
  readonly errors: string[];
  readonly flatNodes: ParsedRouteNode[];
} {
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
  const registeredFiles = new Set<string>();
  for (const routeNode of flatNodes) {
    registeredFiles.add(checkRegisteredRouteModule(rootDir, routeNode, errors));
  }
  checkOrphanRouteModules(rootDir, registeredFiles, errors);
  return { errors, flatNodes };
}

function runCli(): void {
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
