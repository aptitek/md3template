import { createRequestHandler } from 'react-router';

export function ensureSsrDomShim(target: object = globalThis): void {
  if (typeof Reflect.get(target, 'HTMLElement') !== 'undefined') {
    return;
  }
  const BaseElement = class {};
  Reflect.set(target, 'Node', BaseElement);
  Reflect.set(target, 'Element', BaseElement);
  Reflect.set(target, 'HTMLElement', BaseElement);
  Reflect.set(target, 'CSSStyleSheet', class {});
  const registry = new Map<string, unknown>();
  Reflect.set(target, 'customElements', {
    get: (name: string) => registry.get(name),
    define: (name: string, ctor: unknown) => {
      registry.set(name, ctor);
    },
  });
  Reflect.set(target, 'document', {
    createTreeWalker: () => ({}),
  });
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

function toWorkerErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : DEFAULT_WORKER_ERROR;
}

export async function handleFetch(
  request: Request,
  handler: (req: Request) => Promise<Response> = requestHandler
): Promise<Response> {
  try {
    return await handler(request);
  } catch (error: unknown) {
    const payload: WorkerErrorPayload = {
      boundary: 'worker',
      message: toWorkerErrorMessage(error),
      path: new URL(request.url).pathname,
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
