import type { ReactNode } from 'react';
import { isRouteErrorResponse } from 'react-router';
import { sva } from 'styled-system/css';
import { Box, Container, panda } from 'styled-system/jsx';
import { surfaceCard } from 'styled-system/recipes';
import { DEFAULT_LOCALE } from '../i18n/locales.ts';
import { resolveA11yString } from '../i18n/strings.ts';

type StrategicBoundaryId = 'root' | `route:${string}` | `section:${string}`;

const errorBoundaryRecipe = sva({
  slots: ['root', 'text', 'stackTrace'],
  base: {
    root: { paddingBlock: '8', paddingInline: '4' },
    text: { color: 'onSurface' },
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
      comfortable: { root: { paddingBlock: '8', paddingInline: '4' } },
      compact: { root: { paddingBlock: '4', paddingInline: '2' } },
    },
  },
  defaultVariants: { density: 'comfortable' },
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

function resolveErrorInstanceInfo(
  error: Error,
  locale: string,
  isDev: boolean
): ErrorInfo {
  return {
    status: 500,
    message: resolveA11yString(locale, 'errorTitle'),
    details: error.message,
    stack: isDev ? error.stack : undefined,
  };
}

function resolveErrorInfoCore(
  error: unknown,
  locale: string,
  isDev: boolean
): ErrorInfo {
  if (isRouteErrorResponse(error)) {
    return resolveRouteErrorInfo(error, locale);
  }
  if (error instanceof Error) {
    return resolveErrorInstanceInfo(error, locale, isDev);
  }
  return {
    status: 500,
    message: resolveA11yString(locale, 'errorTitle'),
    details: resolveA11yString(locale, 'unexpectedErrorDetails'),
  };
}

export function resolveErrorInfo(
  error: unknown,
  locale: string = DEFAULT_LOCALE,
  isDev?: boolean
): ErrorInfo {
  return resolveErrorInfoCore(error, locale, isDev ?? import.meta.env.DEV);
}

export interface ErrorBoundaryViewProps {
  readonly error: unknown;
  readonly boundary: StrategicBoundaryId;
  readonly locale?: string;
  readonly isDev?: boolean;
}

function renderStackTrace(
  stack: string | undefined,
  className: string | undefined
): ReactNode {
  if (!stack) return null;
  return (
    <panda.pre className={className}>
      <panda.code>{stack}</panda.code>
    </panda.pre>
  );
}

export function ErrorBoundaryView(props: ErrorBoundaryViewProps) {
  const locale = props.locale ?? DEFAULT_LOCALE;
  const info = resolveErrorInfo(props.error, locale, props.isDev);
  const boundaryBadge = `[${props.boundary}]`;
  const styles = errorBoundaryRecipe();

  return (
    <panda.section
      role="alert"
      aria-label={resolveA11yString(locale, 'errorBoundaryLabel')}
      data-error-boundary={props.boundary}
      data-error-status={String(info.status)}
      className={styles.root}
    >
      <Container>
        <Box className={surfaceCard({ size: 'md' })}>
          <Box className={styles.text}>{boundaryBadge}</Box>
          <panda.h1 className={styles.text}>{info.message}</panda.h1>
          <Box className={styles.text}>{info.details}</Box>
          {renderStackTrace(info.stack, styles.stackTrace)}
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
  if (error != null) {
    return (
      <ErrorBoundaryView error={error} boundary={boundary} locale={locale} />
    );
  }

  return <Box data-boundary-scope={boundary}>{children}</Box>;
}
