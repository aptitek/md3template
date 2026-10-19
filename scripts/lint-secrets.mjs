#!/usr/bin/env node
/**
 * Secret Scanner Quality Gate (secret-scanner + secretlint)
 * Prevents hardcoded API keys, credentials, private keys, and tokens from entering the repository.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const IGNORED_PATH_SEGMENTS = [
  'node_modules/',
  '.git/',
  'dist/',
  'build/',
  'styled-system/',
  'storybook-static/',
  '.react-router/',
  '.agents/',
  'coverage/',
  'test-results/',
  'playwright-report/',
  '.wireit/',
  '.wrangler/',
  'pnpm-lock.yaml',
  'worker-configuration.d.ts',
];

const SCANNED_EXTENSIONS =
  /\.(ts|tsx|js|jsx|mjs|cjs|json|jsonc|yml|yaml|toml|md|mdx|sql|css|env|sh)$/;

/**
 * High-precision secret signature rules for secret-scanner
 */
export const SECRET_RULES = [
  {
    id: 'private-key',
    description: 'Cryptographic Private Key block',
    pattern: /-----BEGIN (?:RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
  },
  {
    id: 'aws-access-key-id',
    description: 'AWS Access Key ID',
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/,
  },
  {
    id: 'github-token',
    description: 'GitHub Personal/App Access Token',
    pattern:
      /\b(?:(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,255}|github_pat_[A-Za-z0-9_]{22,255})\b/,
  },
  {
    id: 'gitlab-token',
    description: 'GitLab Personal Access Token',
    pattern: /\bglpat-[A-Za-z0-9\-_]{20,}\b/,
  },
  {
    id: 'slack-token',
    description: 'Slack API Token or Webhook',
    pattern:
      /(?:\bxox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*\b|https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+)/,
  },
  {
    id: 'stripe-live-key',
    description: 'Stripe Live Secret/Restricted Key',
    pattern: /\b(?:sk|rk)_live_[0-9a-zA-Z]{24,}\b/,
  },
  {
    id: 'google-api-key',
    description: 'Google Cloud / Firebase API Key',
    pattern: /\bAIza[0-9A-Za-z\-_]{35}\b/,
  },
  {
    id: 'npm-access-token',
    description: 'NPM Automation/Publish Access Token',
    pattern: /\bnpm_[A-Za-z0-9]{36}\b/,
  },
  {
    id: 'sonarqube-token',
    description: 'SonarQube Token',
    pattern: /\bsqp_[a-zA-Z0-9]{40}\b/,
  },
  {
    id: 'database-credentials-uri',
    description: 'Database Connection URI with embedded credentials',
    pattern:
      /\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis):\/\/[^/\s:@]+:[^/\s@]+@[^/\s]+/,
  },
];

export function shouldIgnoreFile(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  if (IGNORED_PATH_SEGMENTS.some((seg) => normalized.includes(seg))) {
    return true;
  }
  const base = normalized.split('/').pop() ?? '';
  if (base.startsWith('.env')) {
    return base === '.env.example' || base === '.env.template';
  }
  return !SCANNED_EXTENSIONS.test(normalized);
}

/**
 * Scans a string of file content for hardcoded secrets.
 * @param {string} content
 * @param {string} [filePath]
 */
export function scanContentForSecrets(content, filePath = 'inline') {
  const findings = [];
  const lines = content.split(/\r?\n/);

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (!line || line.includes('secret-scanner-ignore')) continue;

    for (const rule of SECRET_RULES) {
      if (rule.pattern.test(line)) {
        findings.push({
          file: filePath,
          line: idx + 1,
          ruleId: rule.id,
          description: rule.description,
        });
      }
    }
  }

  return findings;
}

export function collectWorkspaceFiles(rootDir = process.cwd()) {
  return readdirSync(rootDir, { recursive: true })
    .filter((entry) => typeof entry === 'string')
    .map((entry) => join(rootDir, entry))
    .filter((fullPath) => {
      const rel = relative(rootDir, fullPath);
      if (shouldIgnoreFile(rel)) return false;
      try {
        return statSync(fullPath).isFile();
      } catch {
        return false;
      }
    });
}

export function scanFilesForSecrets(files, rootDir = process.cwd()) {
  const allFindings = [];
  for (const file of files) {
    const absPath = resolve(rootDir, file);
    if (!existsSync(absPath)) continue;
    const relPath = relative(rootDir, absPath);
    if (shouldIgnoreFile(relPath)) continue;

    const content = readFileSync(absPath, 'utf-8');
    const fileFindings = scanContentForSecrets(content, relPath);
    allFindings.push(...fileFindings);
  }
  return allFindings;
}

function runSecretlintCli(targetArgs) {
  const args =
    targetArgs.length > 0
      ? [
          'exec',
          'secretlint',
          '--secretlintrc',
          '.secretlintrc.json',
          ...targetArgs,
        ]
      : [
          'exec',
          'secretlint',
          '--secretlintrc',
          '.secretlintrc.json',
          'src/**/*',
          'tests/**/*',
          'scripts/**/*',
          '.storybook/**/*',
          '.github/**/*',
        ];

  const result = spawnSync('pnpm', args, { stdio: 'inherit' });
  return result.status === 0;
}

function runCli() {
  const cliFiles = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  const filesToScan =
    cliFiles.length > 0 ? cliFiles : collectWorkspaceFiles(process.cwd());

  const findings = scanFilesForSecrets(filesToScan, process.cwd());
  if (findings.length > 0) {
    for (const f of findings) {
      console.error(
        `❌ [Secret Scanner] ${f.file}:${f.line} — Detected ${f.description} (${f.ruleId})`
      );
    }
    console.error(
      `\nFatal: ${findings.length} potential secret(s) detected by secret-scanner.`
    );
    process.exit(1);
  }

  const secretlintTargets = cliFiles.filter(
    (f) => !shouldIgnoreFile(relative(process.cwd(), resolve(f)))
  );
  if (cliFiles.length === 0 || secretlintTargets.length > 0) {
    const secretlintOk = runSecretlintCli(secretlintTargets);
    if (!secretlintOk) {
      console.error('❌ [Secret Scanner] secretlint detected exposed secrets.');
      process.exit(1);
    }
  }

  console.log(
    `✅ Secret scanner verified (${filesToScan.length} file(s) scanned, zero secrets exposed).`
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  runCli();
}
