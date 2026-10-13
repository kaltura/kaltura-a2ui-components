# Host integration

What the page or app that embeds the components must set up. Agents never call these functions. Call them once, before any component mounts.

| You need | Call | Details |
|---|---|---|
| A Kaltura Session (KS) | `setKsProvider` | [KS](#kaltura-session-ks) |
| A private cloud or on-prem Unisphere | `setExtraAllowedOrigins` | [Unisphere origins](#unisphere-origins) |
| Another Kaltura region | `setRegion` | [Region](#region) |
| Images, video or audio from your own host | `setExtraMediaOrigins` (React only) | [Media URLs](#media-urls) |
| Logs and selection events | `setErrorHandler`, `setEventHandler` | [Errors and events](#errors-and-events) |
| A CSP | See below | [CSP](#content-security-policy) |

All six functions come from `@kaltura/a2ui-react`. The script-tag bundle has the same functions, except `setExtraMediaOrigins`, on `window.KalturaA2UIWebComponents`. Signatures and codes: [host-api.md](host-api.md).

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

### Unisphere widget props

The Unisphere runtimes reject settings they do not declare and skip themselves without an error, so each widget sends only what its runtime takes.

| Widget | Needs | Notes |
|---|---|---|
| Genie | `uiconfId` | Player uiConf for answers with video |
| Content Lab | `uiconfId`, `entryId` | Opens the drawer on that entry. The menu lists the features the account has in Reach. It also loads the `ai-consent` runtime. An account without AI consent sees the consent dialog when it picks an AI feature. Only an account admin can accept it: other users see "contact your account admin" |
| Agents | none | `agentId` is accepted but ignored. Opens its drawer on load. The agents backend answers only origins Kaltura allows: a localhost page gets a CORS error |
| VOD Avatar | none | `entryId` and `avatarStyle` are accepted but the studio runtime has no setting for them |

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

A starting policy for the US region (`nvp1`). Replace `'self'` and the Unisphere regions to fit your page. For another region, use the [region table](#regions-in-the-policy). Roll it out in report-only mode first: see [Rollout](#rollout).

<!-- csp -->
```text
default-src 'self';
script-src 'self' https://www.kaltura.com/apps/ https://cdnapisec.kaltura.com/p/ https://unisphere.nvp1.ovp.kaltura.com/v1/ https://unisphere.irp2.ovp.kaltura.com/v1/ https://unisphere.frp2.ovp.kaltura.com/v1/ https://unisphere.cap2.ovp.kaltura.com/v1/ https://unisphere.syp2.ovp.kaltura.com/v1/;
worker-src blob:;
style-src 'self' 'unsafe-inline' https://www.kaltura.com;
font-src https://www.kaltura.com;
img-src 'self' data: https://*.kaltura.com;
media-src 'self' blob: data: https://*.kaltura.com;
frame-src blob: https://kmc.kaltura.com;
connect-src 'self' https://cdn.jsdelivr.net https://*.kaltura.com https://api.avatar.us.kaltura.ai;
object-src 'none';
base-uri https://www.kaltura.com;
form-action 'none';
```

| Directive | Why |
|---|---|
| `script-src` | Your own script, the Kaltura scripts and the Unisphere loaders (only the regions you use). Sources have a path, so the JSONP endpoint of `api_v3` on the same host stays blocked. `/apps/` is the recorder script and the captions editor page. `/p/` is the Player script (`embedPlaykitJs`, also used by the Flashcards clips and by the recorder and the editor). `/v1/` is Unisphere, and the avatar loads through it. If you load the bundle from the CDN, add `https://cdn.jsdelivr.net` and use SRI |
| `worker-src` | `blob:` for the timer worker of the Player analytics (KAVA). Without it the view analytics are lost with no visible error. Do not add `blob:` to `script-src` |
| `style-src` | `'unsafe-inline'` for the one `<style>` element the bundle injects, which has no nonce. All other styling of our components goes through the CSSOM, which CSP allows. The recorder and the captions editor need `'unsafe-inline'` too. The Kaltura host: the captions editor page loads its stylesheets from it. A stricter variant: [Style tiers](#style-tiers) |
| `font-src` | The captions editor page loads its fonts from the `serviceUrl` host |
| `img-src`, `media-src` | Flashcard thumbnails, markdown images and the basic media components. Add your `setExtraMediaOrigins` hosts. `blob:` in `media-src` is for the recorder preview. `data:` in `media-src` is for the autoplay probe of the Player: without it autoplay is blocked and the player stays at 0 (a click still plays) |
| `frame-src` | `blob:` for the captions editor, whose page is fetched and loaded from a blob URL. Analytics (`kmc`; its KS goes by `postMessage` to that origin, not in the URL). The Player, the clips and the recorder have no iframe. A private cloud needs its own hosts |
| `connect-src` | The geo map fetches `world-atlas` from jsDelivr. The captions editor fetches its page (`embed.php`) from the `serviceUrl` host. Unisphere widgets, the Player script and the recorder (uploads) call Kaltura APIs. The avatar calls `https://api.avatar.us.kaltura.ai` (US only, see the table below) |
| `base-uri` | The `serviceUrl` host. The captions editor page has a `<base>` tag with that host, and a blob frame inherits this policy. With `'none'` the editor stays blank (checked on the real page) |
| `object-src` | Not needed by any component |
| `form-action` | No component submits a form, so `'none'` is safe. Not tested inside the captions editor frame |

`frame-ancestors` works only as an HTTP header, not in a `<meta>` tag. Set it on your server if you need it. For the strictest start, use `default-src 'none'` and add only what your widgets need.

### What each widget needs

Add only the rows for the widgets you use. Tested on `nvp1` in Chromium with the real Kaltura hosts. US hosts are shown: for a region, use the [region table](#regions-in-the-policy).

| Widget | Directives it needs |
|---|---|
| Charts, GeoMap | A `<style>` source (the bundle hash or `'unsafe-inline'`). GeoMap also needs `connect-src https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/` |
| Flashcards (markdown) | As Charts, plus `img-src https://www.kaltura.com https://cfvod.kaltura.com data:`. Strict variant: `style-src-attr 'unsafe-hashes'` and 3 `text-align` hashes ([Style tiers](#style-tiers)) |
| Player, Flashcards clips | `script-src https://cdnapisec.kaltura.com/p/`, `media-src https://cdnapisec.kaltura.com https://cfvod.kaltura.com blob: data:`, `worker-src blob:`, `connect-src https://cdnapisec.kaltura.com https://analytics.kaltura.com https://cfvod.kaltura.com`, `style-src-elem 'unsafe-inline'`. A nonce through `kalturaGlobalConfig.stylesNonce` worked in a test, but Kaltura has not confirmed support |
| Captions editor | What the Player needs, plus `frame-src blob:`, `script-src https://www.kaltura.com/apps/`, `connect-src https://www.kaltura.com`, `base-uri https://www.kaltura.com`, `font-src https://www.kaltura.com` and `style-src-elem 'unsafe-inline'` (required). Do not use `'strict-dynamic'`: it blocks the `main.js` that the editor page inserts |
| Recorder | What the Player needs, plus `script-src https://www.kaltura.com/apps/` and `style-src-elem 'unsafe-inline'` (required). Your `Permissions-Policy` must allow `camera`, `microphone` and `display-capture`. The upload goes to `www.kaltura.com` and `cdnapisec.kaltura.com`, covered by `connect-src https://*.kaltura.com` |
| Analytics | `frame-src https://kmc.kaltura.com` only |
| Unisphere widgets | `script-src` and `connect-src https://unisphere.<region>.ovp.kaltura.com/v1/`. Genie, Agents, VOD Avatar and Content Lab ask for fonts from `https://fonts.kaltura.com`. The Media Manager and VOD Avatar also ask for stylesheets from `https://fonts.googleapis.com`. The starting policy blocks these (CSP reports in Chromium, Firefox and WebKit) and every widget works with fallback fonts. To allow them, add `https://fonts.kaltura.com` and `https://fonts.googleapis.com` to `style-src` and `font-src`, and `https://fonts.gstatic.com` to `font-src` |
| Avatar | What Unisphere needs, plus `connect-src https://api.avatar.us.kaltura.ai`. Only the `us` host was seen. The regional hosts, and the WebSocket and WebRTC hosts, are not verified |

### Style tiers

`'unsafe-inline'` in `style-src` needs approval from your security team (see [Rollout](#rollout)). A hash lets Charts and Flashcards run without it:

| Tier | Policy | Works for |
|---|---|---|
| 1. Starting policy | `style-src 'self' 'unsafe-inline' https://www.kaltura.com` | All widgets |
| 2. Hash | `style-src-elem 'sha256-<hash of the bundle <style>>' https://www.kaltura.com; style-src-attr 'none'` | Charts, GeoMap. No violation in the test run |
| 3. Hash and markdown | Tier 2 with `style-src-attr 'unsafe-hashes' 'sha256-…'`, one hash for each of the 3 `text-align` styles that markdown tables use | Flashcards |
| Always inline | `style-src-elem 'unsafe-inline'` | Recorder and captions editor (required). Player (a nonce may work, see above) |

The hash changes when our CSS changes. Read it from the console message in report-only mode, and check it again on each upgrade. The bundle does not set a nonce on its `<style>` element yet.

### Regions in the policy

These hosts come from `src/core/region.ts` (`e2e/csp.spec.ts` checks the table against it). Details and sources: [host-api.md](host-api.md#regions).

| Region | `serviceUrl` | `cdn` (Player script) | `recorder` | `vod` | `kmc` |
|---|---|---|---|---|---|
| nvp1 | `https://www.kaltura.com` | `https://cdnapisec.kaltura.com` | `https://www.kaltura.com` | `https://cfvod.kaltura.com` | `https://kmc.kaltura.com` |
| irp2 | `https://api.eu.kaltura.com` | `https://api.eu.kaltura.com` | `https://api.eu.kaltura.com` | `https://cfvod.irp2.ovp.kaltura.com` | `https://kmc.irp2.ovp.kaltura.com` |
| frp2 | `https://api.de.kaltura.com` | `https://api.de.kaltura.com` | `https://api.de.kaltura.com` | `https://cfvod.frp2.ovp.kaltura.com` | `https://kmc.de.kaltura.com` |
| cap2 | `https://api.ca.kaltura.com` | `https://api.cap2.ovp.kaltura.com` | `https://api.cap2.ovp.kaltura.com` | `https://cfvod.cap2.ovp.kaltura.com` | `https://kmc.ca.kaltura.com` |
| syp2 | `https://api.ap.kaltura.com` | `https://api.syp2.ovp.kaltura.com` | `https://api.syp2.ovp.kaltura.com` | `https://cfvod.syp2.ovp.kaltura.com` | `https://kmc.ap.kaltura.com` |

In a region, replace the hosts of the starting policy like this:

| Directive | Source |
|---|---|
| `script-src` | `<cdn>/p/` (Player), `<recorder>/apps/` (recorder), `<serviceUrl>/apps/` (captions editor) |
| `style-src`, `font-src`, `base-uri`, `connect-src` for `embed.php` | `<serviceUrl>` |
| `frame-src` | `<kmc>` |
| `img-src`, `media-src`, `connect-src` | `https://*.kaltura.com` already covers `<vod>`, `<cdn>` and `<serviceUrl>` |

For `cap2` and `syp2`, `serviceUrl` and `cdn` are different hosts. Add both. The Unisphere `script-src` entries use the region code (`https://unisphere.<region>.ovp.kaltura.com/v1/`).

### Rollout

Do not enforce a new policy first. Use this order:

1. Send the starting policy as `Content-Security-Policy-Report-Only`, with a reporting endpoint.
2. Use every widget you ship: play a video, open the editor, record, open Analytics.
3. For each reported host, find it in the [widget table](#what-each-widget-needs). Add it only if a widget you use lists it. Do not add a host just because the browser reported it. If a host is not in the table, find out why before you allow it.
4. `'unsafe-inline'` and `'unsafe-eval'` need approval from your security team. No component needs `'unsafe-eval'`. `'unsafe-inline'` is for styles only, and the [Style tiers](#style-tiers) show where a hash is enough.
5. Rename the header to `Content-Security-Policy`.

Reports can hold the KS. The captions editor has its own player, and that player requests a media URL with the KS in its path (`…/playManifest/…/ks/<KS>/…` on the `cdn` host). If your policy blocks that URL, for example with a narrower `media-src`, then `blockedURI`, `document-uri` and the console message hold the full KS. Redact those fields before you log or store a report. Use a short-lived KS with the least privilege each widget needs ([ks-privileges.md](ks-privileges.md)). Kaltura would need to send the KS by header for `playManifest`: that is a request to the Caption Studio owners.

Server-to-server calls, such as minting a KS on your server, need no CSP entry.

### Not supported

- **Trusted Types.** Do not set `require-trusted-types-for 'script'`. Our bundle and the player and recorder loaders write to HTML and script URL sinks without a named policy.
- **`Integrity-Policy: blocked-destinations=(script)`.** Do not set it. The recorder and the editor's `main.js` load the Player script with no `integrity`, and Unisphere loads its runtimes from a manifest. The browser would block them.
- **`'strict-dynamic'`** with the captions editor, as above.

What is tested: the Chart, Flashcards, the Player (stub), the avatar loader (stub) and the recorder (stub script) run under this exact policy with no violation. A `data:` media element and a `blob:` worker are allowed. A script from an unlisted host, a media URL from an unlisted host and a worker script from `'self'` are blocked (`e2e/csp.spec.ts`). The real Player script was checked once in Chromium on `nvp1`: it plays with `data:` in `media-src` and `worker-src blob:`, and without them autoplay is blocked and the KAVA worker is lost. A real recording and upload was checked in Chromium, Firefox and WebKit (US, fake devices): no violation. The real captions editor page was checked once on `nvp1`: it loaded with no violation (the test entry has no captions, so the editing screen was not exercised). The Player, clips, captions editor, Media Manager and Analytics were also run in Firefox and WebKit, as a header and as a meta tag. The only violation is the Media Manager font stylesheet, see the Unisphere row. Not tested: regional accounts, other Unisphere widgets, the captions editor with captions, and a live avatar session. Private cloud and on-prem Unisphere hosts also need entries in `script-src`, `connect-src` and `frame-src`.

## Remote code from Kaltura

Most widgets run Kaltura code in your page origin. It can read the KS and your page. Any script on the page can read the KS too. Only Analytics keeps the KS in a cross-origin iframe. Use a short-lived KS with the least privilege each widget needs, and `editadmintags:*` only for the recorder.

The KS is not in the script or iframe URL we build for the Player, the Flashcards clips, the recorder, Analytics or the Unisphere widgets (the Analytics app itself requests a player script with the KS in its path from inside its frame). It goes in JavaScript: the recorder `create` options, the player config (`useHeaderForKs: true`) and `data-*` attributes. The captions editor is the exception: its own player requests a `playManifest` URL with the KS in the path. See [Rollout](#rollout) for what that means for CSP reports.

| Code | Version you get | Integrity |
|---|---|---|
| Our bundle (jsDelivr) | The tag you pin | SRI hashes in each Release |
| Player | The player version of the uiConf. The customer admin picks it per player instance in KMC, so the uiConf is the pin | None |
| Express Recorder | Pinned to `/apps/expressrecorder/v2.2.10/` | None yet. SRI waits on Kaltura: the script is served with no CORS header, so a hash with `crossorigin` is blocked. The loader is ready for a hash |
| Captions editor | Pinned to `/apps/captionstudio/v1.3.10/` | `embed.php` is fetched with `integrity`, and `main.js` and `main.css` get `integrity` before the blob page is built. A mismatch on `embed.php` shows an error and the KS is never sent. A mismatch on `main.js` or `main.css` is blocked by the browser inside the frame, so the editor stays blank or unstyled with no error. The KS is on the frame by then, but only code that matches the pinned hash can run |
| Analytics iframe | `latest` (pin pending) | SRI does not apply to iframes. The controls are the cross-origin frame and the `postMessage` origin checks |
| Unisphere widgets | The `/v1` loader. The runtime list (`runtime.json`) can change | None. You trust Kaltura here. `script-src` and `connect-src` limit where code can come from. WebKit does not enforce import-map integrity |

- A pin gives change control. SRI gives integrity. We accept no SRI for the rest while all remote code comes from Kaltura.
- Pins cover the first hop only. The recorder and the editor's `main.js` load the Player script with no `integrity`, and Unisphere loads its runtimes from the manifest.
- A host that needs isolation must embed the components in a page on a separate origin. See [ADR 0005](adr/0005-analytics-and-recorder-integration.md) and [ADR 0008](adr/0008-in-page-player-and-captions-editor.md).

CSP does not replace the host controls above. Agent output stays untrusted: [SECURITY.md](../SECURITY.md).
