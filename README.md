# @kaltura/a2ui-react

Kaltura's [A2UI](https://a2ui.org) Experience Components — all 12 Kaltura
components packaged as a reusable, versioned, CDN-publishable catalog so any
A2UI client that registers a catalog can render them without re-implementation.

## Why this exists

A2UI clients render only the component implementations they have registered
ahead of time — there is no runtime code-loading in the protocol. So a Kaltura
component (a real Player v7 embed, the Media Manager widget, study Flashcards,
Analytics dashboards, and more) only appears in a client that has the Kaltura
catalog built in. This package is that catalog, distributed two ways:

| Consumer | Artifact | How |
|----------|----------|-----|
| Catalog-registering A2UI clients (chat-UIs, partner apps) | `dist/kaltura-react.mjs` (ESM, React peer) | `import { kalturaReactCatalog } from '@kaltura/a2ui-react'` → `new MessageProcessor([kalturaReactCatalog, basicCatalog])` |
| Plain-HTML hosts | `dist/kaltura-wc.js` (IIFE, self-contained) | `<script src=…>` + Kaltura custom elements |

Clients that cannot register a catalog (Gemini Enterprise, generic basic/text)
are handled by the agent's negotiation layer, not this package.

## Components

All 12 Kaltura Experience Components are included:

| Component type | Custom element | Embed technology |
|---|---|---|
| `KalturaPlayer` | `<kaltura-player>` | iframe (Player v7) |
| `KalturaFlashcards` | `<kaltura-flashcards>` | Native React carousel |
| `KalturaMediaManager` | `<kaltura-media-manager>` | Unisphere ES module |
| `KalturaAnalytics` | `<kaltura-analytics>` | iframe |
| `KalturaCaptionsEditor` | `<kaltura-captions-editor>` | iframe |
| `KalturaRecorder` | `<kaltura-recorder>` | JS script |
| `KalturaAvatar` | `<kaltura-avatar>` | JS script |
| `KalturaGenie` | `<kaltura-genie-widget>` | Unisphere ES module |
| `KalturaContentLab` | `<kaltura-content-lab>` | Unisphere ES module |
| `KalturaAgentsWidget` | `<kaltura-agents-widget>` | Unisphere ES module |
| `KalturaVodAvatar` | `<kaltura-vod-avatar-wc>` | Unisphere ES module |
| `KalturaChart` | `<kaltura-chart>` | visx (React) |

## Use it

### Catalog-registering React client

```ts
import { kalturaReactCatalog } from '@kaltura/a2ui-react';
import { basicCatalog } from '@a2ui/react/v0_9';
import { MessageProcessor } from '@a2ui/web_core/v0_9';

// kalturaReactCatalog already merges the basic catalog's components +
// functions, so registering it alone is enough; pass basicCatalog too only
// if your host expects a separate basic entry.
const processor = new MessageProcessor([kalturaReactCatalog]);
```

`buildKalturaCatalog(id?)` builds the same catalog under a custom id, and
`loadKalturaCatalog(url)` fetches a catalog descriptor and builds keyed to its
id. React is an external peer — the host provides it.

### Plain-HTML host

```html
<script src="https://cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@v0.1.3/dist/kaltura-wc.js"
        integrity="<SRI from catalog x-kaltura-adapters block>"
        crossorigin="anonymous"></script>
<kaltura-player id="p"></kaltura-player>
<script>
  document.getElementById('p').config = { partnerId: 123, uiconfId: 456, entryId: '1_abc' };
</script>
```

The IIFE registers all 12 Kaltura custom elements on load. Use the SRI
`integrity` hash published in the catalog's `x-kaltura-adapters.webcomponent`
block — it is the machine-readable source for the exact CDN URL and SRI per
release.

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
