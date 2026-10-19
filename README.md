# MD3 Template

Material Design 3, Panda CSS, React Router, and Cloudflare Workers template with strict architectural quality gates.

## Quality Gates

- **ESLint v10**: Strict TypeScript, React, ARIA (`eslint-plugin-jsx-a11y`), Security, Atomic Design Hierarchy (`eslint-plugin-atomic-design`), Architectural Boundaries (`eslint-plugin-boundaries`), Panda CSS (`@pandacss/eslint-plugin`), CSS Tokens (`@eslint/css` + `css-tokens`), and MD3 Tokens (`m3-tokens`).
- **TypeScript**: Strict incremental composite type-checking across application, worker, and node configs (`--incremental` `.tsbuildinfo` cached in `node_modules/.cache/tsbuildinfo/`).
- **Strategic Error Boundaries**: Mechanically enforces error boundaries at all 4 architectural levels—Cloudflare Worker edge (`src/worker.ts`), Root Document (`src/root.tsx`), Route Modules (`src/routes/*.tsx`), and Section/Widget (`src/components/error-boundary.tsx`) (`lint:boundaries` via `scripts/lint-error-boundaries.mjs`).
- **Dependency Cruiser**: Zero circular dependencies, zero orphans, and strict layer isolation (`--cache node_modules/.cache/dependency-cruiser`).
- **Zero Deprecated Dependencies**: Enforces zero deprecated direct or transitive dependencies across `package.json` and `pnpm-lock.yaml` (`lint:deprecated` via `scripts/lint-deprecated-deps.mjs`).
- **Security & Vulnerability Audit (Snyk + pnpm audit)**: Enforces zero vulnerabilities via `pnpm audit` and Snyk CLI (`lint:security` / `lint:snyk` via `scripts/lint-security.mjs` and `mise.toml`).
- **Knip**: Zero unused files, exports, or dependencies (`--cache`).
- **JSCPD**: Zero code duplication (`threshold: 0`).
- **Size Limit**: Client JS and CSS bundle size budgets.
- **Markdown & MDX Purity**: `remark-lint` + structural validator (`lint-markdown-structure.mjs`) and MDX styling ban (`lint-mdx-purity.mjs`).
- **TDD & Storybook Coverage**: 100% source module test companion enforcement (`lint-tdd-companions.mjs`), pre-commit TDD staging verification (`verify-tdd-staged.mjs`), and 100% component CSF3 Storybook coverage (`lint-storybook-coverage.mjs`).
- **Testing & Coverage**: Vitest unit tests (95% line/function/statement, 90% branch per-file coverage), Storybook browser tests, and Playwright E2E + Axe WCAG 2.2 AA accessibility verification.
- **Fast Cached Commit & Push Checks**: All Wireit lint, test, and build tasks declare explicit input file globs and output fingerprints (`"output": []`), paired with shared metadata caches for ESLint, Prettier, TypeScript, Knip, and Dependency Cruiser.

## Commands

```bash
pnpm run dev
pnpm run lint
pnpm run test
pnpm run build
```
