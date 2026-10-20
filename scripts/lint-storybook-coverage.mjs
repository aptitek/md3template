#!/usr/bin/env node
/**
 * Storybook Component Coverage & Strict CSF3 Format Validator
 * Enforces that 100% of React components in src/ have dedicated Storybook stories
 * and that every story file strictly follows Component Story Format 3 (CSF3).
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';

const IGNORED_PATTERNS = [
  /main\.tsx$/,
  /\.stories\.(ts|tsx)$/,
  /\.(test|spec)\.(ts|tsx)$/,
  /\.d\.ts$/,
];

export function isIgnored(filePath) {
  return IGNORED_PATTERNS.some((pattern) => pattern.test(filePath));
}

export function findTsxFiles(dir, fileList = []) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      findTsxFiles(fullPath, fileList);
    } else if (entry.endsWith('.tsx') && !isIgnored(fullPath)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

export function findStoryFiles(dir) {
  return readdirSync(dir, { recursive: true })
    .filter(
      (entry) =>
        typeof entry === 'string' && /\.stories\.(ts|tsx|js|jsx)$/.test(entry)
    )
    .map((entry) => join(dir, entry));
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

export function hasExportedComponent(sourceFile) {
  let found = false;
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isExportAssignment(node)) {
      found = true;
      return;
    }
    if (
      ts.isExportDeclaration(node) &&
      node.exportClause &&
      ts.isNamedExports(node.exportClause)
    ) {
      for (const spec of node.exportClause.elements) {
        if (/^[A-Z]/.test(spec.name.text)) {
          found = true;
        }
      }
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

export function unwrapExpression(expr) {
  let current = expr;
  while (
    current &&
    (ts.isSatisfiesExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isParenthesizedExpression(current))
  ) {
    current = current.expression;
  }
  return current;
}

function hasComponentProperty(objLiteral) {
  return objLiteral.properties.some((prop) => {
    if (
      (ts.isPropertyAssignment(prop) ||
        ts.isShorthandPropertyAssignment(prop)) &&
      ts.isIdentifier(prop.name)
    ) {
      return prop.name.text === 'component';
    }
    return false;
  });
}

function detectLegacyCalls(sourceFile) {
  let legacyError = null;
  function visit(node) {
    if (legacyError) return;
    if (ts.isCallExpression(node)) {
      if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'storiesOf'
      ) {
        legacyError =
          'Legacy storiesOf() API is prohibited; use Component Story Format (CSF3)';
        return;
      }
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'bind'
      ) {
        legacyError =
          'Legacy CSF2 Template.bind({}) format is prohibited; use CSF3 StoryObj object notation';
        return;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return legacyError;
}

export function validateStorySource(content, filePath = 'story.stories.tsx') {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );

  const legacyCallError = detectLegacyCalls(sourceFile);
  if (legacyCallError) {
    return { valid: false, error: legacyCallError };
  }

  const topLevelVars = new Map();
  let defaultExportExpr = null;
  const named = [];
  let csfError = null;

  ts.forEachChild(sourceFile, (node) => {
    if (csfError) return;

    if (ts.isVariableStatement(node)) {
      const hasExport = node.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.ExportKeyword
      );
      const hasDefaultMod = node.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.DefaultKeyword
      );

      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.initializer) {
          topLevelVars.set(decl.name.text, decl.initializer);
          if (hasExport && !hasDefaultMod) {
            const unwrapped = unwrapExpression(decl.initializer);
            if (
              ts.isArrowFunction(unwrapped) ||
              ts.isFunctionExpression(unwrapped)
            ) {
              csfError = `Story export '${decl.name.text}' uses legacy CSF1/CSF2 function format; stories must be CSF3 objects`;
              return;
            }
            if (!ts.isObjectLiteralExpression(unwrapped)) {
              csfError = `Story export '${decl.name.text}' must be a CSF3 story object literal`;
              return;
            }
            if (!/^[A-Z]/.test(decl.name.text)) {
              csfError = `Story export '${decl.name.text}' must use PascalCase naming in CSF3`;
              return;
            }
            named.push(decl.name.text);
          }
        }
      }
    }

    if (ts.isFunctionDeclaration(node)) {
      const hasExport = node.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.ExportKeyword
      );
      if (hasExport) {
        const fnName = node.name?.text ?? 'anonymous';
        csfError = `Story export '${fnName}' uses legacy CSF1/CSF2 function declaration; stories must be CSF3 objects`;
        return;
      }
    }

    if (ts.isExportAssignment(node) && !node.isExportEquals) {
      defaultExportExpr = node.expression;
    }
  });

  if (csfError) {
    return { valid: false, error: csfError };
  }

  if (!defaultExportExpr) {
    return { valid: false, error: 'Missing default export (CSF3 meta)' };
  }

  let resolvedMeta = unwrapExpression(defaultExportExpr);
  if (ts.isIdentifier(resolvedMeta)) {
    const varInit = topLevelVars.get(resolvedMeta.text);
    if (varInit) {
      resolvedMeta = unwrapExpression(varInit);
    }
  }

  if (
    !resolvedMeta ||
    !ts.isObjectLiteralExpression(resolvedMeta) ||
    !hasComponentProperty(resolvedMeta)
  ) {
    return {
      valid: false,
      error:
        'CSF3 default export (meta) must be an object literal defining a `component` property',
    };
  }

  if (named.length === 0) {
    return { valid: false, error: 'Missing named CSF3 story export(s)' };
  }

  return { valid: true, namedStories: named };
}

export function validateStoryFile(storyPath) {
  if (!existsSync(storyPath)) {
    return { valid: false, error: 'Story file does not exist on disk' };
  }

  const content = readFileSync(storyPath, 'utf-8');
  return validateStorySource(content, storyPath);
}

export function validateStorybookCoverage(rootDir = process.cwd()) {
  const srcDir = resolve(rootDir, 'src');
  const tsxFiles = findTsxFiles(srcDir);
  const componentFiles = tsxFiles.filter(isComponentFile);
  const allStoryFiles = findStoryFiles(srcDir);
  const errors = [];
  const verified = [];
  const checkedStories = new Set();

  for (const componentPath of componentFiles) {
    const rel = relative(rootDir, componentPath);
    const expectedStory = componentPath.replace(/\.tsx$/, '.stories.tsx');
    const relStory = relative(rootDir, expectedStory);
    checkedStories.add(expectedStory);

    const storyResult = validateStoryFile(expectedStory);
    if (!storyResult.valid) {
      errors.push(
        `❌ [Storybook CSF3] Component '${rel}' lacks valid CSF3 story at '${relStory}': ${storyResult.error}`
      );
    } else {
      verified.push({
        component: rel,
        story: relStory,
        stories: storyResult.namedStories,
      });
    }
  }

  for (const storyPath of allStoryFiles) {
    if (checkedStories.has(storyPath)) continue;
    const relStory = relative(rootDir, storyPath);
    const storyResult = validateStoryFile(storyPath);
    if (!storyResult.valid) {
      errors.push(
        `❌ [Storybook CSF3] Story file '${relStory}' violates CSF3 format: ${storyResult.error}`
      );
    }
  }

  return { componentFiles, verified, errors };
}

function runCli() {
  const { componentFiles, verified, errors } = validateStorybookCoverage();

  if (errors.length > 0) {
    for (const err of errors) console.error(err);
    console.error(
      `\nFatal: ${errors.length} Storybook CSF3 / coverage violation(s) detected.`
    );
    process.exit(1);
  }

  console.log(
    `✅ Storybook CSF3 & coverage verified: ${verified.length}/${componentFiles.length} component(s) have strict CSF3 stories.`
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
