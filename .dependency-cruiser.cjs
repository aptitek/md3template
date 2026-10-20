/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies are forbidden.',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'no-orphans',
      severity: 'error',
      comment: 'Orphan modules are forbidden.',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)[.][^/]+[.](?:js|cjs|mjs|ts|cts|mts|json)$',
          '[.]d[.]ts$',
          '(^|/)tsconfig.*[.]json$',
          '(^|/)(?:vite|playwright|react-router|panda|eslint|commitlint|drizzle)[.]config[.](?:js|cjs|mjs|ts|cts|mts|json)$',
          '^src/(?:worker[.]ts|root[.]tsx|routes[.]ts|routes/.*[.]tsx|tokens/.*[.]ts|db/.*[.]ts|.*[.]stories[.]tsx)$',
          '^tests/',
          '^scripts/',
        ],
      },
      to: {},
    },
    {
      name: 'no-deprecated-core',
      severity: 'error',
      from: {},
      to: {
        dependencyTypes: ['core'],
        path: [
          '^v8/tools/',
          '^node-inspect/',
          '^async_hooks$',
          '^punycode$',
          '^domain$',
          '^constants$',
          '^sys$',
          '^_linklist$',
          '^_stream_wrap$',
        ],
      },
    },
    {
      name: 'not-to-deprecated',
      severity: 'error',
      from: {},
      to: {
        dependencyTypes: ['deprecated'],
      },
    },
    {
      name: 'no-non-package-json',
      severity: 'error',
      from: {},
      to: {
        dependencyTypes: ['npm-no-pkg', 'npm-unknown'],
      },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      from: {},
      to: {
        couldNotResolve: true,
        pathNot: ['^virtual:react-router/', '^cloudflare:', '[+]types/'],
      },
    },
    {
      name: 'no-duplicate-dep-types',
      severity: 'error',
      from: {},
      to: {
        moreThanOneDependencyType: true,
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'not-to-spec',
      severity: 'error',
      from: {},
      to: {
        path: '[.](?:spec|test)[.](?:js|mjs|cjs|jsx|ts|mts|cts|tsx)$',
      },
    },
    {
      name: 'not-to-dev-dep',
      severity: 'error',
      from: {
        path: '^(src)',
        pathNot:
          '[.](?:spec|test|stories)[.](?:js|mjs|cjs|jsx|ts|mts|cts|tsx)$',
      },
      to: {
        dependencyTypes: ['npm-dev'],
        dependencyTypesNot: ['type-only'],
        pathNot: ['node_modules/@types/'],
      },
    },
    {
      name: 'tokens-independence',
      severity: 'error',
      comment: 'Design tokens must not depend on UI, routes, or i18n layers.',
      from: { path: '^src/tokens/' },
      to: { path: '^src/(?!tokens/)' },
    },
    {
      name: 'i18n-independence',
      severity: 'error',
      comment: 'i18n layer must only depend on tokens or i18n.',
      from: { path: '^src/i18n/' },
      to: { path: '^src/(?!tokens/|i18n/)' },
    },
    {
      name: 'atomic-atoms-hierarchy',
      severity: 'error',
      comment:
        'Atoms must not import from molecules, organisms, templates, pages, or routes.',
      from: { path: '^src/components/atoms/' },
      to: {
        path: '^src/(?:components/(?:molecules|organisms|templates|pages)/|routes/)',
      },
    },
    {
      name: 'atomic-molecules-hierarchy',
      severity: 'error',
      comment:
        'Molecules must not import from organisms, templates, pages, routes, or db.',
      from: { path: '^src/components/molecules/' },
      to: {
        path: '^src/(?:components/(?:organisms|templates|pages)/|routes/|db/)',
      },
    },
    {
      name: 'atomic-organisms-hierarchy',
      severity: 'error',
      comment: 'Organisms must not import from templates, pages, or routes.',
      from: { path: '^src/components/organisms/' },
      to: {
        path: '^src/(?:components/(?:templates|pages)/|routes/)',
      },
    },
    {
      name: 'atomic-templates-hierarchy',
      severity: 'error',
      comment:
        'Templates must not import from pages, routes, i18n, or db (pure spatial slots only).',
      from: { path: '^src/components/templates/' },
      to: {
        path: '^src/(?:components/pages/|routes/|i18n/|db/)',
      },
    },
    {
      name: 'routes-hierarchy',
      severity: 'error',
      comment:
        'Routes must orchestrate templates/organisms and must not directly import atoms or molecules.',
      from: { path: '^src/routes/' },
      to: {
        path: '^src/components/(?:atoms|molecules)/',
      },
    },
    {
      name: 'scripts-independence',
      severity: 'error',
      comment:
        'Guardian scripts and ESLint plugins must not import runtime application code from src/ or tests/.',
      from: { path: '^scripts/' },
      to: { path: '^(?:src/(?!types/)|tests/)' },
    },
  ],
  options: {
    doNotFollow: {
      path: ['node_modules', 'styled-system'],
    },
    exclude: {
      path: [
        'styled-system',
        '.react-router',
        '.wrangler',
        'drizzle',
        'build',
        'coverage',
      ],
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.cloudflare.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
  },
};
