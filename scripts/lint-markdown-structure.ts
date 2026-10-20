#!/usr/bin/env node
/**
 * Draconian Markdown Semantic Structure & Fenced Div Validator
 * Enforces pure markdown (no raw HTML outside code blocks/backticks),
 * closed code and fenced divs, and depth-matched colon rules for fenced divs (:::, ::::, :::::).
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

interface FencedDivEntry {
  readonly colons: number;
  readonly label: string;
  readonly line: number;
}

interface MarkdownParseState {
  inCode: boolean;
  codeChar: string;
  codeLen: number;
  codeLine: number;
  readonly divStack: FencedDivEntry[];
  readonly errors: string[];
  readonly filePath: string;
}

const CODE_FENCE_REGEX = /^(`{3,}|~{3,})(.*)$/;
const FENCED_DIV_REGEX = /^(:{3,})\s*(.*)$/;
const HTML_TAG_REGEX = /<\/?([a-zA-Z][a-zA-Z0-9-]*)[^>]*>/g;
const INLINE_CODE_REGEX = /`+[^`\n]+`+/g;

function handleCodeBlock(
  line: string,
  lineNum: number,
  state: MarkdownParseState
): boolean {
  const match = line.match(CODE_FENCE_REGEX);
  const fence = match?.[1];
  if (!fence) return state.inCode;

  const char = fence[0] ?? '';
  const len = fence.length;

  if (!state.inCode) {
    state.inCode = true;
    state.codeChar = char;
    state.codeLen = len;
    state.codeLine = lineNum;
    return true;
  }

  if (char === state.codeChar && len >= state.codeLen) {
    state.inCode = false;
    return true;
  }

  return true;
}

function closeFencedDiv(
  colons: number,
  lineNum: number,
  state: MarkdownParseState
): void {
  const top = state.divStack.pop();
  if (top && colons !== top.colons) {
    state.errors.push(
      `${state.filePath}:${lineNum} - Mismatched closing fence: expected ${top.colons} colons ('${':'.repeat(top.colons)}') to close depth ${state.divStack.length + 1} opened at line ${top.line}, but found ${colons} colons ('${':'.repeat(colons)}').`
    );
  }
}

function openFencedDiv(entry: FencedDivEntry, state: MarkdownParseState): void {
  const expectedColons = state.divStack.length + 3;
  if (entry.colons !== expectedColons) {
    state.errors.push(
      `${state.filePath}:${entry.line} - Opening fenced div at nesting depth ${state.divStack.length + 1} must use ${expectedColons} colons ('${':'.repeat(expectedColons)}'), found ${entry.colons} colons ('${':'.repeat(entry.colons)}').`
    );
  }
  state.divStack.push(entry);
}

function handleFencedDiv(
  line: string,
  lineNum: number,
  state: MarkdownParseState
): void {
  const match = line.match(FENCED_DIV_REGEX);
  const fence = match?.[1];
  if (!fence) return;

  const colons = fence.length;
  const label = (match[2] ?? '').trim();

  if (label === '' && state.divStack.length > 0) {
    closeFencedDiv(colons, lineNum, state);
  } else {
    openFencedDiv({ colons, label, line: lineNum }, state);
  }
}

function checkRawHtml(
  line: string,
  lineNum: number,
  state: MarkdownParseState
): void {
  const stripped = line.replace(INLINE_CODE_REGEX, '');
  let match: RegExpExecArray | null;
  HTML_TAG_REGEX.lastIndex = 0;
  while ((match = HTML_TAG_REGEX.exec(stripped)) !== null) {
    const fullTag = match[0];
    const tagName = (match[1] ?? '').toLowerCase();
    if (
      fullTag.startsWith('<!--') ||
      tagName === 'http' ||
      tagName === 'https'
    ) {
      continue;
    }
    state.errors.push(
      `${state.filePath}:${lineNum} - Raw HTML tag '${fullTag}' detected. Raw HTML is forbidden in Markdown bodies. Use pure Markdown syntax or fenced divs (::: class-name) instead.`
    );
  }
}

export function validateMarkdownContent(
  content: string,
  filePath = 'markdown'
): string[] {
  const lines = content.split('\n');
  const state: MarkdownParseState = {
    inCode: false,
    codeChar: '',
    codeLen: 0,
    codeLine: 0,
    divStack: [],
    errors: [],
    filePath,
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const lineNum = i + 1;
    if (handleCodeBlock(line, lineNum, state)) continue;

    checkRawHtml(line, lineNum, state);
    handleFencedDiv(line, lineNum, state);
  }

  if (state.inCode) {
    state.errors.push(
      `${filePath}:EOF - Unclosed code block opened at line ${state.codeLine}.`
    );
  }

  while (state.divStack.length > 0) {
    const unclosed = state.divStack.pop();
    if (unclosed) {
      state.errors.push(
        `${filePath}:EOF - Unclosed fenced div opened at line ${unclosed.line} with ${unclosed.colons} colons ('${':'.repeat(unclosed.colons)}' ${unclosed.label}).`
      );
    }
  }

  return state.errors;
}

const IGNORED_DIRS: ReadonlySet<string> = new Set([
  'node_modules',
  'dist',
  'build',
  'storybook-static',
  '.agents',
  '.git',
  'coverage',
  '.wireit',
  'styled-system',
  '.react-router',
]);

function findMarkdownFiles(dir: string, fileList: string[] = []): string[] {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry)) continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      findMarkdownFiles(fullPath, fileList);
    } else if (entry.endsWith('.md')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function runCli(): void {
  const args = process.argv.slice(2);
  const targetFiles =
    args.length > 0
      ? args.map((f) => resolve(process.cwd(), f))
      : findMarkdownFiles(process.cwd());

  let totalErrors = 0;
  for (const file of targetFiles) {
    const content = readFileSync(file, 'utf-8');
    const errors = validateMarkdownContent(content, file);
    for (const err of errors) {
      console.error(`❌ [Markdown Structure Error] ${err}`);
    }
    totalErrors += errors.length;
  }

  if (totalErrors > 0) {
    console.error(
      `\nFatal: Found ${totalErrors} markdown structure violation(s).`
    );
    process.exit(1);
  }
  console.log(
    `✅ Markdown structure & purity verified across ${targetFiles.length} file(s).`
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  runCli();
}
