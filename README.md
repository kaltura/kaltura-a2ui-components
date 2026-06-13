# @kaltura/a2ui-react

Kaltura's [A2UI](https://a2ui.org) Experience Components — Player, Flashcards,
and Media Manager — packaged as a reusable, versioned, CDN-publishable catalog
so any A2UI client that registers a catalog can render them without
re-implementation.

> **Status:** scaffold. Components, adapters, CI release, and docs are built out
> across the work units tracked in
> [kaltura/kaltura-adk-agent#55](https://github.com/kaltura/kaltura-adk-agent/issues/55).

## Why this exists

A2UI clients render only the component implementations they have registered
ahead of time — there is no runtime code-loading in the protocol. So a Kaltura
component (a real Player v7 embed, the Media Manager widget, study Flashcards)
only appears in a client that has the Kaltura catalog built in. This package is
that catalog, distributed two ways:

| Consumer | Artifact | How |
|----------|----------|-----|
| Catalog-registering A2UI clients (chat-UIs, partner apps) | `dist/kaltura-react.mjs` (ESM, React peer) | `import { kalturaReactCatalog } from '@kaltura/a2ui-react'` → `new MessageProcessor([kalturaReactCatalog, basicCatalog])` |
| Plain-HTML hosts | `dist/kaltura-wc.js` (IIFE, self-contained) | `<script src=…>` + `<kaltura-player>` custom elements |

Clients that cannot register a catalog (Gemini Enterprise, generic basic/text)
are handled by the agent's negotiation layer, not this package — see issue #55.

## Layout

```
src/
  schemas/      component API (name + Zod schema), framework-agnostic, no render
  core/         render logic over FULLY-RESOLVED scalar props — no A2UI types
  adapters/
    react/      createComponentImplementation per core; the A2UI path
    webcomponent/ custom elements over core; plain-HTML path
  catalog/
    kaltura_catalog.json  schema authority (byte-identical to the agent backend)
    client-functions.ts   FunctionImplementation[] (copyToClipboard, …)
  styles/       component CSS (ships with the package)
```

`dist/` is built and committed **only on release tags** (see
`.github/workflows/build-and-release.yml`); on `main` it is gitignored.

## Develop

```bash
npm ci
npm run typecheck
npm run test
npm run build      # → dist/kaltura-react.mjs + dist/kaltura-wc.js
```

## License

AGPL-3.0-only.
