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

`kalturaReactCatalog` already holds the basic components. Do not register `basicCatalog` next to it. The agent picks a catalog by id in `createSurface`. Importing the package guards the shared `basicCatalog` in place, so an agent that picks it still gets the [media URL check](#media-urls) and the markdown filter. A catalog you build yourself from the raw basic components, or from a second copy of `@a2ui/react`, is not guarded. To keep the basic catalog id for older agents, register `buildKalturaCatalog(basicCatalog.id)` in its place.

## DOMPurify override

`@a2ui/react` 0.11.1 depends on `@a2ui/markdown-it` 0.1.2, which pins `dompurify` 3.4.11. That version has published advisories, all fixed by 3.4.16. Your install gets it through `@a2ui/react`, with or without this package. Our ESM bundle carries its own patched copy, but your app uses yours, for example in the markdown renderer you pass to `MarkdownContext`. Override it in `package.json`, to the range this repo uses:

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

- Components never renew a KS. To use a new one, remount the component.
- Keep the KS out of the A2UI data model and out of agent messages. [security/ks.md](security/ks.md) has the full rules.

## Unisphere origins

Unisphere widgets (Media Manager, Genie, Content Lab, Agents, VOD Avatar) import code from `serverUrl`. Only the five Kaltura regions load: `https://unisphere.{nvp1,irp2,frp2,cap2,syp2}.ovp.kaltura.com`. A private cloud or on-prem host needs your approval:

```ts
setExtraAllowedOrigins(['https://unisphere.example.com']);
```

Only `https:` origins with no path, query or user name are accepted. The list replaces the previous one. Anything else throws. Only allow hosts you trust to run code in your page: a Unisphere module runs with your page origin.

## Region

```ts
setRegion('irp2'); // nvp1 (default), irp2, frp2, cap2, syp2
```

It changes two hosts: the captions editor `serviceurl` and the flashcard thumbnail host. The Player, flashcard clip, Analytics and Recorder hosts stay on the US hosts, because no Kaltura guide lists a regional value for them. Unknown codes throw. `sgp2` (Singapore) is not supported. The host table and sources are in [host-api.md](host-api.md#regions).

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
script-src 'self' https://unisphere.nvp1.ovp.kaltura.com https://unisphere.irp2.ovp.kaltura.com https://unisphere.frp2.ovp.kaltura.com https://unisphere.cap2.ovp.kaltura.com https://unisphere.syp2.ovp.kaltura.com https://static.avatar.us.kaltura.ai;
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
| `script-src` | Your own script, the Unisphere loaders (only the regions you use) and the avatar SDK (drop it if you do not use the avatar). If you load the bundle from the CDN, add `https://cdn.jsdelivr.net` and use SRI |
| `style-src ... 'unsafe-inline'` | The bundle injects its CSS in a `<style>` tag and the charts set `style` attributes |
| `img-src`, `media-src` | Flashcard thumbnails, markdown images and the basic media components. Add your `setExtraMediaOrigins` hosts |
| `frame-src` | Player and flashcard clips (`cdnapisec`), captions editor and recorder (`www`), Analytics (`kmc`). Add the hosts of the widgets you use. A private cloud needs its own hosts |
| `connect-src` | The geo map fetches `world-atlas` from jsDelivr. Unisphere widgets call Kaltura APIs |
| `object-src`, `base-uri` | Not needed by any component |

What is tested: the Chart, Flashcards and Player run under this exact policy with no violation, and a script from a host that is not listed is blocked (`e2e/csp.spec.ts`). What is not tested: Unisphere widgets, the avatar and the other iframes. Watch the browser console for `Content Security Policy` messages the first time you enable one of them, and add the Kaltura host it names. Private cloud and on-prem Unisphere hosts also need entries in `script-src`, `connect-src` and `frame-src`.

CSP does not replace the host controls above. Agent output stays untrusted: [SECURITY.md](../SECURITY.md).
