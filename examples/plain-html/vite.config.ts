// Used by "npm run example:html". It serves the repo root, so the page can load
// ../../dist/kaltura-wc.js. Run "npm run build" first: it needs dist/.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const repo = fileURLToPath(new URL('../..', import.meta.url));
const dist = join(repo, 'dist') + sep;

export default defineConfig({
  root: repo,
  plugins: [
    {
      name: 'serve-dist-as-is',
      // The dev server would rewrite dist/kaltura-wc.js as a module. It is a plain script.
      configureServer: (server) => {
        server.middlewares.use('/dist', (req, res, next) => {
          const file = normalize(join(dist, decodeURIComponent((req.url ?? '/').split('?')[0])));
          if (!file.startsWith(dist) || !existsSync(file) || !statSync(file).isFile()) return next();
          res.setHeader('content-type', file.endsWith('.map') ? 'application/json' : 'text/javascript');
          createReadStream(file).pipe(res);
        });
      },
    },
  ],
});
