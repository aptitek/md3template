import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import { Box, panda } from 'styled-system/jsx';
import { ErrorBoundaryView } from './components/error-boundary.tsx';
import { DEFAULT_LOCALE } from './i18n/locales.ts';
import { i18n, resolveA11yString } from './i18n/strings.ts';
import type { Route } from './+types/root';
import './index.css';

export function Layout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <panda.body bg="background" color="onBackground">
        {children}
        <ScrollRestoration />
        <Scripts />
      </panda.body>
    </html>
  );
}

export function AppShell({ children }: { readonly children?: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <Box data-boundary-scope="root">{children ?? <Outlet />}</Box>
    </I18nextProvider>
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
