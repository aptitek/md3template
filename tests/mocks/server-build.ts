export const routes = {
  root: {
    id: 'root',
    path: '',
    module: {
      default: () => null,
    },
  },
};

export const assets = {
  entry: { module: '/entry.js', imports: [] },
  routes: {
    root: {
      id: 'root',
      path: '',
      module: '/root.js',
      hasAction: false,
      hasLoader: false,
      hasClientAction: false,
      hasClientLoader: false,
      hasClientMiddleware: false,
      hasErrorBoundary: false,
    },
  },
  url: '/manifest.js',
  version: '1',
};

export const assetsBuildDirectory = 'build/client';
export const future = {};
export const publicPath = '/';
export const entry = {
  module: {
    default: async () => new Response('ok', { status: 200 }),
  },
};
export const isSpaMode = false;
export const prerender: string[] = [];
export const routeDiscovery = {
  mode: 'lazy' as const,
  manifestPath: '/__manifest',
};
export const ssr = true;
