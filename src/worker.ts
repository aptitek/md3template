import { createRequestHandler } from 'react-router';

export function ensureSsrDomShim(
  target: Record<string, unknown> = globalThis as Record<string, unknown>
): void {
  if (typeof target.HTMLElement === 'undefined') {
    const BaseElement = class {};
    target.Node = BaseElement;
    target.Element = BaseElement;
    target.HTMLElement = BaseElement;
    target.CSSStyleSheet = class {};
    const registry = new Map<string, unknown>();
    target.customElements = {
      get: (name: string) => registry.get(name),
      define: (name: string, ctor: unknown) => {
        registry.set(name, ctor);
      },
    };
    target.document = {
      createTreeWalker: () => ({}),
    };
  }
}

ensureSsrDomShim();

const requestHandler = createRequestHandler(
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE
);

const DEFAULT_WORKER_ERROR = 'Unhandled worker exception';

export interface WorkerErrorPayload {
  readonly boundary: 'worker';
  readonly message: string;
  readonly path: string;
}

export async function handleFetch(
  request: Request,
  handler: (req: Request) => Promise<Response> = requestHandler
): Promise<Response> {
  try {
    return await handler(request);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : DEFAULT_WORKER_ERROR;
    const path = new URL(request.url).pathname;
    const payload: WorkerErrorPayload = {
      boundary: 'worker',
      message,
      path,
    };

    return new Response(JSON.stringify(payload), {
      status: 500,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'x-error-boundary': 'worker',
      },
    });
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    return handleFetch(request);
  },
} satisfies ExportedHandler<Env>;
