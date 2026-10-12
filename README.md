# @kaltura/a2ui-react

Kaltura's [A2UI](https://a2ui.org) Experience Components. All 12 components ship as one versioned catalog, so any A2UI client that registers a catalog can render them without re-implementing them.

Next release: **0.2.0** (see [CHANGELOG.md](CHANGELOG.md)). Not on npm yet. Until the first publish, use a [GitHub release](https://github.com/kaltura/kaltura-a2ui-components/releases).

## Why this exists

An A2UI client renders only the components it has registered ahead of time. The protocol has no runtime code loading. A Kaltura Player or Media Manager therefore appears only in a client that has this catalog built in.

| Consumer | Artifact | How |
|---|---|---|
| A2UI clients that register a catalog (chat UIs, partner apps) | `dist/kaltura-react.mjs` (ESM, peers external) | `import { kalturaReactCatalog } from '@kaltura/a2ui-react'` |
| Plain HTML pages | `dist/kaltura-wc.js` (IIFE, self-contained) | `<script src=…>` and Kaltura custom elements |

Clients that cannot register a catalog (Gemini Enterprise, generic text clients) are handled by the agent's negotiation layer, not by this package.

## Install

### npm (React, A2UI clients)

```bash
npm i @kaltura/a2ui-react @a2ui/react @a2ui/web_core zod react react-dom
```

The package needs these peers: `@a2ui/react ^0.11.1`, `@a2ui/web_core ^0.11.0`, `zod ^3.25.76`, `react ^19` and `react-dom ^19`. Entries: `@kaltura/a2ui-react` (React), `@kaltura/a2ui-react/webcomponent` (script bundle) and `@kaltura/a2ui-react/catalog` (the catalog JSON).

`@a2ui/react` 0.11.1 brings in `dompurify` 3.4.11, which has published advisories. Override it in your `package.json` (pnpm: `pnpm.overrides`, Yarn: `resolutions`). Details: [docs/host-integration.md](docs/host-integration.md#dompurify-override).

```json
{ "overrides": { "dompurify": "^3.4.17" } }
```

### CDN (plain HTML)

```
https://cdn.jsdelivr.net/npm/@kaltura/a2ui-react@0.2.0/dist/kaltura-wc.js
```

This URL works after 0.2.0 is published to npm. Until then it returns 404, and `https://cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@v0.1.4/dist/kaltura-wc.js` serves the old 0.1.4 bundle, without the 0.2.0 fixes or host functions.

Pin the exact version. Each GitHub release has a `hashes.json`. Its `cdn["dist/kaltura-wc.js"]` value is the SRI string (`sha384-…`). Add it as `integrity` with `crossorigin="anonymous"`.

## Components

| Component type | Custom element | Embed technology |
|---|---|---|
| `KalturaPlayer` | `<kaltura-player>` | iframe (Player v7) |
| `KalturaFlashcards` | `<kaltura-flashcards>` | React carousel with Player iframes for clips |
| `KalturaMediaManager` | `<kaltura-media-manager>` | Unisphere ES module |
| `KalturaAnalytics` | `<kaltura-analytics>` | iframe |
| `KalturaCaptionsEditor` | `<kaltura-captions-editor>` | iframe |
| `KalturaRecorder` | `<kaltura-recorder>` | sandboxed iframe (`extwidget/preview`) |
| `KalturaAvatar` | `<kaltura-avatar>` | Kaltura avatar web SDK, loaded as a script |
| `KalturaGenie` | `<kaltura-genie-widget>` | Unisphere ES module |
| `KalturaContentLab` | `<kaltura-content-lab>` | Unisphere ES module |
| `KalturaAgentsWidget` | `<kaltura-agents-widget>` | Unisphere ES module |
| `KalturaVodAvatar` | `<kaltura-vod-avatar-wc>` | Unisphere ES module |
| `KalturaChart` | `<kaltura-chart>` | visx (React) |

## Use it

### A2UI client (React)

<!-- check-examples: expect h4.kaltura-chart-title; text:Cell -->
```tsx
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { A2uiSurface } from '@a2ui/react/v0_9';
import { MessageProcessor } from '@a2ui/web_core/v0_9';
import { KALTURA_CATALOG_ID, kalturaReactCatalog, setKsProvider } from '@kaltura/a2ui-react';

// The host mints the Kaltura Session. Agent messages never carry it.
setKsProvider(() => undefined); // replace with your KS call

// kalturaReactCatalog already includes the basic catalog. Register it alone.
const processor = new MessageProcessor([kalturaReactCatalog]);
processor.processMessages([
  { version: 'v0.9', createSurface: { surfaceId: 's', catalogId: KALTURA_CATALOG_ID } },
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: 's',
      components: [
        { id: 'root', component: 'Column', children: ['chart', 'cards'] },
        { id: 'chart', component: 'KalturaChart', chartType: 'bar', title: 'Visits', data: [{ day: 'Mon', visits: 12 }], xKey: 'day', yKeys: ['visits'] },
        { id: 'cards', component: 'KalturaFlashcards', title: 'Cells', cards: [{ title: 'Cell', content: 'The basic unit of life.' }] },
      ],
    },
  },
] as never);

const surface = processor.model.getSurface('s');
if (surface) createRoot(document.getElementById('root')!).render(createElement(A2uiSurface, { surface }));
```

- `buildKalturaCatalog(id?)` builds the same catalog under another id.
- `loadKalturaCatalog(url)` fetches a catalog descriptor and keys the catalog by its `catalogId`.
- Register the Kaltura catalog alone. It already holds the basic components, with checks on media URLs and markdown images ([docs/host-api.md](docs/host-api.md)).

A full page: [examples/react](examples/react).

### Plain HTML

<!-- check-examples: expect kaltura-chart h4.kaltura-chart-title; kaltura-player iframe -->
```html
<script src="https://cdn.jsdelivr.net/npm/@kaltura/a2ui-react@0.2.0/dist/kaltura-wc.js"></script>

<kaltura-chart id="chart"></kaltura-chart>
<kaltura-player id="player"></kaltura-player>

<script>
  // The script defines all 12 elements and the global KalturaA2UIWebComponents.
  // Set `config` (an object) on each element. Ids are numbers, not strings.
  document.getElementById('chart').config = {
    chartType: 'bar',
    title: 'Visits',
    data: [{ day: 'Mon', visits: 12 }, { day: 'Tue', visits: 31 }],
    xKey: 'day',
    yKeys: ['visits'],
  };
  // Use your own partner, player and entry ids.
  document.getElementById('player').config = { partnerId: 1, uiconfId: 2, entryId: '0_abc' };
</script>
```

The `@0.2.0` URL works after the first 0.2.0 release on npm. Before that, see [CDN](#cdn-plain-html).

A full page with a KS provider and an error handler: [examples/plain-html](examples/plain-html). Both examples run against `dist/` with `npm run check:examples`.

## For the host

| Need | Start here |
|---|---|
| Supply the Kaltura Session (KS) | `setKsProvider`. [docs/host-integration.md](docs/host-integration.md), [docs/ks-privileges.md](docs/ks-privileges.md), [docs/security/ks.md](docs/security/ks.md) |
| Private cloud or on-prem Unisphere | `setExtraAllowedOrigins`. [docs/host-integration.md](docs/host-integration.md) |
| Region, media URL allowlist, error and event hooks | [docs/host-api.md](docs/host-api.md) |
| Trust model and CSP | [SECURITY.md](SECURITY.md) |
| Upgrade from 0.1.x | [docs/migration-0.2.md](docs/migration-0.2.md) |

## Security behaviour

- **Agent output is untrusted.** The host owns `ks`, the allowed origins and the media URL list. Agent messages cannot change them. See [SECURITY.md](SECURITY.md).
- **KS.** `setKsProvider(widget => ks)` is the way to supply it. The provider gets the widget name, so it can mint a least-privilege KS per widget. Keep the KS out of the A2UI data model.
- **Private clouds.** `setExtraAllowedOrigins(['https://unisphere.example.com'])` before the first load. Only `https:` origins are accepted.
- **`openUrl`.** Only absolute `https:` URLs open. Everything else is blocked with a console warning.
- **Validation.** Web component config goes through the same schema as the A2UI path. Invalid values (bad ids, ks, urls, enums) show a plain-text alert. Numeric-string ids such as `partnerId: "123"` are rejected: pass a number.
- **Missing required props.** In React, a required top-level prop that is still `undefined` renders nothing until it arrives. A web component shows the alert and renders again when `el.config` is set.
- **Rejected `serverUrl`.** It is never shown in the UI. `console.warn` prints at most 100 characters of it, for developers only.
- **Error states.** Chart errors use `ChartErrorBoundary` with `role="alert"`. Plain-text load errors share the `kaltura-load-error` class. `setErrorHandler` reports each one with a stable code.
- **Media Manager selection.** `kaltura-entry-selected` fires on the `<kaltura-media-manager>` element. `detail` is `{ entryId, name, instanceId }`, plus `entries` for multi-select. Compare `instanceId` when a page holds several. `name` is untrusted text: show it as text, never as HTML. For one more release the event also bubbles to `document` (`legacyDocumentEvents`, default `true`). Set it to `false` to stop that. Agents cannot set it.
- **Web component lifecycle.** Each element mounts one React root when it connects and unmounts it when it is removed. Moving an element keeps the widget. Setting `el.config` at any time re-renders.

## Layout

```
src/
  schemas/      component API (name + Zod schema), no rendering
  core/         render logic over fully resolved props, no A2UI types
  adapters/
    react/      one A2UI component implementation per core: the A2UI path
    webcomponent/ custom elements over core: the plain-HTML path
  catalog/
    kaltura_catalog.json  catalog JSON (props generated from the Zod schemas, see below)
    client-functions.ts   client-side functions (copyToClipboard, …)
  styles/       component CSS (injected by the bundles)
examples/       plain-html and react pages that run against dist/
docs/           guides, security notes and decision records (docs/adr)
```

`dist/` is never committed. [`release.yml`](.github/workflows/release.yml) builds it on a `v*` tag and publishes it to npm ([docs/release.md](docs/release.md)).

## Develop

```bash
npm ci
npm run typecheck
npm test
npm run build              # dist/kaltura-react.mjs + dist/kaltura-wc.js
npm run check:examples     # README and examples/ against dist/ (needs a build)
npm run gen:catalog        # catalog JSON up to date with the Zod schemas?
```

More in [CONTRIBUTING.md](CONTRIBUTING.md).

## License

AGPL-3.0-only.
