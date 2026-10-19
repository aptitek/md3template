import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  hasExportedFunction,
  hasTryCatchInFunction,
  validateStrategicErrorBoundaries,
} from '../../scripts/lint-error-boundaries.mjs';
import {
  ErrorBoundaryView,
  resolveErrorInfo,
  StrategicSectionBoundary,
} from '../../src/components/error-boundary.tsx';

describe('Strategic Error Boundary Component & Validator Gate', () => {
  it('resolves 404 and 500 route error responses', () => {
    const route404 = {
      status: 404,
      statusText: 'Not Found',
      internal: true,
      data: 'Not Found',
    };
    const info404 = resolveErrorInfo(route404, 'en');
    expect(info404.status).toBe(404);
    expect(info404.message).toBe('404');
    expect(info404.details).toContain('could not be found');

    const route502 = {
      status: 502,
      statusText: 'Bad Gateway',
      internal: true,
      data: 'Error',
    };
    const info502 = resolveErrorInfo(route502, 'en');
    expect(info502.status).toBe(502);
    expect(info502.details).toBe('Bad Gateway');

    const routeEmpty = {
      status: 500,
      statusText: '',
      internal: true,
      data: 'Error',
    };
    const infoEmpty = resolveErrorInfo(routeEmpty, 'en');
    expect(infoEmpty.details).toContain('unexpected error');
  });

  it('resolves Error instances and unknown values across locales', () => {
    const err = new Error('Database timeout');
    const errInfo = resolveErrorInfo(err);
    expect(errInfo.status).toBe(500);
    expect(errInfo.details).toBe('Database timeout');
    expect(errInfo.stack).toBeDefined();

    const unknownFr = resolveErrorInfo('raw failure', 'fr');
    expect(unknownFr.message).toBe('Erreur');
  });

  it('renders ErrorBoundaryView and StrategicSectionBoundary with diagnostic attributes', () => {
    const withStackHtml = renderToStaticMarkup(
      <ErrorBoundaryView
        error={new Error('Stack trace check')}
        boundary="route:home"
      />
    );
    expect(withStackHtml).toContain('role="alert"');
    expect(withStackHtml).toContain('data-error-boundary="route:home"');
    expect(withStackHtml).toContain('[route:home]');

    const noStackHtml = renderToStaticMarkup(
      <ErrorBoundaryView
        error="String failure"
        boundary="section:widget"
        locale="fr"
      />
    );
    expect(noStackHtml).toContain('data-error-boundary="section:widget"');
    expect(noStackHtml).not.toContain('<pre');

    const healthySection = renderToStaticMarkup(
      <StrategicSectionBoundary boundary="section:cards">
        Healthy content
      </StrategicSectionBoundary>
    );
    expect(healthySection).toContain('data-boundary-scope="section:cards"');
    expect(healthySection).toContain('Healthy content');
  });

  it('validates strategic error boundaries across the repository via lint-error-boundaries.mjs', () => {
    const result = validateStrategicErrorBoundaries();
    expect(result.errors).toEqual([]);
    expect(result.routeCount).toBeGreaterThanOrEqual(1);

    expect(
      hasExportedFunction(
        'export function ErrorBoundary() {}',
        'test.tsx',
        'ErrorBoundary'
      )
    ).toBe(true);
    expect(
      hasExportedFunction(
        'export const ErrorBoundary = () => null;',
        'test.tsx',
        'ErrorBoundary'
      )
    ).toBe(true);
    expect(
      hasTryCatchInFunction(
        'export function handleFetch() { try { return 1; } catch { return 2; } }',
        'worker.ts',
        'handleFetch'
      )
    ).toBe(true);
  });
});
