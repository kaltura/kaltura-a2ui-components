# Host API

The reference for the host options: signatures, rules, codes and tables. For the step-by-step setup, see [host-integration.md](host-integration.md).

Agents never call these. Set them once, before the components mount. Each call replaces the previous value.

| Function | React adapter | Web component bundle | What it does |
|---|---|---|---|
| `setKsProvider(fn)` | yes | yes | Supplies the KS for each widget instance, with its scope (`(widget, request)`). The only source: agents have no `ks` prop. See [security/ks.md](security/ks.md#the-request) |
| `setExtraAllowedOrigins(origins)` | yes | yes | Adds Unisphere `serverUrl` origins (private cloud, on-prem) |
| `setExtraMediaOrigins(origins)` | yes | no | Adds origins for the basic Image, Video and AudioPlayer |
| `setRegion(code)` | yes | yes | Picks the default Kaltura region for the hosts in the [table below](#regions). A widget can override it with `region` |
| `setEnvironments(map)` | yes | yes | Registers named hosts (localhost, an IP, a private cloud) that a widget can pick with `region`. See [Environments](#environments) |
| `setAllowedRegions(rule)` | yes | yes | Limits the regions and environments a widget can use. Same rule shape as `setAllowedPartners`. Default: all |
| `setAllowedPartners(rule)` | yes | yes | Limits the `partnerId` values the components accept. Default: all |
| `setAllowedUiconfs(rule)` | yes | yes | Limits the `uiconfId` values the components accept. Default: all |
| `setErrorHandler(fn)` | yes | yes | Gets a `KalturaError` for each error state |
| `setEventHandler(fn)` | yes | yes | Gets a `KalturaEvent` for widget events |

In the web component bundle they are on `window.KalturaA2UIWebComponents`. That bundle has no basic Image, Video or AudioPlayer, so it has no `setExtraMediaOrigins`.

Web components take their settings as a `config` property (an object), not as an attribute: `el.config = { ... }`. The elements are typed in `HTMLElementTagNameMap`, so `document.querySelector('kaltura-player')` gives a typed `config`.

## Basic media URLs

`buildKalturaCatalog` and `kalturaReactCatalog` wrap the basic `Image`, `Video` and `AudioPlayer`. Their `url` loads only when all of these hold:

- It is `https`, with no user name or password.
- The host is `kaltura.com` or `*.kaltura.com` with no port, or the origin was added with `setExtraMediaOrigins`.
- The decoded path and query hold no `api_v3`, no `partnerservices2` and no `ks` parameter or path segment.

Otherwise nothing renders and the error handler gets `url-rejected`. The check runs on the resolved value, so a data binding or a `formatString` call is checked too.

This check is a second layer. The real control is that the KS never enters the data model. Do not add a media origin whose URLs carry a KS.

```ts
setExtraMediaOrigins(['https://media.example.com']);
```

`setExtraMediaOrigins` throws on an entry that is not an `https` origin (no path, query or user name).

The basic `Text` renders markdown with the renderer you put in `MarkdownContext` (for example `@a2ui/markdown-it`). The Kaltura catalog runs that output through the package sanitiser:

- Images load only from the URLs above. Other images become their alt text.
- A link with a scheme other than `http`, `https` or `mailto` loses its `href`.
- Tags and attributes outside a short formatting list are removed.

Without a renderer, Text shows plain text. Register the Kaltura catalog alone for these checks to apply: [host-integration.md](host-integration.md#register-the-kaltura-catalog-alone).

## Player and Captions editor

Both run in your page. The KS goes in JavaScript, never in the URL of a script or iframe ([ADR 0008](adr/0008-in-page-player-and-captions-editor.md)). The trade-offs (same origin, the uiConf is the pin, `window` globals, query parameters) are in [host-integration.md](host-integration.md#remote-code-from-kaltura).

| Widget | How it loads | Where the KS goes |
|---|---|---|
| Player, flashcard clips | The `embedPlaykitJs` script of the `uiconfId` from the `cdn` host ([Regions](#regions)), then `KalturaPlayer.setup` | The player config, with `useHeaderForKs: true`. Not in any URL |
| Captions editor | The editor page (`embed.php`, pinned to a fixed version, see `src/core/captions-editor.tsx`) is fetched from the `serviceUrl` host with `integrity` into a blob URL iframe | `data-*` attributes on that iframe. The editor's own player requests a `playManifest` URL with the KS in its path ([CSP reports](host-integration.md#rollout)) |

The uiconf sets the plugins. `autoplay` and `muted` reach the player only when the prop is set, so the uiconf defaults apply otherwise.

## Allowed partners and uiconfs

The agent picks `partnerId` and `uiconfId`. Both are literal integers in agent messages: a string such as `"123"` or a data binding gives `invalid-props`. A uiconf decides which player or recorder code runs in your page, with your KS. Whoever owns a uiconf can put any JavaScript in it, so the code that runs is only as trusted as the account behind the id. Set an allowlist so the agent can use only your accounts.

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
- Call both before the components mount. They are not a replacement for `setKsProvider` with a least-privilege KS.

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

Codes: `nvp1` (default, US), `irp2` (EU), `frp2` (DE), `cap2` (CA), `syp2` (AP), `sgp2` (SG). Any other code throws and keeps the current region. Components read the region when they build a URL or load a script, so call `setRegion` before they mount. Unisphere widgets use the Unisphere host of the region when you set no `serverUrl`.

### Region per widget

Every widget except Chart takes a `region` prop: a code from the list above, or the name of an [environment](#environments). The agent can ask for it. Order of use: the `region` prop, else the region in `serverUrl`, else `setRegion`. The KS request names the result in `scope.region`.

The widget shows `Failed to load <widget>: region is not allowed` and loads nothing (no provider call, script, request or iframe) when:

- the name is well formed but is not a code or a registered environment (a malformed name, such as capitals or a URL, shows `Invalid region` instead)
- `setAllowedRegions` does not allow it
- `region` and `serverUrl` name different regions
- the widget is a Unisphere widget and the region has no Unisphere host (`sgp2`, or an environment without `unisphere`)

The error handler gets `origin-not-allowed`. The message never holds the value. To keep an agent on your regions, call `setAllowedRegions(['irp2'])` (the rule shape is the same as for [partners](#allowed-partners-and-uiconfs)). It checks the default region as well.

The Captions editor works only in a built-in region that has a pinned page (`nvp1`, `irp2`, `frp2`, `cap2`, `syp2`). It fails closed in `sgp2` and in every environment, because the page runs in your origin and must match a known hash.

| Host | nvp1 | irp2 | frp2 | cap2 | syp2 | sgp2 | Used by |
|---|---|---|---|---|---|---|---|
| serviceUrl | `https://www.kaltura.com` | `https://api.irp2.ovp.kaltura.com` | `https://api.frp2.ovp.kaltura.com` | `https://api.cap2.ovp.kaltura.com` | `https://api.syp2.ovp.kaltura.com` | `https://api.sgp2.ovp.kaltura.com` | Captions editor page (`embed.php`) and `serviceurl` |
| vod | `https://cfvod.kaltura.com` | `https://cfvod.irp2.ovp.kaltura.com` | `https://cfvod.frp2.ovp.kaltura.com` | `https://cfvod.cap2.ovp.kaltura.com` | `https://cfvod.syp2.ovp.kaltura.com` | `https://cfvod.sgp2.ovp.kaltura.com` | Flashcards thumbnails |
| cdn | `https://cdnapisec.kaltura.com` | `https://api.irp2.ovp.kaltura.com` | `https://api.frp2.ovp.kaltura.com` | `https://api.cap2.ovp.kaltura.com` | `https://api.syp2.ovp.kaltura.com` | `https://api.sgp2.ovp.kaltura.com` | Player script, flashcard clips, captions editor `cdnurl` |
| kmc | `https://kmc.kaltura.com` | `https://kmc.irp2.ovp.kaltura.com` | `https://kmc.frp2.ovp.kaltura.com` | `https://kmc.cap2.ovp.kaltura.com` | `https://kmc.syp2.ovp.kaltura.com` | `https://kmc.sg.kaltura.com` | Analytics (`/apps/kmc-analytics/latest/index.html`, and the `postMessage` origin) |
| recorder | `https://www.kaltura.com` | same as cdn | same as cdn | same as cdn | same as cdn | same as cdn | Express Recorder script (pinned to a fixed version, see `src/core/recorder-script.ts`) |

Hosts follow the [Kaltura firewall guide](https://knowledge.kaltura.com/help/configuring-your-firewall-rules-to-access-kaltura-products) and use its `.ovp` hosts. For KMC, the guide lists `.ovp` hosts for `irp2` and `frp2` only. `cap2` and `syp2` answer on their `.ovp` KMC host too (not in the guide, so a firewall that follows the guide must allow it). `sgp2` keeps the guide host: its `.ovp` KMC host answers HTTP 500.

The Kaltura API guide lists no regional CDN host, so the player script loads from the regional API host shown in the cdn row. The recorder script loads from the recorder host. It gets the regional API host as `serviceUrl` and the cdn host as `playerUrl`.

`sgp2` (Singapore) runs no microservices, so it has no Unisphere host: the Unisphere widgets (Media Manager, Genie, Content Lab, Agents, VOD Avatar, Avatar) refuse it. The other widgets work, except the Captions editor (no pinned page).

### Environments

For localhost, an IP or a private cloud, register named hosts. The agent sends the name, never a URL.

```ts
import { setEnvironments } from '@kaltura/a2ui-react';

setEnvironments({
  lab: { serviceUrl: 'https://kaltura.lab.example.com', unisphere: 'https://unisphere.lab.example.com' },
  local: { serviceUrl: 'http://localhost:8080' },
});
```

| Rule | Detail |
|---|---|
| Name | `a-z`, digits and `-`, 1 to 32 characters, starts with a letter, and is not a region code |
| `serviceUrl` | Required. `cdn`, `vod`, `kmc` and `recorder` default to it |
| `unisphere` | Optional. Without it the Unisphere widgets refuse the environment. It is added to the Unisphere origin allowlist |
| Values | An origin only: no path, query or userinfo |
| `http:` | Only for `localhost`, `*.localhost`, `[::1]` and private IPs. A `console.warn` says the KS travels in clear text |

A call replaces the whole list. A bad entry throws and keeps the earlier list. `setEnvironments(undefined)` clears it. Your CSP must allow the hosts. Call it before the components mount, and never from agent output. An environment is a region name, so `setAllowedRegions` applies to it.

Sources: `src/core/region.ts`, checked by `e2e/csp.spec.ts`.

## Errors

```ts
import { setErrorHandler, type KalturaError } from '@kaltura/a2ui-react';

setErrorHandler((error: KalturaError) => log(error.code, error.widget, error.message));
```

`KalturaError` is `{ code, widget, message, surfaceId?, invalidProps? }`. The handler runs when a component shows an error state. A handler that throws is ignored.

| Field | Value |
|---|---|
| `surfaceId` | The A2UI surface of the component. Missing when the component is not on a surface, as in the web component bundle |
| `invalidProps` | The names of the props that failed, on `invalid-props` and `invalid-ks`. Names only, never values |

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
| `entry-selected` | `media-manager` | `{ entryId, name, instanceId, entries? }`, the same as the `kaltura-entry-selected` DOM event below |
| `recorder-upload-ended` | `recorder` | `{ entryId?, instanceId }`. `entryId` is there only when the recorder sent a valid entry id. `instanceId` is the recorder container id |
| `avatar-disconnected` | `avatar` | `{ reason, instanceId }`. `reason` is a name such as `ConversationEnded`, or `UnknownReason`. `instanceId` is the avatar container id |

Each event also has `surfaceId`, as in `KalturaError`. A handler that throws is ignored.

### Media Manager selection

The Media Manager also fires a `kaltura-entry-selected` DOM event. It fires on the `<kaltura-media-manager>` element and stops there: it does not reach `document`. In React there is no such element, so use `setEventHandler`.

| `detail` field | Value |
|---|---|
| `entryId` | The selected entry. With `multiSelect`, the ids joined by commas |
| `name` | The entry name, 500 characters at most. With `multiSelect`, the names with ids as one text. Untrusted: it comes from the media library or the agent. Show it as text, never as HTML |
| `instanceId` | The id of the widget container. Compare it when a page holds several Media Managers |
| `entries` | `multiSelect` only: `[{ entryId, name }]`, 5 entries at most |

```js
document.querySelector('kaltura-media-manager').addEventListener('kaltura-entry-selected', event => {
  console.log(event.detail.entryId);
});
```

## Agent feedback

Give a Kaltura component an `action` prop and its errors and events go to the agent as A2UI actions. The prop has the shape of the basic Button `action`. It is optional, and without it nothing is sent.

```json
{ "id": "rec", "component": "KalturaRecorder", "partnerId": 1234567, "uiconfId": 7654321,
  "action": { "event": { "name": "recorderFeedback", "context": { "step": "upload" } } } }
```

### Wire it up

Three paths reach the agent. `agent.send` is your transport.

```ts
import { MessageProcessor, type A2uiMessage } from '@a2ui/web_core/v0_9';
import { kalturaReactCatalog, setErrorHandler, toClientError } from '@kaltura/a2ui-react';

// Actions of components with an `action` prop: the second argument.
const processor = new MessageProcessor([kalturaReactCatalog], action => agent.send({ version: 'v0.9', action }));
// Rule errors (bad id, id not allowed, load failed).
setErrorHandler(error => agent.send(toClientError(error)));
// Schema errors (wrong type, unknown prop) throw from processMessages.
function onAgentMessages(messages: A2uiMessage[], surfaceId: string) {
  try {
    processor.processMessages(messages);
  } catch (error) {
    agent.send({ version: 'v0.9', error: { code: 'VALIDATION_FAILED', surfaceId, path: '/', message: (error as Error).message } });
  }
}
```

| Error kind | Where it shows up |
|---|---|
| Schema (wrong type, unknown prop, unknown catalog) | `processMessages` throws. Nothing renders |
| Rule (bad id value, id not allowed, load failed, URL refused) | The component renders an error state. `setErrorHandler` runs and the `action` is sent |

A component with an `action` prop reports a rule error on both paths. Forward one of them, or the agent gets the error twice. The `action` carries the agent's own context. The error handler covers components with no `action`.

### What the agent receives

The action handler gets `{ name, surfaceId, sourceComponentId, timestamp, context }`, as for a Button. `context` is the agent's own context, resolved, plus the Kaltura fields below. The Kaltura fields replace agent keys of the same name. Their type is `KalturaActionContext` (without the first three).

| Field | Value |
|---|---|
| `component`, `componentId`, `surfaceId` | The component type (such as `KalturaRecorder`), its id and its surface |
| `widget` | As in `KalturaError` |
| `event` | `error`, `entry-selected`, `recorder-upload-ended` or `avatar-disconnected` |
| `code` | The [error code](#errors), on `error` only |
| `invalidProps` | The failed prop names, on `error` with `invalid-props` or `invalid-ks` |
| `entryId` | On `entry-selected` (one entry) and `recorder-upload-ended`, only in the `1_abc12345` form (digit, underscore, up to 16 lowercase letters or digits) |
| `entryIds` | On `entry-selected` with `multiSelect`, ids in that form only, 5 at most |

One full action for each event:

```json
{ "name": "playerFeedback", "surfaceId": "s", "sourceComponentId": "player", "timestamp": "<time>",
  "context": { "step": "play", "component": "KalturaPlayer", "componentId": "player", "surfaceId": "s",
    "widget": "player", "event": "error", "code": "invalid-props", "invalidProps": ["entryId"] } }
```

```json
{ "name": "pickFeedback", "surfaceId": "s", "sourceComponentId": "mm", "timestamp": "<time>",
  "context": { "component": "KalturaMediaManager", "componentId": "mm", "surfaceId": "s",
    "widget": "media-manager", "event": "entry-selected", "entryId": "1_abc12345" } }
```

```json
{ "name": "recorderFeedback", "surfaceId": "s", "sourceComponentId": "rec", "timestamp": "<time>",
  "context": { "step": "upload", "component": "KalturaRecorder", "componentId": "rec", "surfaceId": "s",
    "widget": "recorder", "event": "recorder-upload-ended", "entryId": "1_abc12345" } }
```

```json
{ "name": "avatarFeedback", "surfaceId": "s", "sourceComponentId": "avatar", "timestamp": "<time>",
  "context": { "component": "KalturaAvatar", "componentId": "avatar", "surfaceId": "s",
    "widget": "avatar", "event": "avatar-disconnected" } }
```

| Event | What the agent should do |
|---|---|
| `error`, `invalid-props` | Fix the props in `invalidProps` and send the component again |
| `error`, `origin-not-allowed` | Use an id the host allows. Do not retry the same id |
| `error`, `invalid-ks` | Do not retry. The host owns the KS. Tell the user the session is not valid |
| `error`, `load-failed` or `render-failed` | Show the answer another way, such as text. Retry later, not in a loop |
| `entry-selected` | Treat `entryId` or `entryIds` as the user's choice and go to the next step. The name is not sent |
| `recorder-upload-ended` | Use `entryId` to show or process the new entry. If it is missing, ask the user to check the upload |
| `avatar-disconnected` | The session ended. Ask the user before it starts again |

With `functionCall`, the function runs on the client on each error and event, and the agent gets nothing.

| Component | Sends |
|---|---|
| All 12 Kaltura components | `error` |
| `KalturaMediaManager` | `entry-selected` |
| `KalturaRecorder` | `recorder-upload-ended` |
| `KalturaAvatar` | `avatar-disconnected` |

A Flashcards clip player reports as `KalturaFlashcards`, widget `flashcards`. The basic Image, Video and AudioPlayer have no `action`: only the error handler gets `url-rejected`.

Known gap: the Player has no `ended` event, so the agent cannot learn that a video finished.

The context goes into the model's prompt. Remote error text can hold the KS or markup, so it is never sent. The Kaltura fields hold only fixed names, codes and checked entry ids: never the KS, `message`, an entry `name`, an avatar `reason` or other text from a remote service or the page.

### Web component bundle

Set `config.action` to `{ event: { name } }`. On each error and event the element fires a `kaltura-action` DOM event (it bubbles and crosses shadow roots) with `detail: { name, context }`. `context` has `widget`, `event`, `code`, `invalidProps`, `entryId` and `entryIds`, as above. There is no surface, so there is no `component`, `componentId` or `surfaceId`. `config.action.event.context` is not sent back, and `functionCall` does nothing. Forward `detail` to your agent yourself:

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

The Kaltura catalog replaces the basic `openUrl` and `copyToClipboard`.

| Function | Rule |
|---|---|
| `openUrl` | Runs only after a user gesture, such as a click. Opens only absolute `https:` URLs. Anything else (a relative URL, `javascript:`, `http:`) is blocked with a console warning |
| `copyToClipboard` | Runs only after a user gesture. It copies the agent's text without a preview, so treat it as agent output |

The agent and the error handler get no signal when a call is blocked.

## Capability negotiation

An agent that offers catalog choices needs to know which catalogs your client renders. Ask the `MessageProcessor` and send the result in the `a2uiClientCapabilities` field of your request to the agent (A2UI v0.9 [client capabilities](https://a2ui.org/specification/v0_9/client_capabilities.json)).

One round trip:

```ts
const processor = new MessageProcessor([kalturaReactCatalog]);

// 1. Client to agent.
agent.send({
  message: userText,
  a2uiClientCapabilities: processor.getRendererCapabilities({ versions: ['v0.9'] }),
});
```

The field holds the ids of the catalogs you registered:

```json
{ "v0.9": { "supportedCatalogIds": ["https://kaltura.github.io/a2ui/v2/catalog.json"] } }
```

The agent answers with a `createSurface` that names one of them:

```json
{ "version": "v0.9", "createSurface": { "surfaceId": "s", "catalogId": "https://kaltura.github.io/a2ui/v2/catalog.json" } }
```

- An id you did not register makes `processMessages` throw (`Catalog not found`).
- Sending the catalog id is lighter than `includeInlineCatalogs: true`. The default sends only the ids. Inline sends every definition in full. Use it only for an agent that declares `acceptsInlineCatalogs: true`.
- `KALTURA_CATALOG_ID` is an identifier, not a download link. To fetch the catalog file, use the jsDelivr URL of the tag you pin ([README](../README.md#quick-start)).
- `getRendererCapabilities` comes from `@a2ui/web_core` (it replaces `getClientCapabilities`). The transport that carries the field depends on your agent protocol.
