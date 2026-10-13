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
| `setPlayerSandbox(tokens)` | yes | yes | Opt-in `sandbox` for player and flashcard clip iframes. Off by default |

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

**Register the Kaltura catalog only.** The agent picks the catalog by id in `createSurface`. Importing the package guards the shared `basicCatalog` in place (Image, Video, AudioPlayer and Text), so an agent that picks it gets these checks too. A catalog you build yourself from the raw `Image`, `Video`, `AudioPlayer` or `Text` exports, or from a second copy of `@a2ui/web_core`, is not guarded. To keep the basic catalog id for older agents, register `buildKalturaCatalog(basicCatalog.id)` in its place.

## Player sandbox

Player and flashcard clip iframes have no `sandbox` attribute by default. A sandbox that leaves out a token the player needs breaks a feature without an error, and none was tested on real devices. Turn it on only after you test your players with it.

```ts
import { setPlayerSandbox, PLAYER_SANDBOX_PRESET } from '@kaltura/a2ui-react';

setPlayerSandbox(PLAYER_SANDBOX_PRESET); // or a list, or 'allow-scripts allow-same-origin'
setPlayerSandbox(undefined); // back to no sandbox
```

- It applies to player and clip iframes that mount after the call. A player already on the page keeps the value it mounted with. Remount it to change it.
- Allowed tokens: `allow-downloads`, `allow-forms`, `allow-modals`, `allow-orientation-lock`, `allow-pointer-lock`, `allow-popups`, `allow-popups-to-escape-sandbox`, `allow-presentation`, `allow-same-origin`, `allow-scripts`, `allow-storage-access-by-user-activation`, `allow-top-navigation-by-user-activation`. Any other token throws (`Sandbox token not allowed: …`) and keeps the current value. `allow-top-navigation` and `allow-top-navigation-to-custom-protocols` are refused: they let the player page replace your page without a click.
- An empty list gives the strictest sandbox: no scripts, so no player.
- No prop or element `config` sets it. The iframe reads only the host value, so a `sandbox` prop from an agent has no effect.
- The captions editor and analytics iframes keep their own fixed `sandbox`. The recorder has no iframe: it is the Express Recorder script (see [host-integration.md](host-integration.md)).

`PLAYER_SANDBOX_PRESET` keeps playback, fullscreen, downloads, Cast/Presentation and share pop-ups. It blocks top navigation, `alert`/`confirm` dialogs, pointer lock and storage access prompts.

| Token | Why the preset has it |
|---|---|
| `allow-scripts` | The player is a script app |
| `allow-same-origin` | The player page (`cdnapisec.kaltura.com`) keeps its own origin, so its API calls, cookies, storage and DRM license requests work. It is cross-origin to your page, so it gets no access to your page |
| `allow-presentation` | Cast and other Presentation API devices |
| `allow-downloads` | The player download button |
| `allow-popups` | Share and "open in new window" links |
| `allow-popups-to-escape-sandbox` | Those new windows open as normal pages. A sandboxed share page often fails |
| `allow-forms` | Player plugins with forms, such as quizzes |
| `allow-orientation-lock` | Landscape lock in fullscreen on phones |

Fullscreen needs no token: the iframe keeps `allowfullscreen` and `allow="fullscreen *"`.

What is tested (`e2e/player-sandbox.spec.ts`, Chromium, Firefox and WebKit, with a local stub page in place of the player): with the preset the page loads, runs script and keeps its origin, fullscreen from inside works, an `<a download>` link downloads, and a `target=_top` link click does not leave your page. What is not tested: the real Kaltura player, Cast and AirPlay devices, DRM playback, mobile browsers and player plugins. Test those with your own players before you turn it on.

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
| kmc | `https://kmc.kaltura.com` | `https://kmc.irp2.ovp.kaltura.com` | `https://kmc.de.kaltura.com` | `https://kmc.ca.kaltura.com` | `https://kmc.ap.kaltura.com` | Analytics (`/apps/kmc-analytics/latest/index.html`, and the `postMessage` origin) |
| recorder | `https://www.kaltura.com` | same as cdn | same as cdn | same as cdn | same as cdn | Express Recorder script (`/apps/expressrecorder/latest/express-recorder.js`) |

The guide lists no regional CDN host, so the player uses the regional API host shown in the cdn row. The recorder script loads from the recorder host of the row above. It gets the regional API host as `serviceUrl` and the cdn host as `playerUrl`.

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
| `render-failed` | A chart threw while it rendered, or the recorder reported an error (fixed text `Recorder error`) |

`widget` is the `KsWidget` name (`player`, `analytics`, `recorder` …) or `flashcards`, `chart`, `image`, `video`, `audio-player`. `UnisphereWidgetCore` used directly reports `unisphere` unless you pass its `widget` prop.

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
| `recorder-upload-ended` | `recorder` | `{ entryId?, instanceId }`. `entryId` is there only when the recorder sent a valid entry id. `instanceId` is the recorder container id |
| `avatar-disconnected` | `avatar` | `{ reason, instanceId }`. `reason` is a name such as `ConversationEnded`, or `UnknownReason`. `instanceId` is the avatar container id |

The DOM event still fires. `name` comes from the media library or the agent: treat it as untrusted text. A handler that throws is ignored.
