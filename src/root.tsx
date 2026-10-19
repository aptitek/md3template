import type { ReactNode } from 'react';
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import { panda } from 'styled-system/jsx';
import { ErrorBoundaryView } from './components/error-boundary.tsx';
import { DEFAULT_LOCALE } from './i18n/locales.ts';
import { resolveA11yString } from './i18n/strings.ts';
import type { Route } from './+types/root';
import './index.css';

export function Layout({ children }: { readonly children: ReactNode }) {
  return (
    <panda.html lang={DEFAULT_LOCALE}>
      <panda.head>
        <panda.meta charSet="utf-8" />
        <panda.meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <Meta />
        <Links />
      </panda.head>
      <panda.body bg="background" color="onBackground">
        {children}
        <ScrollRestoration />
        <Scripts />
      </panda.body>
    </panda.html>
  );
}

export function AppShell({ children }: { readonly children?: ReactNode }) {
  return (
    <panda.div data-boundary-scope="root">{children ?? <Outlet />}</panda.div>
  );
}

export default function App() {
  return <AppShell />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <panda.main
      aria-label={resolveA11yString(DEFAULT_LOCALE, 'appMain')}
      bg="background"
      color="onBackground"
    >
      <ErrorBoundaryView
        error={error}
        boundary="root"
        locale={DEFAULT_LOCALE}
      />
    </panda.main>
  );
}
