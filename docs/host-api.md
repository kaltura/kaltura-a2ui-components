# Host API

Options the host page sets. Agents never call these. Set them once, before the components mount. Each call replaces the previous value.

| Function | React adapter | Web component bundle | What it does |
|---|---|---|---|
| `setKsProvider(fn)` | yes | yes | Supplies the KS. See docs/security/ks.md |
| `setExtraAllowedOrigins(origins)` | yes | yes | Adds Unisphere `serverUrl` origins (private cloud, on-prem) |
| `setExtraMediaOrigins(origins)` | yes | no | Adds origins for the basic Image, Video and AudioPlayer |
| `setRegion(code)` | yes | yes | Picks the Kaltura region for the hosts in the table below |
| `setAllowedPartners(rule)` | yes | yes | Limits the `partnerId` values the components accept. Default: all |
| `setAllowedUiconfs(rule)` | yes | yes | Limits the `uiconfId` values the components accept. Default: all |
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

**Register the Kaltura catalog only.** The agent picks the catalog by id in `createSurface`. Importing the package guards the shared `basicCatalog` in place (Image, Video, AudioPlayer and Text), so an agent that picks it gets these checks too. A catalog you build yourself from the raw `Image`, `Video`, `AudioPlayer` or `Text` exports, or from a second copy of `@a2ui/web_core`, is not guarded. To keep the basic catalog id for older agents, register `buildKalturaCatalog(basicCatalog.id)` in its place.

## Player and Captions editor

The Player, the Flashcards clips and the Captions editor run in your page. The KS goes in JavaScript, not in the URL of any script or iframe ([ADR 0008](adr/0008-in-page-player-and-captions-editor.md)). There is no iframe left to sandbox, so the player sandbox option of 0.3 is removed in 0.4.0 ([migration-0.4.md](migration-0.4.md#player-flashcards-and-captions-editor)).

| Widget | How it loads | Where the KS goes |
|---|---|---|
| Player, flashcard clips | The `embedPlaykitJs` script of the `uiconfId` from the `cdn` host (table below), then `KalturaPlayer.setup` | The player config, with `useHeaderForKs: true`. Not in any URL |
| Captions editor | `<serviceUrl>/apps/captionstudio/v1.3.10/embed.php` is fetched (with `integrity`) into a blob URL iframe | `data-*` attributes on that iframe. The editor's own player requests a `playManifest` URL with the KS in its path ([CSP reports](host-integration.md#rollout)) |

- The script and the editor page run in your page origin and can read the KS and your page. The captions iframe `sandbox` has `allow-same-origin` and `allow-scripts`, so it is not a security boundary. If you need isolation, embed the component in a page on a separate origin, or use a CSP.
- Versions: the player version is the one the customer admin picks for the uiConf in KMC, so the uiConf is the pin. The editor is pinned to `v1.3.10` and checked with `integrity` (page, `main.js`, `main.css`). The player bundle that the editor loads has no integrity: pins cover the first hop only. See [Remote code from Kaltura](host-integration.md#remote-code-from-kaltura).
- The player adds `KalturaPlayer`, `__kalturaplayerdata` and `regeneratorRuntime` to `window`. Each bundle replaces `KalturaPlayer`, so two uiconfs on one page make the loader load the bundle again when it switches.
- The uiconf sets the plugins. The `plugins=` URL parameter is gone. `autoplay` and `muted` reach the player only when the prop is set, so the uiconf defaults apply otherwise.
- The player also reads `kalturaSeekFrom`, `kalturaClipTo` and `kalturaStartTime` from the query string of your page. Those parameters can change which part of a clip plays.
- CSP: [host-integration.md](host-integration.md#content-security-policy). The Player needs `media-src data:` and `worker-src blob:`. The Captions editor needs `frame-src blob:` and `connect-src <serviceUrl>`.

## Allowed partners and uiconfs

The agent picks `partnerId` and `uiconfId`. A uiconf decides which player or recorder code runs in your page, with your KS. Whoever owns a uiconf can put any JavaScript in it, so the code that runs is only as trusted as the account behind the id. Set an allowlist so the agent can use only your accounts.

```ts
import { setAllowedPartners, setAllowedUiconfs } from '@kaltura/a2ui-react';

setAllowedPartners([1234567]);
setAllowedUiconfs([/^(2000001|2000002)$/]);
```

The rule is one of:

| Rule | Allows |
|---|---|
| `'*'` or `undefined` | Every id. The default. Also resets an earlier rule |
| A list of numbers, strings and RegExps | An id that equals a number or string, or matches a RegExp. `[]` allows none |
| A RegExp | An id that matches it |

- A number or string must equal the id (`123` and `'123'` are the same). It never matches part of an id.
- A RegExp is tested against the id as text and is not anchored. `/123/` allows `91234`. Write `^` and `$`: `/^(123|456)$/`. A `g` or `y` flag does not change the result between calls.
- Any other value throws and keeps the current rule. A list entry of `'*'` matches only the text `*`, so use the plain `'*'` rule to allow all.
- `uiconfId: 0` (the default uiConf) is checked like any other id. An unset optional `uiconfId` is not checked.
- Call both before the components mount. Each call replaces the previous rule. They are not a replacement for `setKsProvider` with a least-privilege KS.

A refused id loads nothing: no script, request or iframe. The component shows `Failed to load <widget>: partnerId is not allowed` (or `uiconfId`), never the id, and the error handler gets `origin-not-allowed`. The check covers every component that takes the ids, through A2UI and the web components:

| Checked | Components |
|---|---|
| `partnerId` and `uiconfId` | Player, Flashcards clips, Recorder, Captions editor, Genie, Content Lab |
| `partnerId` | Analytics, Media Manager, Avatar, Agents, VOD Avatar, `UnisphereWidgetCore`, Flashcards thumbnails |

A refused Flashcards `partnerId` or `uiconfId` affects the clips only. The cards still render. A bad id that fails the usual prop checks still gives `invalid-props`.

## Regions

```ts
setRegion('irp2');
```

Codes: `nvp1` (default, US), `irp2`, `frp2`, `cap2`, `syp2`. Any other code throws and keeps the current region. Components read the region when they build a URL or load a script, so call `setRegion` before they mount.

| Host | nvp1 | irp2 | frp2 | cap2 | syp2 | Used by |
|---|---|---|---|---|---|---|
| serviceUrl | `https://www.kaltura.com` | `https://api.eu.kaltura.com` | `https://api.de.kaltura.com` | `https://api.ca.kaltura.com` | `https://api.ap.kaltura.com` | Captions editor page (`embed.php`) and `serviceurl` |
| vod | `https://cfvod.kaltura.com` | `https://cfvod.irp2.ovp.kaltura.com` | `https://cfvod.frp2.ovp.kaltura.com` | `https://cfvod.cap2.ovp.kaltura.com` | `https://cfvod.syp2.ovp.kaltura.com` | Flashcards thumbnails |
| cdn | `https://cdnapisec.kaltura.com` | `https://api.eu.kaltura.com` | `https://api.de.kaltura.com` | `https://api.cap2.ovp.kaltura.com` | `https://api.syp2.ovp.kaltura.com` | Player script, flashcard clips, captions editor `cdnurl` |
| kmc | `https://kmc.kaltura.com` | `https://kmc.irp2.ovp.kaltura.com` | `https://kmc.de.kaltura.com` | `https://kmc.ca.kaltura.com` | `https://kmc.ap.kaltura.com` | Analytics (`/apps/kmc-analytics/latest/index.html`, and the `postMessage` origin) |
| recorder | `https://www.kaltura.com` | same as cdn | same as cdn | same as cdn | same as cdn | Express Recorder script (`/apps/expressrecorder/v2.2.10/express-recorder.js`) |

The guide lists no regional CDN host, so the player script loads from the regional API host shown in the cdn row. The recorder script loads from the recorder host of the row above. It gets the regional API host as `serviceUrl` and the cdn host as `playerUrl`.

Sources:

- serviceUrl: https://kaltura.md/KALTURA_API_GETTING_STARTED/ §4.1 lists the API base URL per region (`https://api.eu.kaltura.com/api_v3` and so on). The captions editor and the Express Recorder take it without `/api_v3` (the recorder script adds it), as in https://kaltura.md/KALTURA_CAPTIONS_EDITOR_API/.
- vod: the same guide, §4.3, gives `cfvod.{code}.ovp.kaltura.com`.
- kmc: the same guide, §4, "Rich Media CMS" row of each region.
- cdn, recorder: the guide lists no regional CDN host. Kaltura confirmed (2026-10-13) that regional accounts serve the player from the API host and that the recorder uses the US path on it. The Canada and Australia API hosts use the internal `{code}.ovp` form.
- The captions editor page comes from the `serviceUrl` host. CORS on its `embed.php` was verified on `www.kaltura.com`, `api.eu`, `api.de`, `api.ca`, `api.ap`, `api.cap2.ovp` and `api.syp2.ovp`. The editor itself was loaded only on `nvp1`. Check a regional account before you rely on it.

`sgp2` (Singapore) is in the API guide but not supported here: the guide says it runs no microservices, so there is no Unisphere host for it.

## Errors

```ts
import { setErrorHandler, type KalturaError } from '@kaltura/a2ui-react';

setErrorHandler((error: KalturaError) => log(error.code, error.widget, error.message));
```

`KalturaError` is `{ code, widget, message, surfaceId? }`. The handler runs when a component shows an error state. A handler that throws is ignored. `surfaceId` is the A2UI surface of the component. It is missing when the component is not on a surface, as in the web component bundle.

| Code | When |
|---|---|
| `invalid-props` | A prop has a bad value |
| `invalid-ks` | The KS is one of the bad props |
| `origin-not-allowed` | `serverUrl` is not an allowed Unisphere origin, or `partnerId` or `uiconfId` is refused by the [allowlist](#allowed-partners-and-uiconfs) |
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

Each event also has `surfaceId`, as in `KalturaError`. The DOM event still fires. `name` comes from the media library or the agent: treat it as untrusted text. A handler that throws is ignored.

## Agent feedback

Give a Kaltura component an `action` prop and its errors and events go to the agent as A2UI actions. The prop has the shape of the basic Button `action`. It is optional, and without it nothing is sent.

```json
{ "id": "rec", "component": "KalturaRecorder", "partnerId": 1234567, "uiconfId": 7654321,
  "action": { "event": { "name": "recorderFeedback", "context": { "step": "upload" } } } }
```

With `event`, the `MessageProcessor` action handler gets `{ name, surfaceId, sourceComponentId, timestamp, context }`, as for a Button. `context` is the agent's own context, resolved, plus the fields below. They replace agent keys of the same name. Their type is `KalturaActionContext` (without the first three).

| Field | Value |
|---|---|
| `component`, `componentId`, `surfaceId` | The component type (such as `KalturaRecorder`), its id and its surface |
| `widget` | As in `KalturaError` |
| `event` | `error`, `entry-selected`, `recorder-upload-ended` or `avatar-disconnected` |
| `code` | The [error code](#errors), on `error` only |
| `entryId` | On `entry-selected` (one entry) and `recorder-upload-ended`, only in the `1_abc12345` form (digit, underscore, up to 16 lowercase letters or digits) |
| `entryIds` | On `entry-selected` with `multiSelect`, ids in that form only, 5 at most |

With `functionCall`, the function runs on the client on each error and event, and the agent gets nothing.

| Component | Sends |
|---|---|
| All 12 Kaltura components | `error` |
| `KalturaMediaManager` | `entry-selected` |
| `KalturaRecorder` | `recorder-upload-ended` |
| `KalturaAvatar` | `avatar-disconnected` |

A Flashcards clip player reports as `KalturaFlashcards`, widget `flashcards`. The Player has no `ended` event. The basic Image, Video and AudioPlayer have no `action`: only the error handler gets `url-rejected`.

The context goes into the model's prompt. Remote error text can hold the KS or markup, so it is never sent. The Kaltura fields hold only fixed names, codes and checked entry ids: never the KS, `message`, an entry `name`, an avatar `reason` or other text from a remote service or the page.

### Web component bundle

Set `config.action` to `{ event: { name } }`. On each error and event the element fires a `kaltura-action` DOM event (it bubbles and crosses shadow roots) with `detail: { name, context }`. `context` has `widget`, `event`, `code`, `entryId` and `entryIds`, as above. There is no surface, so there is no `component`, `componentId` or `surfaceId`. `config.action.event.context` is not sent back, and `functionCall` does nothing. Forward `detail` to your agent yourself:

```js
document.addEventListener('kaltura-action', event => agent.send(event.detail));
```

### Client error messages

`toClientError(error, surfaceId?)` turns a `KalturaError` into an A2UI v0.9 client `error` message. It is in both bundles and has no side effects.

```ts
setErrorHandler(error => agent.send(toClientError(error)));
// { version: 'v0.9', error: { code: 'invalid-props', widget: 'player', surfaceId: 's', message: 'Kaltura player error: invalid-props' } }
```

`message` is built from the code and the widget, never from `error.message`. `surfaceId` defaults to `error.surfaceId`, then `''`.

## Client functions

The Kaltura catalog replaces the basic `openUrl`. It opens only absolute `https:` URLs. Anything else (a relative URL, `javascript:`, `http:`) is blocked with a console warning. The agent and the error handler get no signal. `copyToClipboard` copies the agent's text without a preview, so treat it as agent output.

## Capability negotiation

An agent that offers catalog choices needs to know which catalogs your client renders. Ask the `MessageProcessor` and send the result in the `a2uiClientCapabilities` field of your request to the agent (A2UI v0.9 [client capabilities](https://a2ui.org/specification/v0_9/client_capabilities.json)):

```ts
const processor = new MessageProcessor([kalturaReactCatalog]);

const request = {
  message: userText,
  // { 'v0.9': { supportedCatalogIds: [KALTURA_CATALOG_ID] } }
  a2uiClientCapabilities: processor.getRendererCapabilities({ versions: ['v0.9'] }),
};
```

- `supportedCatalogIds` lists the id of every catalog you registered. The agent must use one of them in `createSurface`.
- Add `includeInlineCatalogs: true` to send the full catalog definitions. Only do that for an agent that declares `acceptsInlineCatalogs: true`.
- `getRendererCapabilities` comes from `@a2ui/web_core` (it replaces `getClientCapabilities`). The transport that carries the field depends on your agent protocol.
