#!/usr/bin/env node
/**
 * Storybook Component Coverage Validator
 * Enforces that 100% of React components in src/ have dedicated, valid Storybook CSF3 stories.
 */

import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import ts from 'typescript';

const IGNORED_PATTERNS = [
  /main\.tsx$/,
  /\.stories\.tsx$/,
  /\.(test|spec)\.tsx$/,
  /\.d\.ts$/,
];

export function isIgnored(filePath) {
  return IGNORED_PATTERNS.some((pattern) => pattern.test(filePath));
}

export function findTsxFiles(dir, fileList = []) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      findTsxFiles(fullPath, fileList);
    } else if (entry.endsWith('.tsx') && !isIgnored(fullPath)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function hasJsxSyntax(sourceFile) {
  let found = false;
  function visit(node) {
    if (
      ts.isJsxElement(node) ||
      ts.isJsxSelfClosingElement(node) ||
      ts.isJsxFragment(node)
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return found;
}

function hasExportedComponent(sourceFile) {
  let found = false;
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isExportAssignment(node)) {
      found = true;
      return;
    }
    const hasExport = node.modifiers?.some(
      (m) => m.kind === ts.SyntaxKind.ExportKeyword
    );
    if (!hasExport) return;

    if (ts.isFunctionDeclaration(node) && node.name) {
      if (/^[A-Z]/.test(node.name.text)) found = true;
    } else if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && /^[A-Z]/.test(decl.name.text)) {
          found = true;
        }
      }
    }
  });
  return found;
}

export function isComponentFile(filePath) {
  if (isIgnored(filePath)) return false;
  const content = readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );
  return hasJsxSyntax(sourceFile) && hasExportedComponent(sourceFile);
}

export function validateStoryFile(storyPath) {
  if (!existsSync(storyPath)) {
    return { valid: false, error: 'Story file does not exist on disk' };
  }

  const content = readFileSync(storyPath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    storyPath,
    content,
    ts.ScriptTarget.Latest,
    true
  );

  let hasDefault = false;
  const named = [];

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isExportAssignment(node)) hasDefault = true;
    const hasExport = node.modifiers?.some(
      (m) => m.kind === ts.SyntaxKind.ExportKeyword
    );
    const hasDefaultMod = node.modifiers?.some(
      (m) => m.kind === ts.SyntaxKind.DefaultKeyword
    );
    if (hasExport && hasDefaultMod) hasDefault = true;
    if (hasExport && !hasDefaultMod && ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) named.push(decl.name.text);
      }
    }
  });

  if (!hasDefault) {
    return { valid: false, error: 'Missing default export (CSF3 meta)' };
  }
  if (named.length === 0) {
    return { valid: false, error: 'Missing named story export(s)' };
  }
  return { valid: true, namedStories: named };
}

export function validateStorybookCoverage(rootDir = process.cwd()) {
  const srcDir = resolve(rootDir, 'src');
  const tsxFiles = findTsxFiles(srcDir);
  const componentFiles = tsxFiles.filter(isComponentFile);
  const errors = [];
  const verified = [];

  for (const componentPath of componentFiles) {
    const rel = relative(rootDir, componentPath);
    const expectedStory = componentPath.replace(/\.tsx$/, '.stories.tsx');
    const relStory = relative(rootDir, expectedStory);

    const storyResult = validateStoryFile(expectedStory);
    if (!storyResult.valid) {
      errors.push(
        `❌ [Storybook Coverage] Component '${rel}' lacks valid story companion at '${relStory}': ${storyResult.error}`
      );
    } else {
      verified.push({
        component: rel,
        story: relStory,
        stories: storyResult.namedStories,
      });
    }
  }

  return { componentFiles, verified, errors };
}

function runCli() {
  const { componentFiles, verified, errors } = validateStorybookCoverage();

  if (errors.length > 0) {
    for (const err of errors) console.error(err);
    console.error(
      `\nFatal: ${errors.length} component(s) fail Storybook coverage enforcement.`
    );
    process.exit(1);
  }

  console.log(
    `✅ Storybook coverage verified: ${verified.length}/${componentFiles.length} component(s) have valid CSF3 stories.`
  );
  for (const v of verified) {
    console.log(`   - ${v.component} -> ${v.story} (${v.stories.join(', ')})`);
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  runCli();
}
