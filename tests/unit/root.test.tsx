import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App, { AppShell, ErrorBoundary, Layout } from '../../src/root.tsx';

describe('Root Application Module', () => {
  it('renders AppShell, App, Layout, and Root ErrorBoundary with semantic HTML and i18n context', () => {
    const shellHtml = renderToStaticMarkup(<AppShell>Child</AppShell>);
    expect(shellHtml).toContain('Child');
    expect(shellHtml).toContain('data-boundary-scope="root"');

    const defaultShellHtml = renderToStaticMarkup(<AppShell />);
    expect(defaultShellHtml).toContain('data-boundary-scope="root"');

    const appElement = App();
    expect(appElement.type).toBe(AppShell);

    const layoutElement = Layout({ children: 'BodyContent' });
    expect(layoutElement.type).toBe('html');
    expect(layoutElement.props.lang).toBe('en');

    const rootBoundaryHtml = renderToStaticMarkup(
      <ErrorBoundary error={new Error('Fatal crash')} params={{}} />
    );
    expect(rootBoundaryHtml).toContain('data-error-boundary="root"');
    expect(rootBoundaryHtml).toContain('Fatal crash');
  });
});
