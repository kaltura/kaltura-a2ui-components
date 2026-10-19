# 0007. HTMLElement stub for Node imports (a2ui#3158)

Status: accepted (2026-10-12)

Upstream: [a2ui-project/a2ui#3158](https://github.com/a2ui-project/a2ui/issues/3158) (the bug) and [#3197](https://github.com/a2ui-project/a2ui/pull/3197) (a proposed fix). Code: `src/adapters/react/html-element-stub.ts`, `src/adapters/react/index.ts`, `vite.config.ts`. Tests: `test/conformance/ssr-import.test.ts` (CONF-17). Checks: `scripts/check-bundle.mjs` (rule ESM-SSR-STUB), `scripts/check-consumer.mjs`.

## Context

- `@a2ui/react` 0.13.0 runs `class ReactWcHost extends HTMLElement` when it loads. Node has no `HTMLElement`, so `import '@a2ui/react/v0_9'` throws `ReferenceError: HTMLElement is not defined`. Any server import of `@kaltura/a2ui-react` (SSR, tests, a Node build step) fails with it.
- 0.13 moved the basic catalog to `@a2ui/web_core/v0_9/basic_catalog` as Lit elements. Lit takes `globalThis.HTMLElement` as its base class when it loads, and uses its own server shim (`@lit-labs/ssr-dom-shim`) only when there is none.
- ESM runs every static import, external ones too, before the importing module's body. Rolldown puts inlined code after the external imports. A stub inlined into `kaltura-react.mjs` would run after `@a2ui/react` and do nothing.
- Top-level `await` with a dynamic import would also fix the order, but older bundler targets (Vite 6 and earlier by default, older webpack) reject it.
- `A2uiSurface` does not server-render in 0.11 or 0.13 (`useSyncExternalStore` with no server snapshot). The goal is that the import works, not server rendering.

## Decision

Ship a one-file stub that the ESM imports first, and remove the stub as soon as the imports are done.

```
kaltura-react.mjs
  1. import "./html-element-stub.mjs"
       a. import "@a2ui/web_core/v0_9/basic_catalog"   Lit loads with its own shim
       b. if globalThis.HTMLElement is undefined, define the stub
  2. import "@a2ui/react/v0_9", "@a2ui/web_core/v0_9", ...   ReactWcHost extends the stub
  3. module body: removeHtmlElementStub()                  HTMLElement is undefined again
```

- The stub acts only when `globalThis.HTMLElement` is undefined. Browsers and jsdom keep their own class.
- Its constructor throws a `TypeError`, so it cannot create elements, directly or through a subclass.
- It never touches `window`, `document` or `customElements`.
- Vite emits it as its own file through `output.codeSplitting.groups`. `check-bundle` fails if `kaltura-react.mjs` does not import it first, or if it imports anything but the basic catalog.
- `kaltura-wc.js` is unchanged. It runs only in browsers.

## Consequences

- `import '@kaltura/a2ui-react'` works in Node. `check-consumer` proves it on a clean install of the built package, and runs a control that imports bare `@a2ui/react` and must fail.
- **Hosts must import `@kaltura/a2ui-react` before `@a2ui/react` in Node.** A module that imports `@a2ui/react` first still throws. That is the upstream bug, not ours.
- While the package loads, `globalThis.HTMLElement` is the stub. Code that runs in that window and checks `typeof HTMLElement` sees a function. Only the package's own imports and their dependencies load in that window, and Lit loads before the stub.
- Lit sets its own server globals (`customElements` and others) in Node. That comes from `@a2ui/web_core`, with or without this stub.
- The package ships one more file. It is in `sideEffects`, `size-limit`, `hashes.json`, the release attestation and `verify-cdn`. An import map with `integrity` needs an entry for both files.

## Remove it

CONF-17 fails when the installed `@a2ui/react` imports in Node on its own, and `check-consumer` prints a NOTE. Then:

1. Raise the `@a2ui/react` peer to the fixed version.
2. Delete `src/adapters/react/html-element-stub.ts` and its two lines in `src/adapters/react/index.ts`.
3. Delete the `codeSplitting` and `chunkFileNames` lines in `vite.config.ts`.
4. Remove `dist/html-element-stub.mjs` from `package.json` `sideEffects`, `.size-limit.json`, `CDN_FILES` in `scripts/release-hashes.mjs` and the release attestation in `.github/workflows/release.yml`, and update `test/release/`.
5. Delete the ESM-SSR-STUB rule in `scripts/check-bundle.mjs`, the control run in `scripts/check-consumer.mjs` and `test/conformance/ssr-import.test.ts`. Keep the `check-consumer` check that the ESM imports in Node.
6. Mark this ADR superseded.
