import type { ReactNode } from 'react';
import { Outlet } from 'react-router';
import { cva } from 'styled-system/css';
import { Container, panda } from 'styled-system/jsx';
import { ErrorBoundaryView } from '../components/error-boundary.tsx';
import { DEFAULT_LOCALE } from '../i18n/locales.ts';
import { resolveA11yString } from '../i18n/strings.ts';
import type { Route } from './+types/layout';

const appLayoutMainRecipe = cva({
  base: {
    bg: 'background',
    color: 'onBackground',
  },
  variants: {
    spacing: {
      hero: {
        paddingBlock: '16',
        paddingInline: '4',
      },
      compact: {
        paddingBlock: '8',
        paddingInline: '4',
      },
    },
  },
  defaultVariants: {
    spacing: 'hero',
  },
});

export interface AppLayoutViewProps {
  readonly children?: ReactNode;
  readonly locale?: string;
  readonly spacing?: 'hero' | 'compact';
}

export function AppLayoutView({
  children,
  locale = DEFAULT_LOCALE,
  spacing = 'hero',
}: AppLayoutViewProps) {
  return (
    <panda.main
      aria-label={resolveA11yString(locale, 'appMain')}
      className={appLayoutMainRecipe({ spacing })}
    >
      <Container>{children}</Container>
    </panda.main>
  );
}

export default function AppLayout() {
  return (
    <AppLayoutView>
      <Outlet />
    </AppLayoutView>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <AppLayoutView spacing="compact">
      <ErrorBoundaryView
        error={error}
        boundary="route:layout"
        locale={DEFAULT_LOCALE}
      />
    </AppLayoutView>
  );
}
