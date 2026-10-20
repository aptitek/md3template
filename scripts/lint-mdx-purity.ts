#!/usr/bin/env node
/**
 * Pure Semantic MDX Content Validator
 * Enforces 100% pure Markdown in .mdx files: zero inline style, className, <style>, or CSS imports.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import ts from 'typescript';

interface ForbiddenPattern {
  readonly regex: RegExp;
  readonly label: string;
}

const FORBIDDEN_PATTERNS: readonly ForbiddenPattern[] = [
  { regex: /style\s*=\s*[{'"]/i, label: 'Inline style attribute' },
  { regex: /className\s*=\s*[{'"]/i, label: 'className attribute' },
  { regex: /class\s*=\s*[{'"]/i, label: 'class attribute' },
  { regex: /<style[\s>]/i, label: '<style> tag' },
  {
    regex: /import\s+.*['"]styled-system.*['"]/i,
    label: 'styled-system import',
  },
  { regex: /import\s+.*\.css['"]/i, label: 'CSS stylesheet import' },
];

const IGNORED_DIRS: ReadonlySet<string> = new Set([
  'node_modules',
  'dist',
  'build',
  '.agents',
  '.git',
  'storybook-static',
  'styled-system',
  '.react-router',
  'coverage',
  '.wireit',
]);

export function findMdxFiles(dir: string, fileList: string[] = []): string[] {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry)) {
      continue;
    }
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      findMdxFiles(fullPath, fileList);
    } else if (entry.endsWith('.mdx')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

export function validateMdxContent(
  content: string,
  filePath = 'content.mdx'
): string[] {
  const violations: string[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    for (const { regex, label } of FORBIDDEN_PATTERNS) {
      if (regex.test(line)) {
        violations.push(
          `❌ [MDX Purity Error] ${filePath}:${i + 1} - ${label} detected: "${line.trim()}"`
        );
      }
    }
  }
  return violations;
}

function checkLocaleEntryEntropy(entry: {
  readonly locale: string;
  readonly key: string;
  readonly baseVal: string | undefined;
  readonly locVal: string | undefined;
}): string | null {
  const { locale, key, baseVal, locVal } = entry;
  if (!locVal || locVal.trim().length === 0) {
    return `❌ [i18n Entropy] Missing or empty translation for key '${key}' in locale '${locale}'.`;
  }
  if (
    baseVal &&
    /[a-zA-Z]{3,}/.test(baseVal) &&
    baseVal.trim().toLowerCase() === locVal.trim().toLowerCase()
  ) {
    return `❌ [i18n Entropy] Untranslated copy detected for key '${key}' between 'en' and '${locale}' ("${locVal}").`;
  }
  return null;
}

export function validateI18nDictionaryEntropy(
  dictionaries: Readonly<Record<string, Readonly<Record<string, string>>>>
): string[] {
  const errors: string[] = [];
  const baseDict = dictionaries.en;
  if (!baseDict) {
    return ['❌ [i18n Entropy] Missing base English ("en") dictionary.'];
  }
  const baseKeys = Object.keys(baseDict);
  for (const [locale, dict] of Object.entries(dictionaries)) {
    if (locale === 'en') continue;
    for (const key of baseKeys) {
      const err = checkLocaleEntryEntropy({
        locale,
        key,
        baseVal: baseDict[key],
        locVal: dict[key],
      });
      if (err) errors.push(err);
    }
  }
  return errors;
}

function extractLocaleMap(
  obj: ts.ObjectLiteralExpression
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const prop of obj.properties) {
    if (
      ts.isPropertyAssignment(prop) &&
      ts.isIdentifier(prop.name) &&
      ts.isStringLiteral(prop.initializer)
    ) {
      map[prop.name.text] = prop.initializer.text;
    }
  }
  return map;
}

function populateFromA11yInitializer(
  initializer: ts.Expression,
  result: Record<string, Record<string, string>>
): void {
  const expr = ts.isAsExpression(initializer)
    ? initializer.expression
    : initializer;
  if (!ts.isObjectLiteralExpression(expr)) return;
  for (const prop of expr.properties) {
    if (
      ts.isPropertyAssignment(prop) &&
      ts.isIdentifier(prop.name) &&
      ts.isObjectLiteralExpression(prop.initializer)
    ) {
      result[prop.name.text] = extractLocaleMap(prop.initializer);
    }
  }
}

export function parseA11yStringsFromSource(
  sourceText: string
): Record<string, Record<string, string>> {
  const sf = ts.createSourceFile(
    'strings.ts',
    sourceText,
    ts.ScriptTarget.Latest,
    true
  );
  const result: Record<string, Record<string, string>> = {};
  function visit(node: ts.Node): void {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'A11Y_STRINGS' &&
      node.initializer
    ) {
      populateFromA11yInitializer(node.initializer, result);
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return result;
}

function runCli(): void {
  const cliArgs = process.argv.slice(2);
  const targetFiles =
    cliArgs.length > 0
      ? cliArgs.map((f) => resolve(process.cwd(), f))
      : findMdxFiles(process.cwd());

  let violationCount = 0;

  for (const filePath of targetFiles) {
    const content = readFileSync(filePath, 'utf-8');
    const violations = validateMdxContent(content, filePath);
    for (const v of violations) {
      console.error(v);
      violationCount++;
    }
  }

  if (cliArgs.length === 0) {
    const stringsPath = resolve(process.cwd(), 'src/i18n/strings.ts');
    if (existsSync(stringsPath)) {
      const parsed = parseA11yStringsFromSource(
        readFileSync(stringsPath, 'utf-8')
      );
      for (const err of validateI18nDictionaryEntropy(parsed)) {
        console.error(err);
        violationCount++;
      }
    }
  }

  if (violationCount > 0) {
    console.error(
      `\nFatal: Found ${violationCount} content/i18n purity violation(s).`
    );
    process.exit(1);
  }
  console.log(
    `✅ MDX content & i18n dictionary entropy verified across ${targetFiles.length} MDX file(s).`
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  runCli();
}
