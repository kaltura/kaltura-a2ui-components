import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cssInjectedByJs from 'vite-plugin-css-injected-by-js';

// Two library targets, selected by BUILD_TARGET (the `build` script runs both):
//
//   react        → dist/kaltura-react.mjs  (ESM, React external/peer)
//                  Consumed by catalog-registering A2UI clients (chat-UI,
//                  partner apps). React is provided by the host, so it stays
//                  external; consumers dedupe on their own React.
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
// ships styles too — no separate stylesheet import to forget.

const target = process.env.BUILD_TARGET ?? 'react';

const isReact = target === 'react';

export default defineConfig({
  plugins: [
    react(),
    // Fold CSS into the JS for BOTH targets so consumers get styles from a
    // single import / <script> — no orphaned sibling stylesheet to wire up.
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
          // Host provides React; keep it external so consumers dedupe.
          external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
              'react/jsx-runtime': 'jsxRuntime',
              'react-dom/client': 'ReactDOMClient',
            },
          },
        }
      : {
          // Self-contained bundle — React and all deps inlined. IIFE already
          // disables code-splitting, so dynamic imports fold in automatically.
          output: {},
        },
  },
});
