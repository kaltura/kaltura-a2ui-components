// Used by "npm run example:react" and by scripts/check-examples.mjs, so the
// alias cannot drift. Run "npm run build" first: it needs dist/.
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const here = fileURLToPath(new URL('.', import.meta.url));
const repo = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  root: here,
  plugins: [react()],
  // In your own app this is a plain import from the installed package.
  resolve: { alias: { '@kaltura/a2ui-react': `${repo}dist/kaltura-react.mjs` } },
  // dist/ sits outside the example folder.
  server: { fs: { allow: [repo] } },
});
