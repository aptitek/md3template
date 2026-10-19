import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import {
  analyzeRoutesConfigSource,
  moduleRendersOutlet,
  validateRouteHierarchy,
} from '../../scripts/lint-routes.mjs';
import routesConfig from '../../src/routes.ts';

describe('React Router Nested Hierarchy & Route Parsimony', () => {
  const eslint = new ESLint({ overrideConfigFile: 'eslint.config.js' });

  it('exports a nested layout route hierarchy in src/routes.ts reflecting the UI shell', () => {
    const [rootLayout] = Array.from(routesConfig);
    expect(rootLayout).toMatchObject({
      file: 'routes/layout.tsx',
      children: [
        {
          file: 'routes/home.tsx',
          index: true,
        },
      ],
    });
  });

  it('verifies zero route hierarchy or parsimony violations across the repository', () => {
    const { errors, flatNodes } = validateRouteHierarchy();
    expect(errors).toEqual([]);
    expect(flatNodes).toHaveLength(2);
  });

  it('rejects un-nested top-level routes, multi-segment flat paths, prefix(), and parsimony budget violations', () => {
    const flatRootIndex = analyzeRoutesConfigSource(`
      import { index } from '@react-router/dev/routes';
      export default [index('routes/home.tsx')];
    `);
    expect(
      flatRootIndex.errors.some((e) => e.includes('has no nested children'))
    ).toBe(true);

    const flatMultiSegment = analyzeRoutesConfigSource(`
      import { layout, route } from '@react-router/dev/routes';
      export default [
        layout('routes/layout.tsx', [
          route('dashboard/settings', 'routes/settings.tsx'),
        ]),
      ];
    `);
    expect(
      flatMultiSegment.errors.some((e) =>
        e.includes('Flat multi-segment route path')
      )
    ).toBe(true);

    const prefixUsage = analyzeRoutesConfigSource(`
      import { layout, prefix, index } from '@react-router/dev/routes';
      export default [
        layout('routes/layout.tsx', [
          prefix('admin', [index('routes/admin.tsx')]),
        ]),
      ];
    `);
    expect(
      prefixUsage.errors.some((e) => e.includes('`prefix()` is prohibited'))
    ).toBe(true);

    const topLevelSprawl = analyzeRoutesConfigSource(`
      import { layout, index } from '@react-router/dev/routes';
      export default [
        layout('routes/l1.tsx', [index('routes/h1.tsx')]),
        layout('routes/l2.tsx', [index('routes/h2.tsx')]),
        layout('routes/l3.tsx', [index('routes/h3.tsx')]),
      ];
    `);
    expect(
      topLevelSprawl.errors.some((e) => e.includes('top-level entries'))
    ).toBe(true);
  });

  it('detects whether a parent layout route renders <Outlet />', () => {
    expect(
      moduleRendersOutlet(
        `import { Outlet } from 'react-router'; export default function L() { return <Outlet />; }`
      )
    ).toBe(true);
    expect(
      moduleRendersOutlet(`export default function L() { return <div />; }`)
    ).toBe(false);
  });

  it('enforces nested routing and parsimony via the react-router-nested ESLint plugin', async () => {
    const badRoutesConfig = `
import { type RouteConfig, index, prefix, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('settings/profile', 'routes/profile.tsx'),
  prefix('v1', [index('routes/v1.tsx')]),
] satisfies RouteConfig;
`;
    const results = await eslint.lintText(badRoutesConfig, {
      filePath: 'src/routes.ts',
    });
    const messages = results[0]?.messages.map((m) => m.message) ?? [];
    expect(messages.some((m) => m.includes('Route parsimony violation'))).toBe(
      true
    );
    expect(
      messages.some((m) => m.includes('Un-nested top-level route detected'))
    ).toBe(true);
    expect(
      messages.some((m) => m.includes('Flat multi-segment route path'))
    ).toBe(true);
    expect(messages.some((m) => m.includes('`prefix()` is forbidden'))).toBe(
      true
    );
  });

  it('forbids <Routes>/<Route> declarative routing and duplicate <panda.main> in leaf routes', async () => {
    const badLeafRoute = `
import { Routes, Route } from 'react-router';
import { panda } from 'styled-system/jsx';

export function BadLeaf() {
  return (
    <panda.main>
      <Routes>
        <Route path="/" />
      </Routes>
    </panda.main>
  );
}
`;
    const results = await eslint.lintText(badLeafRoute, {
      filePath: 'src/routes/leaf.tsx',
    });
    const messages = results[0]?.messages.map((m) => m.message) ?? [];
    expect(
      messages.some((m) =>
        m.includes("Component-level or ad-hoc router API 'Routes' is forbidden")
      )
    ).toBe(true);
    expect(
      messages.some((m) =>
        m.includes('Leaf route modules must not declare `<panda.main>`')
      )
    ).toBe(true);
  });
});
