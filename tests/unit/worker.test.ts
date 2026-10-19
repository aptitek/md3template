import { describe, expect, it } from 'vitest';
import worker, { ensureSsrDomShim, handleFetch } from '../../src/worker.ts';

describe('Cloudflare Worker Entry & Edge Error Boundary', () => {
  it('delegates incoming requests to the request handler', async () => {
    const req = new Request('https://example.com/');
    const customHandler = async (r: Request) =>
      new Response(`Handled: ${r.url}`, { status: 200 });

    const res = await handleFetch(req, customHandler);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Handled: https://example.com/');
  });

  it('catches Error exceptions at the worker boundary with diagnostic payload', async () => {
    const req = new Request('https://example.com/broken');
    const throwingHandler = async () => {
      throw new Error('KV namespace unreachable');
    };

    const res = await handleFetch(req, throwingHandler);
    expect(res.status).toBe(500);
    expect(res.headers.get('x-error-boundary')).toBe('worker');
    const body = (await res.json()) as {
      boundary: string;
      message: string;
      path: string;
    };
    expect(body).toEqual({
      boundary: 'worker',
      message: 'KV namespace unreachable',
      path: '/broken',
    });
  });

  it('catches non-Error thrown values at the worker boundary', async () => {
    const req = new Request('https://example.com/non-error');
    const throwingHandler = async () => {
      throw 'raw string failure';
    };

    const res = await handleFetch(req, throwingHandler);
    expect(res.status).toBe(500);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe('Unhandled worker exception');
  });

  it('executes default worker.fetch handler and shims workerd SSR DOM globals idempotently', async () => {
    const mockTarget: Record<string, unknown> = {};
    ensureSsrDomShim(mockTarget);
    expect(mockTarget.HTMLElement).toBeTypeOf('function');
    const ce = mockTarget.customElements as {
      define: (name: string, ctor: unknown) => void;
      get: (name: string) => unknown;
    };
    const DummyCard = class {};
    ce.define('m3e-card', DummyCard);
    expect(ce.get('m3e-card')).toBe(DummyCard);

    const doc = mockTarget.document as {
      createTreeWalker: () => Record<string, unknown>;
    };
    expect(doc.createTreeWalker()).toEqual({});

    ensureSsrDomShim(mockTarget);
    expect(ce.get('m3e-card')).toBe(DummyCard);

    const req = new Request('https://example.com/');
    const res = await worker.fetch(req);
    expect(res).toBeInstanceOf(Response);
  });
});
