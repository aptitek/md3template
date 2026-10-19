import type { ReactNode } from 'react';
import { isRouteErrorResponse } from 'react-router';
import { sva } from 'styled-system/css';
import { Box, Container, panda } from 'styled-system/jsx';
import { DEFAULT_LOCALE } from '../i18n/locales.ts';
import { resolveA11yString } from '../i18n/strings.ts';

type StrategicBoundaryId = 'root' | `route:${string}` | `section:${string}`;

const errorBoundaryRecipe = sva({
  slots: ['root', 'card', 'text', 'stackTrace'],
  base: {
    root: {
      paddingBlock: '8',
      paddingInline: '4',
    },
    card: {
      display: 'flex',
      flexDirection: 'column',
      bg: 'surfaceContainer',
      color: 'onSurface',
    },
    text: {
      color: 'onSurface',
    },
    stackTrace: {
      padding: '4',
      whiteSpace: 'pre-wrap',
      bg: 'surfaceContainerHighest',
      color: 'onSurface',
      borderRadius: 'small',
    },
  },
  variants: {
    density: {
      comfortable: {
        card: {
          gap: '4',
          padding: '6',
          borderRadius: 'medium',
        },
      },
      compact: {
        card: {
          gap: '2',
          padding: '4',
          borderRadius: 'small',
        },
      },
    },
  },
  defaultVariants: {
    density: 'comfortable',
  },
});

export interface ErrorInfo {
  readonly status: number;
  readonly message: string;
  readonly details: string;
  readonly stack?: string;
}

function resolveRouteErrorInfo(
  error: { readonly status: number; readonly statusText: string },
  locale: string
): ErrorInfo {
  if (error.status === 404) {
    return {
      status: 404,
      message: resolveA11yString(locale, 'notFoundTitle'),
      details: resolveA11yString(locale, 'notFoundDetails'),
    };
  }
  return {
    status: error.status,
    message: resolveA11yString(locale, 'errorTitle'),
    details:
      error.statusText || resolveA11yString(locale, 'unexpectedErrorDetails'),
  };
}

export function resolveErrorInfo(
  error: unknown,
  locale: string = DEFAULT_LOCALE,
  isDev: boolean = import.meta.env.DEV
): ErrorInfo {
  if (isRouteErrorResponse(error)) {
    return resolveRouteErrorInfo(error, locale);
  }

  if (error instanceof Error) {
    return {
      status: 500,
      message: resolveA11yString(locale, 'errorTitle'),
      details: error.message,
      stack: isDev ? error.stack : undefined,
    };
  }

  return {
    status: 500,
    message: resolveA11yString(locale, 'errorTitle'),
    details: resolveA11yString(locale, 'unexpectedErrorDetails'),
  };
}

export interface ErrorBoundaryViewProps {
  readonly error: unknown;
  readonly boundary: StrategicBoundaryId;
  readonly locale?: string;
  readonly isDev?: boolean;
}

export function ErrorBoundaryView({
  error,
  boundary,
  locale = DEFAULT_LOCALE,
  isDev = import.meta.env.DEV,
}: ErrorBoundaryViewProps) {
  const info = resolveErrorInfo(error, locale, isDev);
  const boundaryBadge = `[${boundary}]`;
  const styles = errorBoundaryRecipe();

  return (
    <panda.section
      role="alert"
      aria-label={resolveA11yString(locale, 'errorBoundaryLabel')}
      data-error-boundary={boundary}
      data-error-status={String(info.status)}
      className={styles.root}
    >
      <Container>
        <Box className={styles.card}>
          <Box className={styles.text}>{boundaryBadge}</Box>
          <panda.h1 className={styles.text}>{info.message}</panda.h1>
          <Box className={styles.text}>{info.details}</Box>
          {isDev && info.stack ? (
            <panda.pre className={styles.stackTrace}>
              <panda.code>{info.stack}</panda.code>
            </panda.pre>
          ) : null}
        </Box>
      </Container>
    </panda.section>
  );
}

export interface StrategicSectionBoundaryProps {
  readonly boundary: `section:${string}`;
  readonly error?: unknown;
  readonly locale?: string;
  readonly children: ReactNode;
}

export function StrategicSectionBoundary({
  boundary,
  error,
  locale = DEFAULT_LOCALE,
  children,
}: StrategicSectionBoundaryProps) {
  if (error !== undefined && error !== null) {
    return (
      <ErrorBoundaryView error={error} boundary={boundary} locale={locale} />
    );
  }

  return <Box data-boundary-scope={boundary}>{children}</Box>;
}
