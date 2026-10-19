import { cva } from 'styled-system/css';
import { Container, Flex, panda } from 'styled-system/jsx';
import { surfaceCard } from 'styled-system/recipes';
import {
  ErrorBoundaryView,
  StrategicSectionBoundary,
} from '../components/error-boundary.tsx';
import { DEFAULT_LOCALE } from '../i18n/locales.ts';
import { resolveA11yString } from '../i18n/strings.ts';
import type { Route } from './+types/home';

const pageMainRecipe = cva({
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
      className={pageMainRecipe({ spacing: 'hero' })}
    >
      <Container>
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
      className={pageMainRecipe({ spacing: 'compact' })}
    >
      <ErrorBoundaryView
        error={error}
        boundary="route:home"
        locale={DEFAULT_LOCALE}
      />
    </panda.main>
  );
}
