import { describe, expect, it } from 'vitest';
import routesConfig from '../../src/routes.ts';

describe('React Router Routes Config', () => {
  it('exports the index route pointing to routes/home.tsx', () => {
    const routes = Array.from(routesConfig);
    expect(routes).toHaveLength(1);
    expect(routes[0]?.file).toBe('routes/home.tsx');
    expect(routes[0]?.index).toBe(true);
  });
});
