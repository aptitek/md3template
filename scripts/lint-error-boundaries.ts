#!/usr/bin/env node
/**
 * Strategic Error Boundary Validator
 *
 * Enforces that error boundaries exist at every strategic architectural level:
 * 1. Edge / Worker (`src/worker.ts`): try/catch boundary with `boundary: 'worker'` diagnostic payload.
 * 2. Root Application (`src/root.tsx`): exported `ErrorBoundary` with `boundary="root"`.
 * 3. Route Modules (`src/routes/*.tsx`): every route exports `ErrorBoundary` with `boundary="route:<name>"`.
 * 4. Section / Component Boundary (`src/components/error-boundary.tsx`): exports `ErrorBoundaryView` & `StrategicSectionBoundary` with `role="alert"` and `data-error-boundary`.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';

function isRouteModuleFile(entry: string): boolean {
  return (
    entry.endsWith('.tsx') &&
    !entry.endsWith('.stories.tsx') &&
    !entry.endsWith('.test.tsx') &&
    !entry.endsWith('.spec.tsx')
  );
}

function findRouteFiles(dir: string, files: string[] = []): string[] {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      findRouteFiles(full, files);
    } else if (isRouteModuleFile(entry)) {
      files.push(full);
    }
  }
  return files;
}

function hasExportModifier(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  const modifiers = ts.getModifiers(node);
  return (
    modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false
  );
}

function isNamedExportNode(node: ts.Node, functionName: string): boolean {
  if (!hasExportModifier(node)) return false;
  if (ts.isFunctionDeclaration(node)) {
    return node.name?.text === functionName;
  }
  if (ts.isVariableStatement(node)) {
    return node.declarationList.declarations.some(
      (decl) => ts.isIdentifier(decl.name) && decl.name.text === functionName
    );
  }
  return false;
}

export function hasExportedFunction(
  sourceText: string,
  fileName: string,
  functionName: string
): boolean {
  const sf = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true
  );
  let found = false;

  ts.forEachChild(sf, (node) => {
    if (isNamedExportNode(node, functionName)) {
      found = true;
    }
  });

  return found;
}

export function hasTryCatchInFunction(
  sourceText: string,
  fileName: string,
  functionName: string
): boolean {
  const sf = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true
  );
  let hasTry = false;

  function checkTry(node: ts.Node): void {
    if (ts.isTryStatement(node) && node.catchClause) {
      hasTry = true;
      return;
    }
    ts.forEachChild(node, checkTry);
  }

  ts.forEachChild(sf, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === functionName) {
      checkTry(node);
    }
  });

  return hasTry;
}

function checkWorkerBoundary(rootDir: string, errors: string[]): void {
  const workerPath = resolve(rootDir, 'src/worker.ts');
  if (!existsSync(workerPath)) {
    errors.push('❌ [Error Boundaries] Missing src/worker.ts');
    return;
  }
  const workerContent = readFileSync(workerPath, 'utf-8');
  if (!hasTryCatchInFunction(workerContent, 'src/worker.ts', 'handleFetch')) {
    errors.push(
      "❌ [Error Boundaries] 'src/worker.ts' must wrap 'handleFetch' in a try/catch edge boundary."
    );
  }
  if (!workerContent.includes("boundary: 'worker'")) {
    errors.push(
      "❌ [Error Boundaries] 'src/worker.ts' must include diagnostic `boundary: 'worker'` in error payload."
    );
  }
}

function checkComponentBoundary(rootDir: string, errors: string[]): void {
  const componentBoundaryPath = resolve(
    rootDir,
    'src/components/error-boundary.tsx'
  );
  if (!existsSync(componentBoundaryPath)) {
    errors.push(
      '❌ [Error Boundaries] Missing src/components/error-boundary.tsx'
    );
    return;
  }
  const compContent = readFileSync(componentBoundaryPath, 'utf-8');
  for (const fn of [
    'ErrorBoundaryView',
    'StrategicSectionBoundary',
    'resolveErrorInfo',
  ]) {
    if (
      !hasExportedFunction(compContent, 'src/components/error-boundary.tsx', fn)
    ) {
      errors.push(
        `❌ [Error Boundaries] 'src/components/error-boundary.tsx' must export '${fn}'.`
      );
    }
  }
  if (
    !compContent.includes('data-error-boundary') ||
    !compContent.includes('role="alert"')
  ) {
    errors.push(
      '❌ [Error Boundaries] \'src/components/error-boundary.tsx\' must render `role="alert"` and `data-error-boundary` attributes.'
    );
  }
}

function checkRootBoundary(rootDir: string, errors: string[]): void {
  const rootPath = resolve(rootDir, 'src/root.tsx');
  if (!existsSync(rootPath)) {
    errors.push('❌ [Error Boundaries] Missing src/root.tsx');
    return;
  }
  const rootContent = readFileSync(rootPath, 'utf-8');
  if (!hasExportedFunction(rootContent, 'src/root.tsx', 'ErrorBoundary')) {
    errors.push(
      "❌ [Error Boundaries] 'src/root.tsx' must export 'ErrorBoundary'."
    );
  }
  if (!rootContent.includes('boundary="root"')) {
    errors.push(
      '❌ [Error Boundaries] \'src/root.tsx\' ErrorBoundary must attribute `boundary="root"`.'
    );
  }
}

function checkRouteBoundaries(
  rootDir: string,
  routeFiles: readonly string[],
  errors: string[]
): void {
  for (const routeFile of routeFiles) {
    const rel = relative(rootDir, routeFile);
    const routeContent = readFileSync(routeFile, 'utf-8');
    if (!hasExportedFunction(routeContent, rel, 'ErrorBoundary')) {
      errors.push(
        `❌ [Error Boundaries] Route '${rel}' must export a dedicated 'ErrorBoundary' to isolate route failures.`
      );
    }
    if (!/boundary="route:[a-z0-9-]+"/.test(routeContent)) {
      errors.push(
        `❌ [Error Boundaries] Route '${rel}' ErrorBoundary must specify \`boundary="route:<name>"\` for fast fault localization.`
      );
    }
  }
}

export function validateStrategicErrorBoundaries(
  rootDir: string = process.cwd()
): {
  readonly routeCount: number;
  readonly errors: string[];
} {
  const errors: string[] = [];
  checkWorkerBoundary(rootDir, errors);
  checkComponentBoundary(rootDir, errors);
  checkRootBoundary(rootDir, errors);

  const routesDir = resolve(rootDir, 'src/routes');
  const routeFiles = findRouteFiles(routesDir);
  checkRouteBoundaries(rootDir, routeFiles, errors);

  return { routeCount: routeFiles.length, errors };
}

function runCli(): void {
  const { routeCount, errors } = validateStrategicErrorBoundaries();

  if (errors.length > 0) {
    for (const err of errors) {
      console.error(err);
    }
    process.exit(1);
  }

  console.log(
    `✅ Strategic error boundaries verified across Worker, Root, Section, and ${routeCount} route module(s).`
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  runCli();
}
