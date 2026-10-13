# Host API

Options the host page sets. Agents never call these. Set them once, before the components mount. Each call replaces the previous value.

| Function | React adapter | Web component bundle | What it does |
|---|---|---|---|
| `setKsProvider(fn)` | yes | yes | Supplies the KS. See docs/security/ks.md |
| `setExtraAllowedOrigins(origins)` | yes | yes | Adds Unisphere `serverUrl` origins (private cloud, on-prem) |
| `setExtraMediaOrigins(origins)` | yes | no | Adds origins for the basic Image, Video and AudioPlayer |
| `setRegion(code)` | yes | yes | Picks the Kaltura region for the hosts in the table below |
| `setErrorHandler(fn)` | yes | yes | Gets a `KalturaError` for each error state |
| `setEventHandler(fn)` | yes | yes | Gets a `KalturaEvent` for widget events |

In the web component bundle they are on `window.KalturaA2UIWebComponents`. That bundle has no basic Image, Video or AudioPlayer, so it has no `setExtraMediaOrigins`.

## Basic media URLs

`buildKalturaCatalog` and `kalturaReactCatalog` wrap the basic `Image`, `Video` and `AudioPlayer`. Their `url` loads only when all of these hold:

- It is `https`, with no user name or password.
- The host is `kaltura.com` or `*.kaltura.com` with no port, or the origin was added with `setExtraMediaOrigins`.
- The decoded path and query hold no `api_v3`, no `partnerservices2` and no `ks` parameter or path segment.

Otherwise nothing renders and the error handler gets `url-rejected`. The check runs on the resolved value, so a data binding or a `formatString` call is checked too.

The `ks` check goes by name. A KS under another parameter name, or as a plain path segment, passes on a Kaltura host or an added origin. Keep the KS out of the data model, and do not add an origin whose URLs carry a KS.

The basic `Text` renders markdown with the renderer you put in `MarkdownContext` (for example `@a2ui/markdown-it`). The Kaltura catalog runs that output through the package sanitiser: images load only from the URLs above (other images become their alt text), a link with a scheme other than `http`, `https` or `mailto` loses its `href`, and tags and attributes outside a short formatting list are removed. Without a renderer, Text shows plain text, as before.

```ts
setExtraMediaOrigins(['https://media.example.com']);
```

`setExtraMediaOrigins` throws on an entry that is not an `https` origin (no path, query or user name).

**Register the Kaltura catalog only.** The agent picks the catalog by id in `createSurface`. Importing the package guards the shared `basicCatalog` in place (Image, Video, AudioPlayer and Text), so an agent that picks it gets these checks too. A catalog you build yourself from the raw `Image`, `Video`, `AudioPlayer` or `Text` exports, or from a second copy of `@a2ui/react`, is not guarded. To keep the basic catalog id for older agents, register `buildKalturaCatalog(basicCatalog.id)` in its place.

## Regions

```ts
setRegion('irp2');
```

Codes: `nvp1` (default, US), `irp2`, `frp2`, `cap2`, `syp2`. Any other code throws and keeps the current region. Builders read the region when they build a URL, so call `setRegion` before the components mount.

| Host | nvp1 | irp2 | frp2 | cap2 | syp2 | Used by |
|---|---|---|---|---|---|---|
| serviceUrl | `https://www.kaltura.com` | `https://api.eu.kaltura.com` | `https://api.de.kaltura.com` | `https://api.ca.kaltura.com` | `https://api.ap.kaltura.com` | Captions editor `serviceurl` |
| vod | `https://cfvod.kaltura.com` | `https://cfvod.irp2.ovp.kaltura.com` | `https://cfvod.frp2.ovp.kaltura.com` | `https://cfvod.cap2.ovp.kaltura.com` | `https://cfvod.syp2.ovp.kaltura.com` | Flashcards thumbnails |
| cdn | `https://cdnapisec.kaltura.com` | `https://api.eu.kaltura.com` | `https://api.de.kaltura.com` | `https://api.cap2.ovp.kaltura.com` | `https://api.syp2.ovp.kaltura.com` | Player, flashcard clips, captions editor `cdnurl` |
| kmc | `https://kmc.kaltura.com` | `https://kmc.irp2.ovp.kaltura.com` | `https://kmc.de.kaltura.com` | `https://kmc.ca.kaltura.com` | `https://kmc.ap.kaltura.com` | Analytics (`/index.php/kmcng/analytics`) |
| recorder | `https://www.kaltura.com` | same as cdn | same as cdn | same as cdn | same as cdn | Recorder iframe (`/index.php/extwidget/preview`) |

The guide lists no regional CDN host, so the player uses the regional API host shown in the cdn row. The recorder uses the same host with the US path.

Sources:

- serviceUrl: https://kaltura.md/KALTURA_API_GETTING_STARTED/ §4.1 lists the API base URL per region (`https://api.eu.kaltura.com/api_v3` and so on). The captions editor takes it without `/api_v3`, as in https://kaltura.md/KALTURA_CAPTIONS_EDITOR_API/.
- vod: the same guide, §4.3, gives `cfvod.{code}.ovp.kaltura.com`.
- kmc: the same guide, §4, "Rich Media CMS" row of each region.
- cdn, recorder: the guide lists no regional CDN host. Kaltura confirmed (2026-10-13) that regional accounts serve the player from the API host and that the recorder uses the US path on it. The Canada and Australia API hosts use the internal `{code}.ovp` form.
- The captions editor page itself stays on `www.kaltura.com`. Check it on a regional account before you rely on it.

`sgp2` (Singapore) is in the API guide but not supported here: the guide says it runs no microservices, so there is no Unisphere host for it.

## Errors

```ts
import { setErrorHandler, type KalturaError } from '@kaltura/a2ui-react';

setErrorHandler((error: KalturaError) => log(error.code, error.widget, error.message));
```

`KalturaError` is `{ code, widget, message }`. The handler runs when a component shows an error state. A handler that throws is ignored.

| Code | When |
|---|---|
| `invalid-props` | A prop has a bad value |
| `invalid-ks` | The KS is one of the bad props |
| `origin-not-allowed` | `serverUrl` is not an allowed Unisphere origin |
| `load-failed` | A remote module, SDK or workspace failed to load |
| `url-rejected` | A basic Image, Video or AudioPlayer `url` was refused |
| `render-failed` | A chart threw while it rendered |

`widget` is the `KsWidget` name (`player`, `analytics`, `recorder` …) or `flashcards`, `avatar`, `chart`, `image`, `video`, `audio-player`. `UnisphereWidgetCore` used directly reports `unisphere` unless you pass its `widget` prop.

`message` is fixed text plus prop names. It never holds a prop value, the KS or the text of a remote error. Example: `Failed to load player: Invalid entryId`. The on-screen text can hold more than `message`, such as a remote error text.

In React development mode (`StrictMode`) a handler can run twice for one error state.

## Events

```ts
setEventHandler(event => {
  if (event.type === 'entry-selected') pick(event.detail.entryId);
});
```

| Type | Widget | `detail` |
|---|---|---|
| `entry-selected` | `media-manager` | `{ entryId, name, instanceId, entries? }`, the same as the `kaltura-entry-selected` DOM event |

The DOM event still fires. `name` comes from the media library or the agent: treat it as untrusted text. A handler that throws is ignored.
