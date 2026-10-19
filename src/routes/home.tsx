import { Flex, panda } from 'styled-system/jsx';
import { surfaceCard } from 'styled-system/recipes';
import {
  ErrorBoundaryView,
  StrategicSectionBoundary,
} from '../components/error-boundary.tsx';
import { DEFAULT_LOCALE } from '../i18n/locales.ts';
import { resolveA11yString } from '../i18n/strings.ts';
import type { Route } from './+types/home';

export function meta() {
  return [
    { title: resolveA11yString(DEFAULT_LOCALE, 'appTitle') },
    {
      name: 'description',
      content: resolveA11yString(DEFAULT_LOCALE, 'appDescription'),
    },
  ];
}

export function loader() {
  return {
    title: resolveA11yString(DEFAULT_LOCALE, 'appTitle'),
    description: resolveA11yString(DEFAULT_LOCALE, 'appDescription'),
  };
}

export interface HomeViewProps {
  readonly title: string;
  readonly description: string;
  readonly locale?: string;
  readonly sectionError?: unknown;
}

export function HomeView({
  title,
  description,
  locale = DEFAULT_LOCALE,
  sectionError,
}: HomeViewProps) {
  return (
    <StrategicSectionBoundary
      boundary="section:home-hero"
      error={sectionError}
      locale={locale}
    >
      <Flex align="center" justify="center">
        <panda.div className={surfaceCard({ size: 'lg' })}>
          <panda.h1 color="onSurface">{title}</panda.h1>
          <panda.p color="onSurface">{description}</panda.p>
        </panda.div>
      </Flex>
    </StrategicSectionBoundary>
  );
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <HomeView title={loaderData.title} description={loaderData.description} />
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <ErrorBoundaryView
      error={error}
      boundary="route:home"
      locale={DEFAULT_LOCALE}
    />
  );
}
