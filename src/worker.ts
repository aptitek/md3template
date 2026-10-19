import { createRequestHandler } from 'react-router';

const requestHandler = createRequestHandler(
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE
);

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
      error instanceof Error ? error.message : 'Unhandled worker exception';
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
