import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App, { AppShell, ErrorBoundary, Layout } from '../../src/root.tsx';

describe('Root Application Module', () => {
  it('renders AppShell, App, Layout, and Root ErrorBoundary cleanly', () => {
    const shellHtml = renderToStaticMarkup(<AppShell>Child</AppShell>);
    expect(shellHtml).toContain('Child');
    expect(shellHtml).toContain('data-boundary-scope="root"');

    const defaultShellElement = AppShell({});
    expect(defaultShellElement).toBeTruthy();

    const appElement = App();
    expect(appElement).toBeTruthy();

    const layoutElement = Layout({ children: 'BodyContent' });
    expect(layoutElement).toBeTruthy();

    const rootBoundaryHtml = renderToStaticMarkup(
      <ErrorBoundary error={new Error('Fatal crash')} params={{}} />
    );
    expect(rootBoundaryHtml).toContain('data-error-boundary="root"');
    expect(rootBoundaryHtml).toContain('Fatal crash');
  });
});
