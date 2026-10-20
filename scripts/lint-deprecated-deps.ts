#!/usr/bin/env node
/**
 * Zero-Tolerance Deprecated Dependency Validator
 * Scans pnpm-lock.yaml and installed package manifests to forbid any deprecated
 * direct or transitive dependency in the repository.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface DeprecatedLockfileEntry {
  readonly pkg: string;
  readonly reason: string;
  readonly line: number;
}

export interface DeprecatedDirectEntry {
  readonly pkg: string;
  readonly reason: string;
}

export interface UnpinnedDependencyEntry {
  readonly pkg: string;
  readonly specifier: string;
  readonly section: 'dependencies' | 'devDependencies';
}

export interface PackageManifest {
  readonly version?: string;
  readonly deprecated?: string | boolean;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
}

export function findDeprecatedInLockfile(
  lockfileContent: string
): DeprecatedLockfileEntry[] {
  const lines = lockfileContent.split('\n');
  const deprecatedPackages: DeprecatedLockfileEntry[] = [];
  let currentPackage = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const pkgMatch = line.match(/^\s{2}'?([^':]+@[0-9][^':]*)'?:\s*$/);
    if (pkgMatch?.[1]) {
      currentPackage = pkgMatch[1];
      continue;
    }

    const depMatch = line.match(/^\s{4}deprecated:\s*(.+)$/);
    if (depMatch?.[1]) {
      deprecatedPackages.push({
        pkg: currentPackage || `line ${i + 1}`,
        reason: depMatch[1].replace(/^['"]|['"]$/g, ''),
        line: i + 1,
      });
    }
  }

  return deprecatedPackages;
}

export function checkDirectDependencies(
  rootDir: string = process.cwd()
): DeprecatedDirectEntry[] {
  const pkgJsonPath = resolve(rootDir, 'package.json');
  const pkgJson = JSON.parse(
    readFileSync(pkgJsonPath, 'utf-8')
  ) as PackageManifest;
  const allDeps = [
    ...Object.keys(pkgJson.dependencies ?? {}),
    ...Object.keys(pkgJson.devDependencies ?? {}),
  ];
  const deprecatedDirect: DeprecatedDirectEntry[] = [];

  for (const dep of allDeps) {
    const depPkgPath = resolve(rootDir, 'node_modules', dep, 'package.json');
    if (!existsSync(depPkgPath)) continue;
    const depPkg = JSON.parse(
      readFileSync(depPkgPath, 'utf-8')
    ) as PackageManifest;
    if (depPkg.deprecated) {
      deprecatedDirect.push({
        pkg: `${dep}@${depPkg.version ?? 'unknown'}`,
        reason: String(depPkg.deprecated),
      });
    }
  }

  return deprecatedDirect;
}

export function checkUnpinnedInManifest(
  pkgJson: PackageManifest
): UnpinnedDependencyEntry[] {
  const unpinned: UnpinnedDependencyEntry[] = [];
  const sections: readonly ('dependencies' | 'devDependencies')[] = [
    'dependencies',
    'devDependencies',
  ];

  for (const section of sections) {
    for (const [dep, spec] of Object.entries(pkgJson[section] ?? {})) {
      const value = String(spec).trim();
      if (value === 'latest' || value === '*' || value === 'next') {
        unpinned.push({ pkg: dep, specifier: value, section });
      }
    }
  }

  return unpinned;
}

export function checkUnpinnedDependencies(
  rootDir: string = process.cwd()
): UnpinnedDependencyEntry[] {
  const pkgJsonPath = resolve(rootDir, 'package.json');
  const pkgJson = JSON.parse(
    readFileSync(pkgJsonPath, 'utf-8')
  ) as PackageManifest;
  return checkUnpinnedInManifest(pkgJson);
}

function reportViolations(
  unpinnedDeps: readonly UnpinnedDependencyEntry[],
  directDeprecated: readonly DeprecatedDirectEntry[],
  lockfileDeprecated: readonly DeprecatedLockfileEntry[]
): void {
  for (const item of unpinnedDeps) {
    console.error(
      `❌ [Unpinned Dependency] ${item.pkg} (${item.section}) uses forbidden specifier "${item.specifier}". Pin an explicit semver range.`
    );
  }
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
}

function runCli(): void {
  const lockfilePath = resolve(process.cwd(), 'pnpm-lock.yaml');
  const lockfileContent = existsSync(lockfilePath)
    ? readFileSync(lockfilePath, 'utf-8')
    : '';

  const lockfileDeprecated = findDeprecatedInLockfile(lockfileContent);
  const directDeprecated = checkDirectDependencies(process.cwd());
  const unpinnedDeps = checkUnpinnedDependencies(process.cwd());
  const total =
    lockfileDeprecated.length + directDeprecated.length + unpinnedDeps.length;

  if (total > 0) {
    reportViolations(unpinnedDeps, directDeprecated, lockfileDeprecated);
    console.error(
      `\nFatal: Found ${total} dependency hygiene violation(s). Deprecated or unpinned ("latest"/"*") packages are strictly forbidden.`
    );
    process.exit(1);
  }

  console.log(
    '✅ Zero deprecated or unpinned dependencies verified across package.json and pnpm-lock.yaml.'
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  runCli();
}
