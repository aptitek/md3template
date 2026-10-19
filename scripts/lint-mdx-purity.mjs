#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const FORBIDDEN_PATTERNS = [
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

const IGNORED_DIRS = new Set([
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

function findMdxFiles(dir, fileList = []) {
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

const targetFiles =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2).map((f) => resolve(process.cwd(), f))
    : findMdxFiles(process.cwd());

let violationCount = 0;

for (const filePath of targetFiles) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    for (const { regex, label } of FORBIDDEN_PATTERNS) {
      if (regex.test(line)) {
        console.error(
          `❌ [MDX Purity Error] ${filePath}:${index + 1} - ${label} detected: "${line.trim()}"`
        );
        console.error(
          '   Violation: MDX files must be pure semantic content. Styling is strictly forbidden.'
        );
        violationCount++;
      }
    }
  });
}

if (violationCount > 0) {
  console.error(
    `\nFatal: Found ${violationCount} styling violation(s) in MDX content files.`
  );
  process.exit(1);
} else {
  console.log(
    `✅ MDX content purity verified across ${targetFiles.length} file(s).`
  );
}
