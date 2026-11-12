// Used by "npm run demo" (dev server) and "npm run demo:build" (static site in dist-demo/).
// It needs dist/, so build first: both scripts do. The alias is the only difference
// from your own app, where '@kaltura/a2ui-react' is a plain import.
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const here = fileURLToPath(new URL('.', import.meta.url));
const repo = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  root: here,
  base: './',
  plugins: [react()],
  resolve: { alias: { '@kaltura/a2ui-react': `${repo}dist/kaltura-react.mjs` } },
  server: { fs: { allow: [repo] } },
  build: { outDir: `${repo}dist-demo`, emptyOutDir: true },
});
