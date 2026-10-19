#!/usr/bin/env node
/**
 * Draconian Markdown Semantic Structure & Fenced Div Validator
 * Enforces pure markdown (no raw HTML outside code blocks/backticks),
 * closed code and fenced divs, and depth-matched colon rules for fenced divs (:::, ::::, :::::).
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const CODE_FENCE_REGEX = /^(`{3,}|~{3,})(.*)$/;
const FENCED_DIV_REGEX = /^(:{3,})\s*(.*)$/;
const HTML_TAG_REGEX = /<(?:\/)?([a-zA-Z][a-zA-Z0-9-]*)(?:\s+[^>]*)?>/g;
const INLINE_CODE_REGEX = /`+[^`\n]+`+/g;

function handleCodeBlock(line, lineNum, state) {
  const match = line.match(CODE_FENCE_REGEX);
  if (!match) return state.inCode;

  const char = match[1][0];
  const len = match[1].length;

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

function handleFencedDiv(line, lineNum, state, errors, filePath) {
  const match = line.match(FENCED_DIV_REGEX);
  if (!match) return;

  const colons = match[1].length;
  const label = match[2].trim();

  if (label === '' && state.divStack.length > 0) {
    const top = state.divStack.pop();
    if (colons !== top.colons) {
      errors.push(
        `${filePath}:${lineNum} - Mismatched closing fence: expected ${top.colons} colons ('${':'.repeat(top.colons)}') to close depth ${state.divStack.length + 1} opened at line ${top.line}, but found ${colons} colons ('${':'.repeat(colons)}').`
      );
    }
  } else {
    const expectedColons = state.divStack.length + 3;
    if (colons !== expectedColons) {
      errors.push(
        `${filePath}:${lineNum} - Opening fenced div at nesting depth ${state.divStack.length + 1} must use ${expectedColons} colons ('${':'.repeat(expectedColons)}'), found ${colons} colons ('${':'.repeat(colons)}').`
      );
    }
    state.divStack.push({ colons, label, line: lineNum });
  }
}

function checkRawHtml(line, lineNum, errors, filePath) {
  const stripped = line.replace(INLINE_CODE_REGEX, '');
  let match;
  while ((match = HTML_TAG_REGEX.exec(stripped)) !== null) {
    const fullTag = match[0];
    const tagName = match[1].toLowerCase();
    if (
      fullTag.startsWith('<!--') ||
      tagName === 'http' ||
      tagName === 'https'
    ) {
      continue;
    }
    errors.push(
      `${filePath}:${lineNum} - Raw HTML tag '${fullTag}' detected. Raw HTML is forbidden in Markdown bodies. Use pure Markdown syntax or fenced divs (::: class-name) instead.`
    );
  }
}

export function validateMarkdownContent(content, filePath = 'markdown') {
  const lines = content.split('\n');
  const errors = [];
  const state = {
    inCode: false,
    codeChar: '',
    codeLen: 0,
    codeLine: 0,
    divStack: [],
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const isCodeLine = handleCodeBlock(line, lineNum, state);

    if (isCodeLine) continue;

    checkRawHtml(line, lineNum, errors, filePath);
    handleFencedDiv(line, lineNum, state, errors, filePath);
  }

  if (state.inCode) {
    errors.push(
      `${filePath}:EOF - Unclosed code block opened at line ${state.codeLine}.`
    );
  }

  while (state.divStack.length > 0) {
    const unclosed = state.divStack.pop();
    errors.push(
      `${filePath}:EOF - Unclosed fenced div opened at line ${unclosed.line} with ${unclosed.colons} colons ('${':'.repeat(unclosed.colons)}' ${unclosed.label}).`
    );
  }

  return errors;
}

const IGNORED_DIRS = new Set([
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

function findMarkdownFiles(dir, fileList = []) {
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

function runCli() {
  const args = process.argv.slice(2);
  const targetFiles =
    args.length > 0
      ? args.map((f) => resolve(process.cwd(), f))
      : findMarkdownFiles(process.cwd());

  let totalErrors = 0;
  for (const file of targetFiles) {
    const content = readFileSync(file, 'utf-8');
    const errors = validateMarkdownContent(content, file);
    if (errors.length > 0) {
      for (const err of errors) {
        console.error(`❌ [Markdown Structure Error] ${err}`);
      }
      totalErrors += errors.length;
    }
  }

  if (totalErrors > 0) {
    console.error(
      `\nFatal: Found ${totalErrors} markdown structure violation(s).`
    );
    process.exit(1);
  } else {
    console.log(
      `✅ Markdown structure & purity verified across ${targetFiles.length} file(s).`
    );
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  runCli();
}
