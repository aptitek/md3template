import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function startStaticServer(rootDir: string): Promise<{
  server: Server;
  baseUrl: string;
}> {
  return new Promise((resolvePromise) => {
    const server = createServer((req, res) => {
      const reqUrl = (req.url ?? '/').split('?')[0] ?? '/';
      const safePath = reqUrl === '/' ? '/index.html' : reqUrl;
      const fullPath = join(rootDir, safePath);

      if (existsSync(fullPath) && statSync(fullPath).isFile()) {
        const ext = extname(fullPath);
        res.writeHead(200, {
          'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream',
        });
        res.end(readFileSync(fullPath));
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolvePromise({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

test.describe('Storybook E2E & WCAG 2.2 AA Accessibility Gate', () => {
  test('renders HomeView story with zero axe accessibility violations', async ({
    page,
  }) => {
    const staticDir = resolve(process.cwd(), 'storybook-static');
    const { server, baseUrl } = await startStaticServer(staticDir);

    try {
      await page.goto(
        `${baseUrl}/iframe.html?id=routes-homeview--english&viewMode=story`
      );
      await expect(page.locator('#storybook-root h1')).toContainText(
        'MD3 Template'
      );

      const accessibilityScanResults = await new AxeBuilder({ page })
        .include('#storybook-root')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    } finally {
      server.close();
    }
  });
});
