import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import AppLayout, {
  AppLayoutView,
  ErrorBoundary,
} from '../../src/routes/layout.tsx';

describe('AppLayout Nested Parent Route Module', () => {
  it('renders AppLayoutView with hero and compact spacing variants', () => {
    const heroHtml = renderToStaticMarkup(
      <AppLayoutView locale="en" spacing="hero">
        <span>Child Outlet Content</span>
      </AppLayoutView>
    );
    expect(heroHtml).toContain('Child Outlet Content');
    expect(heroHtml).toContain('<main');

    const compactHtml = renderToStaticMarkup(
      <AppLayoutView locale="fr" spacing="compact">
        <span>Contenu Imbriqué</span>
      </AppLayoutView>
    );
    expect(compactHtml).toContain('Contenu Imbriqué');
  });

  it('renders nested child routes via <Outlet /> in default AppLayout', () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          Component: AppLayout,
          children: [
            {
              index: true,
              Component: () => <span>Projected Outlet Leaf</span>,
            },
          ],
        },
      ],
      { initialEntries: ['/'] }
    );

    const html = renderToStaticMarkup(<RouterProvider router={router} />);
    expect(html).toContain('Projected Outlet Leaf');
    expect(html).toContain('<main');
  });

  it('renders layout-level ErrorBoundary with route:layout attribution', () => {
    const html = renderToStaticMarkup(
      <ErrorBoundary error={new Error('Layout failure')} params={{}} />
    );
    expect(html).toContain('data-error-boundary="route:layout"');
    expect(html).toContain('Layout failure');
  });
});
