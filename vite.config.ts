import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cssInjectedByJs from 'vite-plugin-css-injected-by-js';

// Two library targets, selected by BUILD_TARGET (the `build` script runs both):
//
//   react        → dist/kaltura-react.mjs  (ESM, React and @a2ui/* external)
//                  Consumed by catalog-registering A2UI clients (chat-UI,
//                  partner apps). React, @a2ui/react, @a2ui/web_core and zod
//                  are peers and stay external, so the host's copy is the only
//                  copy (one context, one zod, one instanceof).
//                  @a2ui/markdown-it stays inlined on purpose: it pins
//                  DOMPurify 3.4.11, which has advisories. Inlined, our own
//                  sanitiser runs on the patched copy (see "overrides" in
//                  package.json). The host's tree gets 3.4.11 through
//                  @a2ui/react either way and needs its own override.
//
//   webcomponent → dist/kaltura-wc.js      (IIFE, React inlined, CSS-in-JS)
//                  Consumed by plain-HTML hosts via <script> + custom elements.
//                  Everything is bundled into one self-contained file, so CSS
//                  is injected by JS and dynamic imports are inlined.
//
// Component CSS lives in src/styles/components.css and is imported by the
// adapter entry so it travels with the package (it lives in the chat-UI's
// App.css upstream; the package must not render unstyled). BOTH builds inject
// the CSS via JS so a single `import '@kaltura/a2ui-react'` (or one <script>)
// ships styles too, with no separate stylesheet import to forget.

const target = process.env.BUILD_TARGET ?? 'react';

const isReact = target === 'react';

// Packages the ESM build leaves for the host to resolve, with any subpath.
const hostProvided = /^(@a2ui\/(react|web_core)|zod)(\/|$)/;

export default defineConfig({
  // Browsers have no `process`. The self-contained bundle must not leave
  // `process.env.NODE_ENV` behind (vite lib mode does not replace it). The
  // ESM build keeps it: the host's bundler replaces it.
  define: isReact ? {} : { 'process.env.NODE_ENV': '"production"' },
  plugins: [
    react(),
    // Fold CSS into the JS for BOTH targets so consumers get styles from a
    // single import / <script>, with no orphaned sibling stylesheet to wire up.
    cssInjectedByJs(),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: isReact, // first target clears dist; second appends
    sourcemap: true,
    lib: isReact
      ? {
          entry: 'src/adapters/react/index.ts',
          formats: ['es'],
          fileName: () => 'kaltura-react.mjs',
        }
      : {
          entry: 'src/adapters/webcomponent/index.ts',
          formats: ['iife'],
          name: 'KalturaA2UIWebComponents',
          fileName: () => 'kaltura-wc.js',
        },
    rollupOptions: isReact
      ? {
          // Host provides these; keep them external so consumers dedupe.
          external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client', hostProvided],
          output: {
            // Shipped maps keep the mappings but not the source text.
            sourcemapExcludeSources: true,
            // a2ui#3158 (ADR 0007): inlined code runs after the external
            // imports, so the stub gets its own file to run before @a2ui/react.
            codeSplitting: { groups: [{ name: 'html-element-stub', test: /html-element-stub\.ts$/ }] },
            chunkFileNames: '[name].mjs',
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
              'react/jsx-runtime': 'jsxRuntime',
              'react-dom/client': 'ReactDOMClient',
            },
          },
        }
      : {
          // Self-contained bundle. React and all deps inlined. IIFE already
          // disables code-splitting, so dynamic imports fold in automatically.
          output: { sourcemapExcludeSources: true },
        },
  },
});
