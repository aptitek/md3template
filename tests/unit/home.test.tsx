import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Home, {
  ErrorBoundary,
  HomeView,
  loader,
  meta,
} from '../../src/routes/home.tsx';

describe('Home Route Module & Strategic Boundaries', () => {
  it('returns localized metadata entries from meta()', () => {
    const entries = meta();
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({ title: 'MD3 Template' });
    expect(entries[1]).toEqual({
      name: 'description',
      content: 'Material Design 3 & React Router Template',
    });
  });

  it('returns localized loader data from loader()', () => {
    const data = loader();
    expect(data.title).toBe('MD3 Template');
    expect(data.description).toBe('Material Design 3 & React Router Template');
  });

  it('renders HomeView, default Home, and section-level boundary cleanly', () => {
    const viewHtml = renderToStaticMarkup(
      <HomeView title="Custom Title" description="Custom Desc" locale="fr" />
    );
    expect(viewHtml).toContain('Custom Title');
    expect(viewHtml).toContain('m3e-card');
    expect(viewHtml).toContain('md3-surface-card--size_lg');
    expect(viewHtml).toContain('data-boundary-scope="section:home-hero"');

    const sectionErrHtml = renderToStaticMarkup(
      <HomeView
        title="Custom Title"
        description="Custom Desc"
        sectionError={new Error('Hero widget failed')}
      />
    );
    expect(sectionErrHtml).toContain('data-error-boundary="section:home-hero"');
    expect(sectionErrHtml).toContain('Hero widget failed');

    const data = loader();
    const homeHtml = renderToStaticMarkup(
      <Home loaderData={data} params={{}} matches={[] as never} />
    );
    expect(homeHtml).toContain('MD3 Template');
  });

  it('renders route-level ErrorBoundary with route:home attribution', () => {
    const routeBoundaryHtml = renderToStaticMarkup(
      <ErrorBoundary error={new Error('Route loader failed')} params={{}} />
    );
    expect(routeBoundaryHtml).toContain('data-error-boundary="route:home"');
    expect(routeBoundaryHtml).toContain('Route loader failed');
  });
});
