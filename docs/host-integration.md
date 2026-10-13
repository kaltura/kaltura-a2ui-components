# Host integration

What the page or app that embeds the components must set up. Agents never call these functions. Call them once, before any component mounts.

| You need | Call | Details |
|---|---|---|
| A Kaltura Session (KS) | `setKsProvider` | [KS](#kaltura-session-ks) |
| A private cloud or on-prem Unisphere | `setExtraAllowedOrigins` | [Unisphere origins](#unisphere-origins) |
| Another Kaltura region | `setRegion` | [Region](#region) |
| Images, video or audio from your own host | `setExtraMediaOrigins` (React only) | [Media URLs](#media-urls) |
| Logs and selection events | `setErrorHandler`, `setEventHandler` | [Errors and events](#errors-and-events) |
| A `sandbox` on player iframes (opt-in) | `setPlayerSandbox` | [host-api.md](host-api.md#player-sandbox) |
| A CSP | See below | [CSP](#content-security-policy) |

All seven functions come from `@kaltura/a2ui-react`. The script-tag bundle has the same functions, except `setExtraMediaOrigins`, on `window.KalturaA2UIWebComponents`. Signatures and codes: [host-api.md](host-api.md).

## Register the Kaltura catalog alone

```ts
const processor = new MessageProcessor([kalturaReactCatalog]);
```

`kalturaReactCatalog` already holds the basic components. Do not register `basicCatalog` next to it. The agent picks a catalog by id in `createSurface`. Importing the package guards the shared `basicCatalog` in place, so an agent that picks it still gets the [media URL check](#media-urls) and the markdown filter. A catalog you build yourself from the raw basic components, or from a second copy of `@a2ui/web_core`, is not guarded. To keep the basic catalog id for older agents, register `buildKalturaCatalog(basicCatalog.id)` in its place. Since 0.13, `basicCatalog` comes from `@a2ui/web_core/v0_9/basic_catalog`, not `@a2ui/react`.

## Server imports (SSR)

`@a2ui/react` 0.13.0 throws `HTMLElement is not defined` when Node imports it ([a2ui#3158](https://github.com/a2ui-project/a2ui/issues/3158)). The package works around it ([ADR 0007](adr/0007-ssr-html-element-stub.md)). In Node, import `@kaltura/a2ui-react` before anything that imports `@a2ui/react`:

```ts
import { kalturaReactCatalog } from '@kaltura/a2ui-react'; // first
import { A2uiSurface } from '@a2ui/react/v0_9';
```

This makes the import work. It does not make surfaces render on the server: `A2uiSurface` renders in the browser only. Browsers and jsdom need no import order.

If you load `kaltura-react.mjs` from jsDelivr with an import map and `integrity`, pin `dist/html-element-stub.mjs` too. The bundle imports it. The catalog `x-kaltura-adapters.react` gives `stubCdn` and `stubIntegrity` for it, next to `cdn` and `integrity` (releases after 0.3.0). For 0.3.0 and older, take the hash from the Release's `hashes.json`.

## DOMPurify override

`@a2ui/react` 0.13 depends on `@a2ui/markdown-it` 0.2.1, which pins `dompurify` 3.4.11. That version has published advisories, all fixed by 3.4.16. Your install gets it through `@a2ui/react`, with or without this package. Our ESM bundle carries its own patched copy, but your app uses yours, for example in the markdown renderer you pass to `MarkdownContext`. Override it in `package.json`, to the range this repo uses:

```json
{ "overrides": { "dompurify": "^3.4.17" } }
```

pnpm: `"pnpm": { "overrides": { "dompurify": "^3.4.17" } }`. Yarn: `"resolutions": { "dompurify": "^3.4.17" }`. Check with `npm ls dompurify`.

## Kaltura Session (KS)

```ts
import { setKsProvider, type KsWidget } from '@kaltura/a2ui-react';

setKsProvider(async (widget: KsWidget) => {
  const response = await fetch(`/api/kaltura-session?widget=${widget}`, { credentials: 'same-origin' });
  return response.ok ? (await response.json()).ks : undefined;
});
```

- The provider runs in the browser. Your server mints the KS (AppToken flow, USER KS, 1 hour or less).
- It gets the widget name, so each widget can get its own least-privilege KS. Privileges per widget: [ks-privileges.md](ks-privileges.md).
- Per-widget mapping, with the analytics widget as the one ADMIN KS:

```ts
setKsProvider(widget => (widget === 'analytics' ? session.adminKs : session.userKs));
```

- Components never renew a KS. To use a new one, remount the component. The Analytics KS must belong to an admin user that has a role ([security/ks.md](security/ks.md)).
- Keep the KS out of the A2UI data model and out of agent messages. [security/ks.md](security/ks.md) has the full rules.

## Unisphere origins

Unisphere widgets (Media Manager, Genie, Content Lab, Agents, VOD Avatar, Avatar) import code from `serverUrl`. Only the five Kaltura regions load: `https://unisphere.{nvp1,irp2,frp2,cap2,syp2}.ovp.kaltura.com`. A private cloud or on-prem host needs your approval:

```ts
setExtraAllowedOrigins(['https://unisphere.example.com']);
```

Only `https:` origins with no path, query or user name are accepted. The list replaces the previous one. Anything else throws. Only allow hosts you trust to run code in your page: a Unisphere module runs with your page origin.

## Region

```ts
setRegion('irp2'); // nvp1 (default), irp2, frp2, cap2, syp2
```

It changes every Kaltura host the components build: player, flashcard clips and thumbnails, captions editor, Analytics and recorder. Unknown codes throw. `sgp2` (Singapore) is not supported. The host table and sources are in [host-api.md](host-api.md#regions).

## Media URLs

The basic `Image`, `Video` and `AudioPlayer` load a `url` only when it is `https` on `kaltura.com` or a subdomain, or on an origin you add:

```ts
setExtraMediaOrigins(['https://media.example.com']);
```

A URL with `api_v3`, `partnerservices2` or a `ks` parameter or path segment is always refused. This check goes by name: a KS under another name passes on a Kaltura host or an added origin. The real control is that agents never get the KS, so keep it out of the data model and do not add an origin whose URLs carry one. The rules and the `url-rejected` error: [host-api.md](host-api.md#basic-media-urls).

Images in basic `Text` markdown follow the same rules. The Kaltura catalog runs the output of your `MarkdownContext` renderer through the package sanitiser, which also drops link schemes other than `http`, `https` and `mailto` and keeps only plain formatting tags.

This holds when you [register the Kaltura catalog alone](#register-the-kaltura-catalog-alone).

## Errors and events

```ts
import { setErrorHandler, setEventHandler } from '@kaltura/a2ui-react';

setErrorHandler(({ code, widget, message }) => log.warn(code, widget, message));
setEventHandler(event => event.type === 'entry-selected' && pick(event.detail.entryId));
```

`message` never holds a prop value or the KS. `detail.name` of `entry-selected` is untrusted text: show it as text. Codes and shapes: [host-api.md](host-api.md#errors).

## Content Security Policy

A starting policy. Replace `'self'` and the Unisphere regions to fit your page.

<!-- csp -->
```text
default-src 'self';
script-src 'self' https://unisphere.nvp1.ovp.kaltura.com https://unisphere.irp2.ovp.kaltura.com https://unisphere.frp2.ovp.kaltura.com https://unisphere.cap2.ovp.kaltura.com https://unisphere.syp2.ovp.kaltura.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https://*.kaltura.com;
media-src 'self' https://*.kaltura.com;
frame-src https://cdnapisec.kaltura.com https://www.kaltura.com https://kmc.kaltura.com;
connect-src 'self' https://cdn.jsdelivr.net https://*.kaltura.com;
object-src 'none';
base-uri 'none';
```

| Directive | Why |
|---|---|
| `script-src` | Your own script and the Unisphere loaders (only the regions you use). The avatar loads through the Unisphere loader too. If you load the bundle from the CDN, add `https://cdn.jsdelivr.net` and use SRI |
| `style-src ... 'unsafe-inline'` | The bundle injects its CSS in a `<style>` tag and the charts set `style` attributes |
| `img-src`, `media-src` | Flashcard thumbnails, markdown images and the basic media components. Add your `setExtraMediaOrigins` hosts |
| `frame-src` | Player and flashcard clips (`cdnapisec`), captions editor and recorder (`www`), Analytics (`kmc`; its KS goes by `postMessage` to that origin, not in the URL). In a region, the player, clips, captions editor and recorder use its API host (for example `https://api.eu.kaltura.com`) and Analytics uses its KMC host. All hosts are in [Regions](host-api.md#regions). Add the hosts of the widgets you use. A private cloud needs its own hosts |
| `connect-src` | The geo map fetches `world-atlas` from jsDelivr. Unisphere widgets call Kaltura APIs. The avatar also calls `https://api.avatar.<region>.kaltura.ai`, which this policy does not list |
| `object-src`, `base-uri` | Not needed by any component |

What is tested: the Chart, Flashcards, Player and the avatar loader (stubbed) run under this exact policy with no violation, and a script from a host that is not listed is blocked (`e2e/csp.spec.ts`). What is not tested: other Unisphere widgets, the other iframes and a live avatar session. Its API, WebSocket and WebRTC hosts are not verified. Watch the browser console for `Content Security Policy` messages the first time you enable one of them, and add the Kaltura host it names. Private cloud and on-prem Unisphere hosts also need entries in `script-src`, `connect-src` and `frame-src`.

CSP does not replace the host controls above. Agent output stays untrusted: [SECURITY.md](../SECURITY.md).
