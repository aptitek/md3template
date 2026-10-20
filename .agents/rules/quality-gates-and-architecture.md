---
trigger: always_on
description: Mandatory architectural guardrails, Haskell-grade functional purity rules, and first-time-right quality gate instructions for md3template.
---

# Architectural Guardrails & First-Time-Right Quality Gates

This repository (`md3template`) enforces a zero-tolerance, Haskell-grade architectural fortress. Every commit and push is gated by 20 static analysis checks (`pnpm run lint`), strict Conventional Commits (`commitlint.config.mjs`), and 4 test suites (`pnpm run test`: unit 100% coverage, StrykerJS mutation testing `>= 95%`, Storybook browser tests, and Playwright SSR + Storybook WCAG 2.2 AA E2E tests).

Attempting to bypass rules with AST hacks, key permutations, type casts, linter suppression comments, config edits, or tautological tests will immediately fail the build. Follow this guide to write code that passes every quality gate on the first attempt.

---

## 1. Absolute Prohibitions (Never Attempt These)

1. **Never use ESLint suppression comments**:
   * `@eslint-community/eslint-comments/no-use` is configured with `allow: []` across `src/`, `tests/`, and `scripts/`.
   * `/* eslint-disable */`, `// eslint-disable-next-line`, and `// eslint-enable` are strictly forbidden. Fix the underlying code instead.
2. **Never tamper with quality gates, linter scripts, or configs to make a build pass**:
   * Modifying `scripts/**`, `eslint.config.js`, `commitlint.config.mjs`, `stryker.config.mjs`, `.dependency-cruiser.cjs`, or `knip.json` is blocked by the pre-commit hook (`scripts/verify-config-lock.ts`) unless explicitly requested and approved by the user (`ALLOW_CONFIG_EDIT=1`).
   * All guardian scripts and ESLint plugins in `scripts/**` must be written in strict TypeScript (`.ts`). Untyped `.js`, `.mjs`, and `.cjs` files in `scripts/` are forbidden.
3. **Never add unused dependencies or unpinned version specifiers**:
   * `knip` enforces zero unused files, exports, or dependencies. Do not dump unused packages into `knip.json`.
   * `scripts/lint-deprecated-deps.ts` forbids deprecated packages (direct or transitive in `pnpm-lock.yaml`) and forbids unpinned version specifiers (`"latest"`, `"*"`, `"next"`) in `package.json`.
4. **Never leak secrets or production stack traces**:
   * `scripts/lint-secrets.ts` and `secretlint` scan the workspace for credentials, tokens, and private keys.
   * Error boundaries must never render `error.stack` in production; always guard stack traces behind `isDev = import.meta.env.DEV`.
5. **Never write lazy or unscoped commit messages (`commitlint.config.mjs`)**:
   * Every commit message must follow `<type>(<scope>): <subject>` with a non-empty architectural scope (`scope-empty: [2, 'never']`) from `ARCHITECTURAL_SCOPES`: `ui`, `tokens`, `routes`, `db`, `i18n`, `ci`, `lint`, `theme`, `worker`, `test`, `docs`, `deps`, `config`, `security`, `a11y`, `storybook`.
   * The commit `subject` must be at least **15 characters** (`subject-min-length: [2, 'always', 15]`) and the header at most 100 characters.

---

## 2. The 6 Formal Haskell-Grade Architectural Locks

### Lock 1: `no-as-cast-and-type-predicates` & Referential Transparency (`src/`)

`scripts/eslint/restricted-rules.ts` and `eslint.config.js` enforce pure functional programming and total functions across `src/`:

* **Zero Unsafe Type Coercions (`unsafeCoerce` Ban)**:
  * `as T` (`TSAsExpression`, except `as const`), angle-bracket casts (`<T>x`), and non-null assertions (`x!`) are strictly forbidden in `src/`.
  * Manual type predicates (`x is T` / `TSTypePredicate`) are forbidden in `src/` to prevent unsound type narrowing. Use discriminated unions or total conversion functions (e.g., `resolveLocale(value: string): Locale`).
* **Immutability & Pure Control Flow**:
  * Mutable variable bindings (`let`, `var`) and variable/property reassignments (`AssignmentExpression`) are forbidden in `src/`. Use `const` bindings exclusively.
  * Imperative loops (`for`, `for..in`, `for..of`, `while`, `do..while`) are forbidden in `src/`. Use declarative functional transformations (`.map()`, `.filter()`, `.reduce()`).
  * Mutating collection methods (`.push()`, `.pop()`, `.shift()`, `.unshift()`, `.splice()`, `.sort()`, `.reverse()`, `.fill()`, `.copyWithin()`) are forbidden in `src/`. Use immutable alternatives (`.toSorted()`, `.toSpliced()`, `.toReversed()`, `.concat()`).
  * `else` and `else if` branches (`IfStatement[alternate!=null]` and `no-else-return`) are forbidden in `src/`. Use early returns or declarative expressions.
* **Total Functions (Zero Runtime Exceptions in Pure Modules)**:
  * `throw` (`ThrowStatement`) and `try / catch` (`TryStatement`) are forbidden across `src/` except at the Cloudflare Worker Edge IO boundary (`src/worker.ts`, where `handleFetch` must wrap request execution in `try / catch`).

### Lock 2: `strict-i18n-strings` & Translation Entropy (`en` <-> `fr`)

* **Total Ban on Hardcoded User-Facing Strings in `.tsx` (Inside & Outside JSX/Functions)**:
  * `scripts/eslint/restricted-rules.ts` (`restrictedSyntaxRules` and `tsxStrictI18nSyntaxRules`) blocks:
    * Raw JSX text (`<Box>Hello</Box>`), JSX string literals (`<Box>{'Hello'}</Box>`), and JSX template literals (`<Box>{`Hello`}</Box>`).
    * String expressions in JSX (`{'Hello ' + name}`, `{String('Hello')}`, `{['Hello']}`).
    * Prose strings or capitalized UI literals (`'Bonjour'`, `'Submit'`, `'Mon texte'`) assigned to variables, object properties, array elements, return statements, or default parameters **anywhere** in a `.tsx` file — including module-scope constants outside functions.
    * Hardcoded strings in `alt`, `aria-label`, `aria-placeholder`, `aria-roledescription`, `aria-valuetext`, or `title`.
* **Translation Entropy Verification (`scripts/lint-mdx-purity.ts`)**:
  * `parseA11yStringsFromSource` and `validateI18nDictionaryEntropy` parse the AST of `src/i18n/strings.ts` and verify that:
    1. Every key in `A11Y_STRINGS.en` exists in `A11Y_STRINGS.fr` (and vice-versa) with non-empty values.
    2. No alphabetical phrase (`/[a-zA-Z]{3,}/`) is copy-pasted untranslated between `en` and `fr`.

### Lock 3: `md3-color-pairing` (Algebraic Material Design 3 Color Pairing)

The `m3-tokens/enforce-color-pairing` rule in `scripts/eslint/m3-tokens-plugin.ts` (backed by `MD3_COLOR_PAIRINGS` in `scripts/eslint/ast-helpers.ts`) enforces Material Design 3 color algebra:

* Whenever a `cva()` or `sva()` recipe `base` block sets `bg` or `backgroundColor` to an MD3 container/surface token, it **must** explicitly declare the paired `color` token in the same block:
  * `primary` -> `onPrimary`
  * `primaryContainer` -> `onPrimaryContainer`
  * `secondary` -> `onSecondary`
  * `secondaryContainer` -> `onSecondaryContainer`
  * `tertiary` -> `onTertiary`
  * `tertiaryContainer` -> `onTertiaryContainer`
  * `error` -> `onError`
  * `errorContainer` -> `onErrorContainer`
  * `background` -> `onBackground`
  * `surface`, `surfaceDim`, `surfaceBright`, `surfaceContainerLowest`, `surfaceContainerLow`, `surfaceContainer`, `surfaceContainerHigh`, `surfaceContainerHighest` -> `onSurface` (or `onSurfaceVariant`)
  * `surfaceVariant` -> `onSurfaceVariant` (or `onSurface`)
  * `inverseSurface` -> `inverseOnSurface`
* Any mismatched `bg` + `color` pairing on a recipe object or JSX element (e.g., `bg="surfaceContainer" color="onPrimary"`) is immediately rejected.

### Lock 4: `true-atomic-purity` (UI Primitives, Hook Bans & Atomic Design Hierarchy)

* **Ban on Intrinsic HTML Elements, `<panda.div>`, and `panda('div')` Factories**:
  * Raw lowercase HTML elements (`<div>`, `<span>`, `<button>`, etc.) are forbidden in JSX except native `<html>`, `<head>`, and `<meta>` in `src/root.tsx` and M3 custom elements (`<m3e-*>`, `<md-*>`).
  * Generic `<panda.div>`, `<panda.span>`, `<panda.button>`, `<panda.meta>`, aliased `<p.div>`, and factory calls `panda('div', ...)` (`CallExpression[callee.name="panda"]`) are strictly forbidden.
  * Use dedicated Panda layout primitives (`<Box>`, `<Flex>`, `<Grid>`, `<Stack>`, `<HStack>`, `<VStack>`, `<Center>`, `<Container>`) from `styled-system/jsx`, semantic landmarks (`<panda.main>`, `<panda.section>`, `<panda.h1>`, `<panda.pre>`, `<panda.code>`), and `@m3e/react` components.
* **Ban on Imperative Effect Hooks in UI & Routes**:
  * Importing or calling `useEffect` or `useLayoutEffect` is forbidden across `src/components/**` and `src/routes/**`.
* **Strict Downward Atomic Hierarchy (`eslint-plugin-boundaries` & `.dependency-cruiser.cjs`)**:
  * `src/components/atoms/**`: **100% stateless pure functions**. All React hooks (`useState`, `useReducer`, `useContext`, `useRef`, etc.) are forbidden in `atoms/`. May only import from `tokens`, `theme`, `i18n`, `types`.
  * `src/components/molecules/**`: May compose `atoms`, `tokens`, `theme`, `i18n`, `types`. Forbidden from importing domain/persistence layers (`src/db/`).
  * `src/components/organisms/**`: May compose `molecules` and `atoms`. Forbidden from importing `react-router` (navigation/actions must be injected via props or slots).
  * `src/components/templates/**`: Pure spatial geometry and `ReactNode` slots only. Forbidden from importing `src/i18n/` or `src/db/`.
  * `src/routes/**`: Orchestrates loaders/actions, high-level i18n, `ErrorBoundary`, and templates/organisms. Forbidden from importing `atoms` or `molecules` directly.

### Lock 5: `ast-recipe-dedup` (Commutative Panda CSS Recipe Deduplication)

The `panda-recipes/enforce-recipe-usage` rule in `scripts/eslint/panda-recipes-plugin.ts`:

* Limits inline style props to **max 3** per Panda JSX element or `css()` call, bans conditional expressions (ternaries/logical operators) in style props, and bans JSX prop spreading (`{...props}`).
* Requires `defaultVariants` whenever `variants` is defined in `cva()` / `sva()`, and requires every slot in `sva({ slots: [...] })` to be styled under `base`.
* **Canonical Commutative Deduplication**: Extracts and alphabetically sorts `property=token` pairs from every `cva()` and `sva()` `base` block (`extractCanonicalStylePairs`). If two recipe blocks share **3 or more identical `property=token` pairs** — even with permuted key order — ESLint reports a `duplicateRecipeBlock` violation. Reuse canonical recipes (such as `surfaceCard` from `styled-system/recipes`) instead of duplicating style definitions.

### Lock 6: `test-assertion-purity` & StrykerJS Mutation Testing (Anti-Fraud Unit & Integration Testing)

In `tests/**/*.{ts,tsx}`, `eslint.config.js` and `stryker.config.mjs` forbid:

* Skipped, focused, or todo tests (`it.skip`, `test.only`, `it.todo`).
* Hollow test blocks without an `expect(...)` call.
* **Weak or tautological assertions**: `.toBeTruthy()`, `.toBeFalsy()`, `.toBeDefined()`, `.toMatchSnapshot()`, and `.toMatchInlineSnapshot()`. Always assert concrete values (`.toBe()`, `.toEqual()`, `.toStrictEqual()`, `.toContain()`, `.toHaveLength()`).
* **Module mocking**: `vi.mock()` and `jest.mock()` are forbidden. Test real module compositions or inject dependencies explicitly via function parameters.
* **Surviving Mutants (`pnpm run test:mutation`)**: StrykerJS (`stryker.config.mjs`) mutates `src/**` with `@stryker-mutator/vitest-runner` and enforces a strict `break: 95` mutation score threshold (currently 100%). Every conditional branch, fallback expression, and status code in `src/` must be killed by a concrete unit test assertion.

---

## 3. Code Complexity, Size Limits & Guardian Script Constraints

Every module is subject to strict KISS and DRY (`jscpd` threshold `0`) constraints in `eslint.config.js`:

| Metric | Production Code (`src/**`) | Guardian Scripts (`scripts/**`) & Tests (`tests/**`) |
| --- | --- | --- |
| **Cyclomatic complexity (`complexity`)** | `<= 3` | `<= 8` |
| **Max nesting depth (`max-depth`)** | `<= 1` (and zero `else`) | `<= 3` |
| **Max lines per function (`max-lines-per-function`)** | `<= 28` | `<= 64` (`scripts/**`) |
| **Max lines per file (`max-lines`)** | `<= 150` (`<= 256` for `src/tokens/**`) | `<= 256` (`scripts/**`) |
| **Max parameters per function (`max-params`)** | `<= 3` | `<= 3` |

* **Guardian Script Independence & TDD (`scripts/**`)**:
  * `.dependency-cruiser.cjs` (`scripts-independence` via `depcruise src scripts`) forbids `scripts/**` from importing runtime modules from `src/` or `tests/`. Guardian scripts inspect `src/` via the TypeScript Compiler AST (`ts.createSourceFile`).
  * Both `scripts/lint-tdd-companions.ts` and `scripts/verify-tdd-staged.ts` enforce that **every module in `src/**` and `scripts/**`** has an active unit test companion in `tests/unit/*.test.{ts,tsx}` and that modifying any `src/` or `scripts/` file stages its corresponding unit test.

---

## 4. 3-Tier Cached Verification System

All lint, build, and test gates are orchestrated via **Wireit** (`package.json`) with fine-grained input globs, output fingerprinting (`.wireit/`), and persistent tool caches:
* **Vite & Vitest**: `node_modules/.cache/vite`
* **StrykerJS Incremental Mutation**: `node_modules/.cache/stryker/incremental.json` (`incremental: true` in `stryker.config.mjs`)
* **TypeScript Incremental**: `node_modules/.cache/tsbuildinfo/`
* **ESLint & Prettier Metadata**: `node_modules/.cache/eslint/` & `node_modules/.cache/prettier/.prettiercache`
* **Dependency Cruiser & Knip**: `node_modules/.cache/dependency-cruiser` & `node_modules/.cache/knip/`

Use the appropriate tier for your workflow:

1. **Tier 1 — Quick Check for AI Agents & Inner-Loop TDD (`pnpm run check:quick` / `pnpm run test:quick`)**:
   * Runs fast static checks (`lint:eslint`, `lint:typecheck`, `lint:boundaries`, `lint:routes`, `lint:storybook`, `lint:tdd`, `lint:mdx`) + unit tests (`test:unit`) in a single parallel Wireit graph (~1s cached).
   * Use `pnpm run test:quick` when you only want to run cached unit tests (`vitest run --project=unit`).
2. **Tier 2 — Serious Pre-Commit Gate (`pnpm run check:commit`)**:
   * Automatically runs on `git commit` (`.husky/pre-commit`) alongside `lint-staged`. Executes incremental `tsc`, `depcruise`, `knip`, `jscpd`, `secretlint`, `boundaries`, `routes`, `storybook`, `tdd`, `mdx`, `markdown`, and `test:coverage` (100% unit coverage) in a single parallel Wireit graph (~2s cached).
3. **Tier 3 — Full Pre-Push & CI Fortress (`pnpm run check:push` / `pnpm run check`)**:
   * Automatically runs on `git push` (`.husky/pre-push`). Executes all 20 static analysis gates (`pnpm run lint`, including `lint:size`, `lint:deprecated`, and `lint:security`) and all 4 test suites (`pnpm run test`: unit coverage, incremental StrykerJS mutation testing `>= 95%`, Storybook headless Chromium, and Playwright SSR + Storybook axe WCAG 2.2 AA).

```bash
# Rapid iteration during coding (AI agent quick check)
pnpm run check:quick

# Fast unit tests only
pnpm run test:quick

# Pre-commit serious verification (format + commit-tier checks)
pnpm run format && pnpm run check:commit

# Full pre-push verification (all 20 lint gates + all 4 cached test suites)
pnpm run check:push
```
