import { Container, Flex, panda, Stack } from 'styled-system/jsx';
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
    <panda.main
      aria-label={resolveA11yString(locale, 'appMain')}
      paddingBlock="16"
      paddingInline="4"
      bg="background"
      color="onBackground"
    >
      <Container>
        <StrategicSectionBoundary
          boundary="section:home-hero"
          error={sectionError}
          locale={locale}
        >
          <Flex align="center" justify="center">
            <Stack
              gap="4"
              padding="6"
              bg="surfaceContainer"
              borderRadius="large"
            >
              <panda.h1 color="onSurface">{title}</panda.h1>
              <panda.p color="onSurface">{description}</panda.p>
            </Stack>
          </Flex>
        </StrategicSectionBoundary>
      </Container>
    </panda.main>
  );
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <HomeView title={loaderData.title} description={loaderData.description} />
  );
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
        boundary="route:home"
        locale={DEFAULT_LOCALE}
      />
    </panda.main>
  );
}
