#!/usr/bin/env node
/**
 * Zero-Tolerance Deprecated Dependency Validator
 * Scans pnpm-lock.yaml and installed package manifests to forbid any deprecated
 * direct or transitive dependency in the repository.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function findDeprecatedInLockfile(lockfileContent) {
  const lines = lockfileContent.split('\n');
  const deprecatedPackages = [];
  let currentPackage = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const pkgMatch = line.match(/^\s{2}'?([^':]+@[0-9][^':]*)'?:\s*$/);
    if (pkgMatch) {
      currentPackage = pkgMatch[1];
      continue;
    }

    const depMatch = line.match(/^\s{4}deprecated:\s*(.+)$/);
    if (depMatch) {
      deprecatedPackages.push({
        pkg: currentPackage || `line ${i + 1}`,
        reason: depMatch[1].replace(/^['"]|['"]$/g, ''),
        line: i + 1,
      });
    }
  }

  return deprecatedPackages;
}

export function checkDirectDependencies(rootDir = process.cwd()) {
  const pkgJsonPath = resolve(rootDir, 'package.json');
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
  const allDeps = [
    ...Object.keys(pkgJson.dependencies ?? {}),
    ...Object.keys(pkgJson.devDependencies ?? {}),
  ];
  const deprecatedDirect = [];

  for (const dep of allDeps) {
    const depPkgPath = resolve(rootDir, 'node_modules', dep, 'package.json');
    if (!existsSync(depPkgPath)) continue;
    const depPkg = JSON.parse(readFileSync(depPkgPath, 'utf-8'));
    if (depPkg.deprecated) {
      deprecatedDirect.push({
        pkg: `${dep}@${depPkg.version ?? 'unknown'}`,
        reason: String(depPkg.deprecated),
      });
    }
  }

  return deprecatedDirect;
}

function runCli() {
  const lockfilePath = resolve(process.cwd(), 'pnpm-lock.yaml');
  const lockfileContent = existsSync(lockfilePath)
    ? readFileSync(lockfilePath, 'utf-8')
    : '';

  const lockfileDeprecated = findDeprecatedInLockfile(lockfileContent);
  const directDeprecated = checkDirectDependencies(process.cwd());
  const total = lockfileDeprecated.length + directDeprecated.length;

  if (total > 0) {
    for (const item of directDeprecated) {
      console.error(
        `❌ [Deprecated Direct Dependency] ${item.pkg}: ${item.reason}`
      );
    }
    for (const item of lockfileDeprecated) {
      console.error(
        `❌ [Deprecated Lockfile Package] ${item.pkg} (pnpm-lock.yaml:${item.line}): ${item.reason}`
      );
    }
    console.error(
      `\nFatal: Found ${total} deprecated dependency violation(s). Deprecated packages are strictly forbidden.`
    );
    process.exit(1);
  }

  console.log(
    '✅ Zero deprecated dependencies verified across package.json and pnpm-lock.yaml.'
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  runCli();
}
