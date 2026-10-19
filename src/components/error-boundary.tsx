import type { ReactNode } from 'react';
import { isRouteErrorResponse } from 'react-router';
import { sva } from 'styled-system/css';
import { Container, panda } from 'styled-system/jsx';
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

export function resolveErrorInfo(
  error: unknown,
  locale: string = DEFAULT_LOCALE
): ErrorInfo {
  if (isRouteErrorResponse(error)) {
    const isNotFound = error.status === 404;
    const fallbackDetails = resolveA11yString(locale, 'unexpectedErrorDetails');
    return {
      status: error.status,
      message: resolveA11yString(
        locale,
        isNotFound ? 'notFoundTitle' : 'errorTitle'
      ),
      details: isNotFound
        ? resolveA11yString(locale, 'notFoundDetails')
        : error.statusText || fallbackDetails,
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      message: resolveA11yString(locale, 'errorTitle'),
      details: error.message,
      stack: error.stack,
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
}

export function ErrorBoundaryView({
  error,
  boundary,
  locale = DEFAULT_LOCALE,
}: ErrorBoundaryViewProps) {
  const info = resolveErrorInfo(error, locale);
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
        <panda.div className={styles.card}>
          <panda.p className={styles.text}>{boundaryBadge}</panda.p>
          <panda.h1 className={styles.text}>{info.message}</panda.h1>
          <panda.p className={styles.text}>{info.details}</panda.p>
          {info.stack ? (
            <panda.pre className={styles.stackTrace}>
              <panda.code>{info.stack}</panda.code>
            </panda.pre>
          ) : null}
        </panda.div>
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

  return <panda.div data-boundary-scope={boundary}>{children}</panda.div>;
}
