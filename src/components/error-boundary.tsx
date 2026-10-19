import type { ReactNode } from 'react';
import { isRouteErrorResponse } from 'react-router';
import { Container, panda, Stack } from 'styled-system/jsx';
import { DEFAULT_LOCALE } from '../i18n/locales.ts';
import { resolveA11yString } from '../i18n/strings.ts';

type StrategicBoundaryId = 'root' | `route:${string}` | `section:${string}`;

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

  return (
    <panda.section
      role="alert"
      aria-label={resolveA11yString(locale, 'errorBoundaryLabel')}
      data-error-boundary={boundary}
      data-error-status={String(info.status)}
      paddingBlock="8"
      paddingInline="4"
    >
      <Container>
        <Stack gap="4" padding="6" bg="surfaceContainer" borderRadius="medium">
          <panda.p color="onSurface">{boundaryBadge}</panda.p>
          <panda.h1 color="onSurface">{info.message}</panda.h1>
          <panda.p color="onSurface">{info.details}</panda.p>
          {info.stack ? (
            <panda.pre
              padding="4"
              whiteSpace="pre-wrap"
              bg="surfaceContainerHighest"
              color="onSurface"
              borderRadius="small"
            >
              <panda.code>{info.stack}</panda.code>
            </panda.pre>
          ) : null}
        </Stack>
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
