# Migrate from 0.3.x to 0.4.0

0.4.0 changes how most widgets load. The KS no longer goes into an iframe or script URL. The full change list is in [GitHub Releases](https://github.com/kaltura/kaltura-a2ui-components/releases).

## Most hosts must do these

1. **Catalog id.** Replace the `v1` id with `KALTURA_CATALOG_ID` (now the `v2` id). [Catalog v2](#catalog-v2)
2. **New required props.** Send `uiconfId` on every Recorder, Genie and Content Lab, and `entryId` on Content Lab. [Recorder](#recorder), [Unisphere widgets](#unisphere-widgets)
3. **Removed functions.** Delete every call to these. They build iframe URLs that no longer exist. [Player, Flashcards and Captions editor](#player-flashcards-and-captions-editor)

   ```text
   buildPlayerUrl
   buildClipUrl
   buildCaptionsEditorUrl
   setPlayerSandbox
   ```

4. **Analytics.** Return an ADMIN KS from `setKsProvider` and stop sending a `ks` prop. [KS](#ks)

## Checklist

Everything that changed, in the order of the sections below.

| # | Who | Do | Section |
|---|---|---|---|
| 1 | Hosts | Register `kalturaReactCatalog` alone. Its id is now the `v2` id, so `supportedCatalogIds` changes with no code change | [Catalog v2](#catalog-v2) |
| 2 | Hosts that hard-code the id | Import `KALTURA_CATALOG_ID` instead | [Catalog v2](#catalog-v2) |
| 3 | Agent authors and hosts that use the catalog id | Use the `v2` id in `createSurface` and in `supportedCatalogIds`. Read the catalog from the [release](../README.md#install) of 0.4.0 or later | [Catalog v2](#catalog-v2) |
| 4 | Agent authors | Stop sending `agentId` (Agents widget), `entryId` and `avatarStyle` (VOD avatar). `serverUrl` is now optional. Player `partnerId` and `uiconfId` are literal integers, not data bindings | [Catalog v2](#catalog-v2) |
| 5 | Agent authors | Stop sending `ks`. Agents can no longer set it. The KS comes from `setKsProvider` only | [KS](#ks) |
| 6 | Hosts with analytics | Return an ADMIN KS (type=2) for the `analytics` widget from `setKsProvider` | [KS](#ks) |
| 7 | Hosts with analytics | Mint that KS for an admin user that has a role | [KS](#ks) |
| 8 | Hosts that call `buildAnalyticsUrl` | Call it with no arguments | [URL](#url) |
| 9 | Hosts with a CSP | Keep the KMC host of your region in `frame-src` | [URL](#url) |
| 10 | Hosts and agents | Check `reportType`, `fromDate` and `toDate`. Bad values now show an error | [Props](#props) |
| 11 | Hosts that render agent output | Call `setAllowedPartners` and `setAllowedUiconfs` with your own ids (optional) | [Allowed partners and uiconfs](#allowed-partners-and-uiconfs) |
| 12 | Hosts with a recorder | Send `uiconfId` (positive integer) | [Recorder](#recorder) |
| 13 | Hosts with a recorder | Return a KS for the `recorder` widget from `setKsProvider`. It needs `editadmintags:*` | [Recorder](#recorder) |
| 14 | Hosts with a CSP and a recorder | Add the recorder script hosts to `script-src` and the media and worker sources. Drop the recorder from `frame-src` | [Recorder](#recorder) |
| 15 | Hosts that read recorder state | Use `setEventHandler` for `recorder-upload-ended` | [Recorder](#recorder) |
| 16 | Hosts with Genie or Content Lab | Send `uiconfId`. Content Lab also needs `entryId` | [Unisphere widgets](#unisphere-widgets) |
| 17 | Hosts that call a removed function | Delete the call | [Player, Flashcards and Captions editor](#player-flashcards-and-captions-editor) |
| 18 | Hosts that set a player sandbox | Isolate on your own: embed the component in a page on a separate origin, or use a CSP | [Player, Flashcards and Captions editor](#player-flashcards-and-captions-editor) |
| 19 | Hosts with a CSP and a player or captions editor | Update `script-src`, `media-src`, `worker-src` and `frame-src` as in the section | [Player, Flashcards and Captions editor](#player-flashcards-and-captions-editor) |
| 20 | Hosts and uiconf owners | Check that the uiconf holds the plugins you need | [Player, Flashcards and Captions editor](#player-flashcards-and-captions-editor) |
| 21 | Hosts with tests or selectors on the player iframe | Select the container (`role="region"`) instead | [Player, Flashcards and Captions editor](#player-flashcards-and-captions-editor) |
| 22 | Hosts that listen for `kaltura-entry-selected` on `document` | Listen on the element, or use `setEventHandler`. `legacyDocumentEvents` is removed | [Events and actions](#events-and-actions) |
| 23 | Agent authors | `copyToClipboard` and `openUrl` run only after a user gesture, such as a click | [Events and actions](#events-and-actions) |
| 24 | Hosts and agents that read error or action context | Expect `invalidProps` in errors and in actions | [Events and actions](#events-and-actions) |
| 25 | Web component hosts using TypeScript | Use the new element types | [Web component types](#web-component-types) |

## Catalog v2

The 0.4 catalog breaks the 0.3 prop contract (below), so it has a new id. 0.4 does not answer to the old one.

| | 0.3 (previous catalog) | 0.4 (current catalog) |
|---|---|---|
| `catalogId` and `$id` | `https://kaltura.github.io/a2ui/v1/catalog.json` | `https://kaltura.github.io/a2ui/v2/catalog.json` |
| `KALTURA_CATALOG_ID` | the `v1` id | the `v2` id |
| Components | 12 Kaltura | 18 basic and 12 Kaltura |
| Functions | none listed | 14 basic and `copyToClipboard` |
| Theme | Kaltura keys (`palette`, `typography`, ...) that the renderer did not read | The basic theme (`primaryColor`, `iconUrl`, `agentDisplayName`) |

Why the new id: a surface binds to one catalog id, and an agent that cached the `v1` schema would send props that 0.4 rejects. With a new id, an agent cannot mix them.

Why the JSON lists the basic components: `kalturaReactCatalog` already serves them, and a surface uses one catalog. Before, an agent that read the JSON did not see `Text`, `Image` and the others. The runtime and the JSON now have the same names ([ADR 0006](adr/0006-catalog-generation.md)).

What the `v1` catalog (0.3.x) had that `v2` has not, or has changed:

| Component | Prop | `v1` | `v2` |
|---|---|---|---|
| Every component that had one | `ks` | accepted | removed. See [KS](#ks) |
| `KalturaRecorder` | `uiconfId` | not listed | required. See [Recorder](#recorder) |
| `KalturaRecorder` | `entryName`, `allowVideo`, `allowAudio`, `allowScreenShare`, `maxRecordingTime` | not listed | optional |
| `KalturaGenie` | `uiconfId` | not listed | required |
| `KalturaContentLab` | `uiconfId`, `entryId` | not listed | required |
| `KalturaVodAvatar` | `entryId`, `avatarStyle` | `entryId` required | removed |
| `KalturaAgentsWidget` | `agentId` | used | removed |
| Unisphere widgets | `serverUrl` | required | optional |
| `KalturaChart` | `colors`, `annotations[].color` | any length | at most 64 characters per colour |

## KS

Before, the KS went in the iframe URL (`ks=`), or in a `ks` prop that the agent could write. Now the host supplies it with `setKsProvider` and nothing else. The agent cannot set it.

```ts
setKsProvider(widget => (widget === 'analytics' ? session.adminKs : session.userKs));
```

- The `ks` prop is gone from every component. A `ks` in agent output is dropped. A host that passed the KS as a prop must move it to the provider.
- Analytics: the component sends the KS in a `postMessage` to the Analytics origin only, and accepts messages only from that origin and from its own iframe.
- `session.adminKs` must belong to an admin user that has a role. How to pick one: [security/ks.md](security/ks.md#what-to-put-in-a-ks).
- Renewal: the provider is read once at mount. To use a new KS, remount the component ([pattern](security/ks.md#when-the-ks-expires)).

## URL

| 0.3 | 0.4 |
|---|---|
| `https://kmc.kaltura.com/index.php/kmcng/analytics?ks=…&partnerId=…&…` | `https://kmc.kaltura.com/apps/kmc-analytics/latest/index.html` |
| `buildAnalyticsUrl({ partnerId, ks, … })` | `buildAnalyticsUrl()` |

The region sets the host, as before (`setRegion`). No KS, partner or filter is in the URL. Keep the KMC host of your region in `frame-src` ([CSP](host-integration.md#content-security-policy)).

## Props

`partnerId`, `entryId`, `reportType`, `fromDate` and `toDate` stay. They now travel in messages (`init`, `navigate`, `updateFilters`).

| Prop | Rule |
|---|---|
| `entryId` | Opens the entry view. Wins over `reportType` |
| `reportType` | One of `engagement`, `content-interactions`, `technology`, `geo-location`, `contributors`, `overview`, `publisher`, `enduser`, `live`. Default `engagement` |
| `fromDate`, `toDate` | `YYYY-MM-DD`, both or none. Default: the last 30 days |

Before:

```json
{ "id": "a", "component": "KalturaAnalytics", "partnerId": 1234567, "ks": "…", "reportType": "top" }
```

After:

```json
{ "id": "a", "component": "KalturaAnalytics", "partnerId": 1234567, "reportType": "geo-location", "fromDate": "2026-01-01", "toDate": "2026-03-31" }
```

## Allowed partners and uiconfs

New and optional. Owning a uiconf means running code in your page origin with your KS, and the agent picks `partnerId` and `uiconfId`. Limit both to your own ids. Nothing changes until you call them.

```ts
setAllowedPartners([1234567]);
setAllowedUiconfs([2000001, /^20000[0-9]{2}$/]);
```

A refused id loads nothing and the error handler gets `origin-not-allowed`. Rules, components and details: [host-api.md](host-api.md#allowed-partners-and-uiconfs).

## Recorder

`KalturaRecorder` (`<kaltura-recorder>`) now runs the Express Recorder script in your page. It no longer uses the `extwidget/preview` iframe. Why: [ADR 0005](adr/0005-analytics-and-recorder-integration.md).

- `uiconfId` (positive integer) is required. The Express Recorder needs a recorder uiConf.
- The script gets the KS from `setKsProvider` for the `recorder` widget, in its `create` options. The KS needs `editadmintags:*`.
- CSP: add `https://www.kaltura.com/apps/` and `https://cdnapisec.kaltura.com/p/` to `script-src`, `blob:` and `data:` to `media-src`, and `worker-src blob:`. Drop the recorder from `frame-src`. See [CSP](host-integration.md#content-security-policy).
- Recorder state: use `setEventHandler` for `recorder-upload-ended` ([host-api.md](host-api.md#events)).
- New optional props: `entryName`, `allowVideo`, `allowAudio`, `allowScreenShare`, `maxRecordingTime`. `conversionProfileId` is not offered.

Trade-off: the script runs in your page origin and can read the KS. Use a short expiry. Details: [security/ks.md](security/ks.md).

The script is pinned to `/apps/expressrecorder/v2.2.10/`. The host CSP `script-src` allowlist limits where it loads from.

## Unisphere widgets

The runtime names, visual types and settings are in the [props table](host-integration.md#unisphere-widget-props).

| Widget | Change |
|---|---|
| `KalturaGenie` | `uiconfId` is required |
| `KalturaContentLab` | `uiconfId` and `entryId` are required. AI features ask for AI consent first |
| `KalturaVodAvatar` | `entryId` and `avatarStyle` are removed |
| `KalturaAgentsWidget` | `agentId` is removed. The drawer opens on load |

## Player, Flashcards and Captions editor

`KalturaPlayer` (`<kaltura-player>`), the clips of `KalturaFlashcards` and `KalturaCaptionsEditor` (`<kaltura-captions-editor>`) no longer put the KS in an iframe URL. Props are unchanged. Why and trade-offs: [ADR 0008](adr/0008-in-page-player-and-captions-editor.md).

| Widget | 0.3 | 0.4 |
|---|---|---|
| Player, clips | Iframe, KS in the URL | The `embedPlaykitJs` script runs in your page. The KS is in the player config, with `useHeaderForKs: true` |
| Captions editor | Iframe, KS in the URL | `embed.php` is fetched into a blob URL iframe. The KS is in `data-*` attributes |

### Breaking: removed exports

These are gone from `@kaltura/a2ui-react`. The web component bundle loses the two sandbox names:

```text
buildPlayerUrl
buildClipUrl
buildCaptionsEditorUrl
setPlayerSandbox
PLAYER_SANDBOX_PRESET
```

What to do about each, with the CSP detail:

- Removed functions: delete the call. No URL is built any more.
- Player sandbox: there is no player iframe left to sandbox, and the script runs in your page origin. To isolate it, embed the component in a page on a separate origin, or use a CSP.
- CSP for the Player and clips: allow the region `cdn` host (path `/p/`) in `script-src`, `data:` in `media-src` and `worker-src blob:`.
- CSP for the Captions editor: add `blob:` to `frame-src`, and the `serviceUrl` host to `connect-src`, `style-src`, `font-src`, `script-src` and `base-uri`.
- Drop `cdnapisec` and `www` from `frame-src`. See [CSP](host-integration.md#content-security-policy).
- Plugins: the plugin set now comes from the uiconf. The `plugins=` URL parameter is gone. Check that your uiconf holds what you need.
- Tests and selectors: the player builds its UI inside a `div`, so select the container (`role="region"`) instead of the iframe. The Captions editor is still an iframe.

### Behaviour changes

New in 0.4 for the Player, clips and Captions editor. The code runs in your page origin and can read the KS: see [Remote code from Kaltura](host-integration.md#remote-code-from-kaltura) for versions and integrity.

- Two uiconfs on one page: each bundle replaces `window.KalturaPlayer`, so the loader loads a bundle again when the uiconf switches.
- `autoplay` and `muted` reach the player only when the prop is set. The uiconf defaults apply otherwise.
- Flashcards clips take the KS from your `setKsProvider` function (called with `flashcards`).

## Events and actions

- **Media manager events.** `legacyDocumentEvents` is removed. Before, `kaltura-entry-selected` bubbled up to `document`. Now it stops at the `<kaltura-media-manager>` element. Listen on the element, or use `setEventHandler` and the `entry-selected` event ([host-api.md](host-api.md#events)).
- **User gesture.** `copyToClipboard` and `openUrl` need a user gesture, such as a click or tap. Call them from a button action, not on load.
- **`invalidProps`.** Errors (`setErrorHandler`) and the actions sent to the agent now carry `invalidProps`: the names of the props that failed validation, never their values ([host-api.md](host-api.md#errors)).

## Web component types

The web component bundle ships TypeScript types for its elements. TypeScript hosts can drop their own element declarations. Plain `<script>` pages need no change.

## Agent feedback

Additive. Nothing breaks and nothing changes without the new prop.

- Every Kaltura component takes an optional `action` prop, the same shape as the basic Button `action`. Its errors and events then reach the agent as A2UI actions with fixed fields only. Web component hosts set `config.action` and listen for the `kaltura-action` DOM event.
- `KalturaError` and `KalturaEvent` get an optional `surfaceId`.
- New export `toClientError(error)` builds an A2UI v0.9 client `error` message from a `KalturaError`.

Details: [host-api.md](host-api.md#agent-feedback).
