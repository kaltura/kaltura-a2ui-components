# @kaltura/a2ui-react

Kaltura's [A2UI](https://a2ui.org) Experience Components. All 12 components ship as one versioned catalog, so any A2UI client that registers a catalog can render them without re-implementing them.

Version **0.3.0** (see [Releases](https://github.com/kaltura/kaltura-a2ui-components/releases)). Served by jsDelivr from the git tag. There is no npm package: a package on npm with this name is not ours.

## Quick start

Pick one. All three pin the tag `v0.3.0`.

**1. Script tag (plain HTML).** Defines all 12 custom elements.

<!-- check-examples: expect kaltura-chart h4.kaltura-chart-title -->
```html
<script src="https://cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@v0.3.0/dist/kaltura-wc.js" crossorigin="anonymous"></script>

<kaltura-chart id="chart"></kaltura-chart>

<script>
  document.getElementById('chart').config = { chartType: 'bar', title: 'Visits', data: [{ day: 'Mon', visits: 12 }], xKey: 'day', yKeys: ['visits'] };
</script>
```

For production, copy the same tag with its `integrity` value from the [v0.3.0 Release notes](https://github.com/kaltura/kaltura-a2ui-components/releases/tag/v0.3.0).

**2. ESM (React, A2UI clients).** Install from the git tag with the peers, then register the catalog as in [A2UI client (React)](#a2ui-client-react).

```bash
npm i github:kaltura/kaltura-a2ui-components#v0.3.0 @a2ui/react @a2ui/web_core zod react react-dom
```

**3. Catalog JSON.** For A2UI tooling that reads a catalog by URL:

```
https://cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@v0.3.0/src/catalog/kaltura_catalog.json
```

Check a release before you use it: [docs/verify-release.md](docs/verify-release.md).

## Why this exists

An A2UI client renders only the components it has registered ahead of time. The protocol has no runtime code loading. A Kaltura Player or Media Manager therefore appears only in a client that has this catalog built in.

| Consumer | Artifact | How |
|---|---|---|
| A2UI clients that register a catalog (chat UIs, partner apps) | `dist/kaltura-react.mjs` (ESM, peers external) | `import { kalturaReactCatalog } from '@kaltura/a2ui-react'` |
| Plain HTML pages | `dist/kaltura-wc.js` (IIFE, self-contained) | `<script src=…>` and Kaltura custom elements |

Clients that cannot register a catalog (Gemini Enterprise, generic text clients) are handled by the agent's negotiation layer, not by this package.

## Install

### Git tag (React, A2UI clients)

```bash
npm i github:kaltura/kaltura-a2ui-components#v0.3.0 @a2ui/react @a2ui/web_core zod react react-dom
```

npm installs it as `@kaltura/a2ui-react`, so imports use that name. Your `package.json` gets `"@kaltura/a2ui-react": "github:kaltura/kaltura-a2ui-components#v0.3.0"`. The tag holds the built `dist/`, so nothing builds on install.

The package needs these peers: `@a2ui/react ^0.13.0`, `@a2ui/web_core ^0.13.0`, `zod ^3.25.76`, `react ^19` and `react-dom ^19`. Entries: `@kaltura/a2ui-react` (React), `@kaltura/a2ui-react/webcomponent` (script bundle) and `@kaltura/a2ui-react/catalog` (the catalog JSON). In Node (SSR, tests), import `@kaltura/a2ui-react` before `@a2ui/react`: see [docs/host-integration.md](docs/host-integration.md#server-imports-ssr).

`@a2ui/react` 0.13 brings in `dompurify` 3.4.11 through `@a2ui/markdown-it`, which has published advisories. Override it in your `package.json` (pnpm: `pnpm.overrides`, Yarn: `resolutions`). Details: [docs/host-integration.md](docs/host-integration.md#dompurify-override).

```json
{ "overrides": { "dompurify": "^3.4.17" } }
```

### CDN (plain HTML)

```
https://cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@v0.3.0/dist/kaltura-wc.js
https://cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@v0.3.0/dist/kaltura-react.mjs
```

Pin the full tag. jsDelivr also resolves `@0.2` and `@latest`, but those change under you and break SRI. Each GitHub Release lists the SRI string (`sha384-…`) of every file in its notes and in `hashes.json`. Add it as `integrity` with `crossorigin="anonymous"`.

Tags up to `v0.1.4` serve the old bundles, without the 0.2.0 fixes or host functions.

## Components

| Component type | Custom element | Embed technology |
|---|---|---|
| `KalturaPlayer` | `<kaltura-player>` | Kaltura Player script (`embedPlaykitJs`), in your page |
| `KalturaFlashcards` | `<kaltura-flashcards>` | React carousel, clips use the Kaltura Player script |
| `KalturaMediaManager` | `<kaltura-media-manager>` | Unisphere ES module |
| `KalturaAnalytics` | `<kaltura-analytics>` | iframe, `postMessage` handshake |
| `KalturaCaptionsEditor` | `<kaltura-captions-editor>` | Same-origin blob iframe, KS in `data-*` attributes |
| `KalturaRecorder` | `<kaltura-recorder>` | Express Recorder script (`apps/expressrecorder`) |
| `KalturaAvatar` | `<kaltura-avatar>` | Unisphere embeds API (`genieAvatar`) |
| `KalturaGenie` | `<kaltura-genie-widget>` | Unisphere ES module |
| `KalturaContentLab` | `<kaltura-content-lab>` | Unisphere ES module |
| `KalturaAgentsWidget` | `<kaltura-agents-widget>` | Unisphere ES module |
| `KalturaVodAvatar` | `<kaltura-vod-avatar-wc>` | Unisphere ES module |
| `KalturaChart` | `<kaltura-chart>` | visx (React) |

## Use it

### A2UI client (React)

<!-- check-examples: expect h4.kaltura-chart-title; text:Cell -->
```tsx
import { KALTURA_CATALOG_ID, kalturaReactCatalog, setKsProvider } from '@kaltura/a2ui-react'; // before @a2ui/react
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { A2uiSurface } from '@a2ui/react/v0_9';
import { MessageProcessor } from '@a2ui/web_core/v0_9';

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
- Send `processor.getRendererCapabilities({ versions: ['v0.9'] })` to your agent as `a2uiClientCapabilities`, so it picks a catalog you registered ([docs/host-api.md](docs/host-api.md#capability-negotiation)).
- Register the Kaltura catalog alone. It already holds the basic components, with checks on media URLs and markdown images ([docs/host-api.md](docs/host-api.md)).

A full page: [examples/react](examples/react).

### Plain HTML

<!-- check-examples: expect kaltura-chart h4.kaltura-chart-title; kaltura-player [role="region"] -->
```html
<script src="https://cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@v0.3.0/dist/kaltura-wc.js" crossorigin="anonymous"></script>

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

Add the `integrity` value from the Release, see [CDN](#cdn-plain-html).

A full page with a KS provider and an error handler: [examples/plain-html](examples/plain-html). Both examples run against `dist/` with `npm run check:examples`.

## For the host

| Need | Start here |
|---|---|
| Supply the Kaltura Session (KS) | `setKsProvider`. [docs/host-integration.md](docs/host-integration.md), [docs/ks-privileges.md](docs/ks-privileges.md), [docs/security/ks.md](docs/security/ks.md) |
| Private cloud or on-prem Unisphere | `setExtraAllowedOrigins`. [docs/host-integration.md](docs/host-integration.md) |
| Region, allowed partner and uiconf ids, media URL allowlist, error and event hooks | [docs/host-api.md](docs/host-api.md) |
| Tell the agent which catalogs you render | [docs/host-api.md](docs/host-api.md#capability-negotiation) |
| Trust model and CSP | [SECURITY.md](SECURITY.md), [docs/host-integration.md](docs/host-integration.md#content-security-policy) |
| Upgrade from 0.1.x | [docs/migration-0.2.md](docs/migration-0.2.md) |
| Upgrade from 0.2.x (avatar props) | [docs/migration-0.3.md](docs/migration-0.3.md) |
| Upgrade from 0.3.x (analytics, recorder, player, captions editor) | [docs/migration-0.4.md](docs/migration-0.4.md) |

## Security behaviour

- **Agent output is untrusted.** The host owns `ks`, the allowed origins and the media URL list. Agent messages cannot change them. See [SECURITY.md](SECURITY.md).
- **KS.** `setKsProvider(widget => ks)` is the way to supply it. The provider gets the widget name, so it can mint a least-privilege KS per widget. Keep the KS out of the A2UI data model. The KS is in no script or iframe URL (the Captions editor's own player does request a media URL with it, so redact CSP reports). The Player, Recorder and Captions editor run Kaltura code in your page origin, which can read it ([ADR 0008](docs/adr/0008-in-page-player-and-captions-editor.md)).
- **Partner and uiconf ids.** The agent picks them, and a uiconf decides which player or recorder code runs in your page with your KS. Call `setAllowedPartners([...])` and `setAllowedUiconfs([...])` with your own ids (a list, a RegExp or `'*'`). Default: open. A refused id loads nothing and reports `origin-not-allowed`.
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

`dist/` is never committed to `main`. [`release.yml`](.github/workflows/release.yml) builds it and commits it only in the release commit that the `v*` tag points to ([docs/release.md](docs/release.md)).

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
