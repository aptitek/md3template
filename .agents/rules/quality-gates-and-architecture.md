---
trigger: always_on
description: Mandatory architectural guardrails, anti-vibe-coding rules, and first-time-right quality gate instructions for md3template.
---

# Architectural Guardrails & First-Time-Right Quality Gates

This repository (`md3template`) enforces a zero-tolerance architectural fortress. Every commit and push is gated by 20 static analysis checks (`pnpm run lint`) and 3 test suites (`pnpm run test`: unit coverage, Storybook browser tests, and Playwright SSR + Storybook WCAG 2.2 AA E2E tests).

 Attempting to bypass rules with AST hacks, linter suppression comments, config edits, or shallow tests will immediately fail the build. Follow this guide to write code that passes every quality gate on the first attempt.

---

## 1. Absolute Prohibitions (Never Attempt These)

1. **Never use ESLint suppression comments**:
   * `@eslint-community/eslint-comments/no-use` is configured with `allow: []` across `src/` and `tests/`.
   * `/* eslint-disable */`, `// eslint-disable-next-line`, and `// eslint-enable` are strictly forbidden. Fix the underlying code instead.
2. **Never tamper with quality gates, linter scripts, or configs to make a build pass**:
   * Modifying `scripts/**`, `eslint.config.js`, `.dependency-cruiser.cjs`, or `knip.json` is blocked by the pre-commit hook (`scripts/verify-config-lock.mjs`) unless explicitly requested and approved by the user (`ALLOW_CONFIG_EDIT=1`).
3. **Never add unused dependencies or unpinned version specifiers**:
   * `knip` enforces zero unused files, exports, or dependencies. Do not dump unused packages into `knip.json`.
   * `scripts/lint-deprecated-deps.mjs` forbids deprecated packages (direct or transitive in `pnpm-lock.yaml`) and forbids unpinned version specifiers (`"latest"`, `"*"`, `"next"`) in `package.json`.
4. **Never leak secrets or production stack traces**:
   * `scripts/lint-secrets.mjs` and `secretlint` scan the workspace for credentials, tokens, and private keys.
   * Error boundaries must never render `error.stack` in production; always guard stack traces behind `isDev = import.meta.env.DEV`.

---

## 2. UI Primitives, Panda CSS Recipes & Material Design 3 (`@m3e/react`)

### 2.1 Ban on Intrinsic HTML Elements & Generic `<panda.*>` Wrappers

* **Forbidden**: Raw lowercase HTML elements (`<div>`, `<span>`, `<p>`, `<button>`, `<a>`, `<input>`, `<img>`, etc.) in any JSX file.
  * *Exceptions*:
    1. Native `<html>`, `<head>`, and `<meta>` are permitted **only** in the document root shell (`src/root.tsx`). Never use `<panda.html>`, `<panda.head>`, or `<panda.meta>` (Panda CSS misinterprets the HTML `content` attribute on `<meta>` as the CSS `content:` property).
    2. Material 3 Custom Elements (`<m3e-*>`, `<md-*>`, typed in `src/types/material-web.d.ts`) are permitted alongside `@m3e/react` components.
* **Forbidden**: Generic `<panda.div>`, `<panda.span>`, `<panda.p>`, `<panda.button>`, `<panda.a>`, `<panda.img>`, `<panda.input>`, `<panda.meta>`, `<panda.link>`, `<panda.script>`, `<panda.style>`, `<panda.title>`, and any aliased member expression (`<p.div>`, `<p.section>`).
* **Forbidden**: Importing pattern functions from `styled-system/patterns` (use JSX layout components from `styled-system/jsx` instead).
* **Required**:
  * Use dedicated Panda CSS layout primitives from `styled-system/jsx` for layout: `<Box>`, `<Flex>`, `<Grid>`, `<Stack>`, `<HStack>`, `<VStack>`, `<Center>`, `<Wrap>`, `<Circle>`, `<Square>`, `<Container>`.
  * Use semantic `<panda.main>`, `<panda.header>`, `<panda.section>`, `<panda.h1>`, `<panda.pre>`, `<panda.code>` only where semantic landmarks or typography tags are required.
  * Use Material Design 3 components from `@m3e/react` (e.g., `<M3eCard>` from `@m3e/react/card`, `<M3eButton>` from `@m3e/react/button`) for interactive and M3 UI primitives.
  * Note for SSR (`src/worker.ts`): `@m3e/react` relies on Lit Web Components; `ensureSsrDomShim()` in `src/worker.ts` provides the minimal DOM globals required by Cloudflare `workerd` during SSR.

### 2.2 Strict Panda CSS Recipe Enforcement (`panda-recipes` plugin)

The custom AST plugin `scripts/eslint/panda-recipes-plugin.js` inspects `<Box>`, `<Flex>`, `<Grid>`, `<Stack>`, `<HStack>`, `<VStack>`, `<Center>`, `<Wrap>`, `<Circle>`, `<Square>`, `<Container>`, all `<panda.*>` elements, and all `css()` / `css.raw()` calls:

* **Max 3 inline style props per element or `css()` call**:
  * Non-style attributes (`id`, `className`, `role`, `tabIndex`, `aria-*`, `data-*`, `on*`, `ref`, `key`, `children`) do not count toward the limit.
  * If an element or `css({ ... })` call needs **4 or more** style properties (either as JSX props, inside `css={{ ... }}`, or inside `css({ ... })`), extract a `cva()` or `sva()` recipe (or a token recipe in `src/tokens/md3.ts`).
* **Zero conditional expressions (ternaries) in style props, `css={{ ... }}`, or `css({ ... })`**:
  * **Bad**: `<Box bg={isActive ? 'primary' : 'surface'} />` or `css({ bg: isActive ? 'primary' : 'surface' })`.
  * **Good**: Define a `cva` or `sva` recipe with a `variants` key and pass `<Box className={myRecipe({ active: isActive })} />`.
* **Zero JSX prop spreading (`{...props}`) on Panda layout primitives or inside `css()`**:
  * `<Box {...extraProps} />` and `css({ ...extraStyles })` are strictly forbidden to prevent sneaking unvalidated inline styles past the AST linter.
* **Complete Recipe Definitions (`cva` / `sva`)**:
  * Every `cva()` or `sva()` call that defines `variants` **must** also define `defaultVariants`.
  * Every slot listed in `sva({ slots: [...] })` **must** be styled in `base` (no orphan slots).

---

## 3. 100% Pure Solarized & MD3 Design Tokens

* **`strictTokens: true` & Zero Tailwind Preset**:
  * `panda.config.ts` uses only `@pandacss/preset-base` and `src/tokens/md3.ts`. Default Tailwind colors (`emerald.500`, `blue.600`, etc.) do not exist and will fail TypeScript and Panda codegen.
* **No Hardcoded Colors or Raw Lengths in Components**:
  * `scripts/eslint/m3-tokens-plugin.js` and `scripts/eslint/css-tokens-plugin.js` ban hardcoded hex (`#...`), `rgb()`, `rgba()`, `hsl()`, `oklch()`, and named colors outside `src/tokens/md3.ts` and `src/theme/theme.css`.
  * Pure white (`#ffffff`) and pure black (`#000000`) are forbidden everywhere, including in token files. Use the canonical Solarized palette (`#fdf6e3` base3, `#eee8d5` base2, `#073642` base02, `#002b36` base03, `#859900` green primary, `#d33682` magenta secondary, `#268bd2` blue tertiary, `#dc322f` red error).
* **Token Synchronization (`src/tokens/md3.ts` <-> `src/theme/theme.css`)**:
  * Whenever updating radii (`small: 8px`, `medium: 12px`, `large: 16px`, `extraLarge: 28px`, `full: 9999px`), motion durations (`short3 / fast: 150ms`, `medium1 / normal: 250ms`, `long2 / slow: 500ms`), spacing, or semantic colors, keep `src/tokens/md3.ts` and `src/theme/theme.css` strictly synchronized.
* **No Inline `style` Attributes**:
  * `style={{ ... }}` is banned across all JSX elements.

---

## 4. Separation of Concerns: i18n, Accessibility (WCAG 2.2 AA) & MDX Purity

### 4.1 Total Ban on Hardcoded User-Facing Strings in JSX & Functions

`scripts/eslint/restricted-rules.js` blocks all of the following in `.tsx` files (except `.stories.tsx` and `.test.tsx`):

* Raw JSX text: `<Box>Hello</Box>`
* JSX string literals: `<Box>{'Hello'}</Box>`
* JSX template literals (`TemplateLiteral` inside `JSXExpressionContainer`)
* JSX string expressions: `<Box>{'Hello ' + name}</Box>`, `<Box>{String('Hello')}</Box>`, `<Box>{['Hello']}</Box>`
* Local prose or UI string variables inside component functions (`const label = 'Submit'; return <Box>{label}</Box>;`)
* Hardcoded strings in `alt`, `aria-label`, `aria-placeholder`, `aria-roledescription`, `aria-valuetext`, `title`, or default prop values (`label = 'Default'`).

### 4.2 How to Provide Localized Content Correctly

1. **UI & Accessibility Strings (`src/i18n/strings.ts`)**:
   * Add the key and its English (`en`) and French (`fr`) translations to `A11Y_STRINGS` in `src/i18n/strings.ts`.
   * Retrieve the localized string via `resolveA11yString(locale, 'keyName')` or `i18n.t('keyName', { lng: locale })`, or pass it down via typed props/loader data.
2. **Long-Form Content (`src/content/<locale>/*.mdx`)**:
   * Store rich prose in `src/content/en/` and `src/content/fr/`.
   * `scripts/lint-mdx-purity.mjs` enforces **100% pure Markdown** in `.mdx` files: zero HTML tags (`<div>`, `<span>`), zero `style=` or `className=`, zero `import`/`export` statements.
3. **Markdown Documentation (`*.md`)**:
   * `scripts/lint-markdown-structure.mjs` forbids raw HTML tags outside backticks/code fences in `.md` files and requires properly closed code blocks and depth-matched fenced divs (`:::`).

---

## 5. Code Complexity, Duplication & Architectural Boundaries

### 5.1 Code Complexity & Size Limits (`eslint.config.js` & `sonarjs`)

Every function in `src/`, `tests/`, and `scripts/` must obey:

* **Cyclomatic complexity**: `<= 8`
* **Cognitive complexity (`sonarjs/cognitive-complexity`)**: `<= 15`
* **Max lines per function**: `<= 64` (skipping blanks and comments)
* **Max lines per file**: `<= 350`
* **Max nesting depth**: `<= 3`
* **Max parameters per function**: `<= 3` (use a typed options/props interface instead of >3 positional arguments; never mutate a shared context object to bypass parameter limits)
* **Zero code duplication (`jscpd`)**: `.jscpd.json` enforces `threshold: 0` across `src`, `tests`, and `scripts`. Extract shared helpers cleanly instead of copy-pasting blocks.

### 5.2 Module Hierarchy & Dependency Cruiser (`.dependency-cruiser.cjs`)

Imports must flow strictly downward without circular dependencies or wildcard barrel exports (`export * from '...'` is banned):

1. `src/tokens/**` -> leaf layer (cannot import from `components`, `routes`, `root`, or `worker`).
2. `src/i18n/**` & `src/db/**` -> foundational layers (may only import from `tokens` or `i18n`).
3. `src/components/**` -> shared UI layer (may import from `tokens`, `i18n`, `styled-system`; never from `routes`, `root`, or `worker`).
4. `src/routes/**` -> route views and loaders (may import from `components`, `tokens`, `i18n`, `db`, `styled-system`).
5. `src/root.tsx` & `src/worker.ts` -> application shell and edge entrypoints.

### 5.3 React Router v7 Nested Routes & Strategic Error Boundaries

* **Nested Routing (`scripts/lint-routes.mjs` & `react-router-nested` plugin)**:
  * Every UI route in `src/routes.ts` must be nested inside a parent `layout(...)` route that renders `<Outlet />` (e.g., `src/routes/layout.tsx`).
  * Route modules must stay focused on loader/action/meta orchestration and delegate presentation to clean view components.
* **Mandatory Strategic Error Boundaries (`scripts/lint-error-boundaries.mjs`)**:
  * `src/worker.ts` must wrap request handling in `try / catch` inside `handleFetch` and return a `500` JSON diagnostic with `x-error-boundary: worker`.
  * `src/root.tsx` and every route in `src/routes/*.tsx` must export an `ErrorBoundary` function rendering `<ErrorBoundaryView />`.
  * Major route sections must be wrapped in `<StrategicSectionBoundary boundary="section:..." />`.

---

## 6. First-Time-Right TDD, Storybook CSF3 & E2E Verification

### 6.1 Per-File TDD Companion & Coverage Gate (`>= 95%` Required, `100%` Target)

* **Every module in `src/**/*.{ts,tsx}`** (excluding `.d.ts`, `src/types/`, `src/content/`, and `src/routes.ts`) **must have a unit test companion** in `tests/unit/*.test.{ts,tsx}`.
* **Storybook stories (`*.stories.tsx`) do NOT count as unit test companions**:
  * Both `scripts/lint-tdd-companions.mjs` and the pre-commit hook `scripts/verify-tdd-staged.mjs` verify that every staged `src/` implementation file is accompanied by its corresponding unit test in `tests/unit/`.
  * When you modify `src/routes/home.tsx`, you **must** also update and stage `tests/unit/home.test.tsx`.
* **Real Assertions & Per-File Coverage (`vite.config.ts` & `eslint.config.js`)**:
  * Vitest enforces `lines: 95%`, `functions: 95%`, `statements: 95%`, and `branches: 90%` **per file** (`perFile: true`) with `passWithNoTests: false`.
  * `eslint.config.js` strictly forbids skipped/focused/todo tests (`it.skip`, `test.only`, `it.todo`) and forbids `it(...)` / `test(...)` blocks without `expect(...)` assertions.
  * Assert concrete rendered markup (`renderToStaticMarkup`), DOM attributes (`role="alert"`, `data-error-boundary`, `lang="en"`), return values, and both development (`isDev = true`) and production (`isDev = false`) branches.

### 6.2 Storybook Coverage & Strict CSF3 Format (`scripts/lint-storybook-coverage.mjs`)

* Every `.tsx` file in `src/` (components, routes, `root.tsx`) must have a co-located `<name>.stories.tsx` file.
* Every story file must follow strict **CSF3**:
  * Default export `meta` typed with `satisfies Meta<typeof Component>`.
  * Explicit `title` and `component` properties in `meta`.
  * At least one named `export const StoryName: Story = { args: { ... } }`.
  * **Never** use `storiesOf`, `Template.bind({})`, or custom `render:` functions inside story objects (configure component rendering through `args` and `meta` instead).

### 6.3 Pre-Commit Verification Checklist

Before staging or committing any work, always run this exact sequence and ensure zero errors or warnings:

```bash
# 1. Regenerate Panda CSS styled-system & React Router route types
pnpm run codegen:panda && pnpm run codegen:types

# 2. Format all files (Prettier, ESLint --fix, Knip)
pnpm run format

# 3. Run all 20 static quality gates (ESLint, Typecheck, Depcruise, Knip, JSCPD, Secrets, TDD, MDX, Markdown, Size-Limit)
pnpm run lint

# 4. Run all 3 test suites (Unit 100% coverage, Storybook headless Chromium, Playwright Worker SSR + Storybook axe WCAG 2.2 AA)
pnpm run test
```
