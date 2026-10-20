#!/usr/bin/env node
/**
 * Storybook Component Coverage & Strict CSF3 Format Validator
 * Enforces that 100% of React components in src/ have dedicated Storybook stories
 * and that every story file strictly follows Component Story Format 3 (CSF3).
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';
import {
  collectStoryAstInfo,
  detectLegacyCalls,
  hasExportedComponent,
  hasJsxSyntax,
  unwrapExpression,
} from './ts-ast-helpers.ts';

export { hasExportedComponent, unwrapExpression };

export interface StoryValidationResult {
  readonly valid: boolean;
  readonly error?: string;
  readonly namedStories?: readonly string[];
}

export interface VerifiedComponentStory {
  readonly component: string;
  readonly story: string;
  readonly stories: readonly string[];
}

const IGNORED_PATTERNS: readonly RegExp[] = [
  /main\.tsx$/,
  /\.stories\.(ts|tsx)$/,
  /\.(test|spec)\.(ts|tsx)$/,
  /\.d\.ts$/,
];

export function isIgnored(filePath: string): boolean {
  return IGNORED_PATTERNS.some((pattern) => pattern.test(filePath));
}

export function findTsxFiles(dir: string, fileList: string[] = []): string[] {
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

export function findStoryFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true })
    .filter(
      (entry): entry is string =>
        typeof entry === 'string' && /\.stories\.(ts|tsx|js|jsx)$/.test(entry)
    )
    .map((entry) => join(dir, entry));
}

export function isComponentFile(filePath: string): boolean {
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

function hasComponentProperty(objLiteral: ts.ObjectLiteralExpression): boolean {
  return objLiteral.properties.some(
    (prop) =>
      (ts.isPropertyAssignment(prop) ||
        ts.isShorthandPropertyAssignment(prop)) &&
      ts.isIdentifier(prop.name) &&
      prop.name.text === 'component'
  );
}

function isValidMetaExport(
  defaultExportExpr: ts.Expression | null,
  topLevelVars: ReadonlyMap<string, ts.Expression>
): boolean {
  if (!defaultExportExpr) return false;
  let resolvedMeta = unwrapExpression(defaultExportExpr);
  if (ts.isIdentifier(resolvedMeta)) {
    const varInit = topLevelVars.get(resolvedMeta.text);
    if (varInit) {
      resolvedMeta = unwrapExpression(varInit);
    }
  }
  return (
    ts.isObjectLiteralExpression(resolvedMeta) &&
    hasComponentProperty(resolvedMeta)
  );
}

export function validateStorySource(
  content: string,
  filePath = 'story.stories.tsx'
): StoryValidationResult {
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

  const state = collectStoryAstInfo(sourceFile);
  if (state.csfError) {
    return { valid: false, error: state.csfError };
  }
  if (!state.defaultExportExpr) {
    return { valid: false, error: 'Missing default export (CSF3 meta)' };
  }
  if (!isValidMetaExport(state.defaultExportExpr, state.topLevelVars)) {
    return {
      valid: false,
      error:
        'CSF3 default export (meta) must be an object literal defining a `component` property',
    };
  }
  if (state.named.length === 0) {
    return { valid: false, error: 'Missing named CSF3 story export(s)' };
  }

  return { valid: true, namedStories: state.named };
}

export function validateStoryFile(storyPath: string): StoryValidationResult {
  if (!existsSync(storyPath)) {
    return { valid: false, error: 'Story file does not exist on disk' };
  }
  const content = readFileSync(storyPath, 'utf-8');
  return validateStorySource(content, storyPath);
}

function verifyExtraStoryFiles(
  context: {
    readonly rootDir: string;
    readonly checkedStories: ReadonlySet<string>;
  },
  allStoryFiles: readonly string[],
  errors: string[]
): void {
  for (const storyPath of allStoryFiles) {
    if (context.checkedStories.has(storyPath)) continue;
    const relStory = relative(context.rootDir, storyPath);
    const storyResult = validateStoryFile(storyPath);
    if (!storyResult.valid) {
      errors.push(
        `❌ [Storybook CSF3] Story file '${relStory}' violates CSF3 format: ${storyResult.error ?? 'Unknown error'}`
      );
    }
  }
}

export function validateStorybookCoverage(rootDir: string = process.cwd()): {
  readonly componentFiles: string[];
  readonly verified: VerifiedComponentStory[];
  readonly errors: string[];
} {
  const srcDir = resolve(rootDir, 'src');
  const componentFiles = findTsxFiles(srcDir).filter(isComponentFile);
  const allStoryFiles = findStoryFiles(srcDir);
  const errors: string[] = [];
  const verified: VerifiedComponentStory[] = [];
  const checkedStories = new Set<string>();

  for (const componentPath of componentFiles) {
    const rel = relative(rootDir, componentPath);
    const expectedStory = componentPath.replace(/\.tsx$/, '.stories.tsx');
    const relStory = relative(rootDir, expectedStory);
    checkedStories.add(expectedStory);

    const storyResult = validateStoryFile(expectedStory);
    if (!storyResult.valid) {
      errors.push(
        `❌ [Storybook CSF3] Component '${rel}' lacks valid CSF3 story at '${relStory}': ${storyResult.error ?? 'Unknown error'}`
      );
    } else {
      verified.push({
        component: rel,
        story: relStory,
        stories: storyResult.namedStories ?? [],
      });
    }
  }

  verifyExtraStoryFiles({ rootDir, checkedStories }, allStoryFiles, errors);
  return { componentFiles, verified, errors };
}

function runCli(): void {
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
