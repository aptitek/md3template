---
name: vitest
description: Vitest fast unit testing framework powered by Vite with Jest-compatible API. Use when writing tests, mocking, configuring coverage, or working with test filtering and fixtures.
metadata:
  author: Anthony Fu
  version: "2026.9.25"
  source: Generated from https://github.com/vitest-dev/vitest, scripts located at https://github.com/antfu/skills
---

Vitest is a next-generation testing framework powered by Vite. It provides a Jest-compatible API with native ESM, TypeScript, and JSX support out of the box. Vitest shares the same config, transformers, resolvers, and plugins with your Vite app.

**Key Features:**
- Vite-native: Uses Vite's transformation pipeline for fast HMR-like test updates
- Jest-compatible: Drop-in replacement for most Jest test suites
- Smart watch mode: Only reruns affected tests based on module graph
- Native ESM, TypeScript, JSX support without configuration
- Multi-threaded workers for parallel test execution
- Built-in coverage via V8 or Istanbul
- Snapshot testing, mocking, and spy utilities

> The skill is based on Vitest 5.0.1, generated at 2026-09-25.

## `md3template` Repository Configuration & Cached Tiers

- **Transform & Results Caching**: Vite/Vitest caches transforms in `node_modules/.cache/vite`, Wireit caches task fingerprints in `.wireit/`, and StrykerJS caches incremental mutation analysis in `node_modules/.cache/stryker/incremental.json`.
- **Commands**:
  - `pnpm run test:quick` / `pnpm run test:unit`: Fast cached unit test run (`vitest run --project=unit`).
  - `pnpm run check:quick`: Fast AI agent inner-loop check (ESLint + typecheck + architectural AST checks + `test:unit`).
  - `pnpm run test:coverage` / `pnpm run check:commit`: Unit tests with V8 coverage enforcement (`vitest run --coverage --project=unit`).
  - `pnpm run test:mutation`: Incremental StrykerJS mutation testing (`stryker run` with `@stryker-mutator/vitest-runner`, `>= 95%` threshold).
  - `pnpm run test:stories`: Headless Chromium Storybook test runner (`vitest run --project=storybook`).
  - `pnpm run check:push`: Full 20-gate lint + 4-suite test pipeline.
- **Strict Test Purity Bans (`eslint.config.js`)**:
  - `vi.mock()` and `jest.mock()` are forbidden (use explicit parameter injection).
  - `.toBeTruthy()`, `.toBeFalsy()`, `.toBeDefined()`, `.toMatchSnapshot()`, and `.toMatchInlineSnapshot()` are forbidden.
  - `it.skip`, `test.only`, `it.todo`, and test blocks without `expect(...)` are forbidden.

## Core

| Topic | Description | Reference |
|-------|-------------|-----------|
| Configuration | Vitest and Vite config integration, defineConfig usage | [core-config](references/core-config.md) |
| CLI | Command line interface, commands and options | [core-cli](references/core-cli.md) |
| Test API | test/it function, modifiers like skip, only, concurrent | [core-test-api](references/core-test-api.md) |
| Describe API | describe/suite for grouping tests and nested suites | [core-describe](references/core-describe.md) |
| Expect API | Assertions with toBe, toEqual, matchers and asymmetric matchers | [core-expect](references/core-expect.md) |
| Hooks | beforeEach, afterEach, beforeAll, afterAll, aroundEach | [core-hooks](references/core-hooks.md) |

## Features

| Topic | Description | Reference |
|-------|-------------|-----------|
| Mocking | Mock functions, modules, timers, dates with vi utilities | [features-mocking](references/features-mocking.md) |
| Snapshots | Snapshot testing with toMatchSnapshot and inline snapshots | [features-snapshots](references/features-snapshots.md) |
| Coverage | Code coverage with V8 or Istanbul providers | [features-coverage](references/features-coverage.md) |
| Test Context | Test fixtures, context.expect, test.extend for custom fixtures | [features-context](references/features-context.md) |
| Concurrency | Concurrent tests, parallel execution, sharding | [features-concurrency](references/features-concurrency.md) |
| Filtering | Filter tests by name, file patterns, tags | [features-filtering](references/features-filtering.md) |
| Test Tags | Label tests with tags to filter runs and apply shared options | [features-test-tags](references/features-test-tags.md) |
| Reporters | Built-in reporters, default selection, CI/output config | [features-reporters](references/features-reporters.md) |
| Benchmarking | Write benchmarks with the bench fixture (Tinybench) | [features-benchmarking](references/features-benchmarking.md) |

## Advanced

| Topic | Description | Reference |
|-------|-------------|-----------|
| Vi Utilities | vi helper: mock, spyOn, fake timers, hoisted, waitFor | [advanced-vi](references/advanced-vi.md) |
| Environments | Test environments: node, jsdom, happy-dom, custom | [advanced-environments](references/advanced-environments.md) |
| Type Testing | Type-level testing with expectTypeOf and assertType | [advanced-type-testing](references/advanced-type-testing.md) |
| Projects | Multi-project workspaces, different configs per project | [advanced-projects](references/advanced-projects.md) |
