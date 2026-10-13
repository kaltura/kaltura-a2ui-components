# Migrate from 0.3.x to 0.4.0

0.4.0 changes four widgets. The KS no longer goes into an iframe or script URL. The one exception: the Captions editor's own player requests a `playManifest` URL with the KS in its path ([Rollout](host-integration.md#rollout)).

| Widget | Change | Section |
|---|---|---|
| `KalturaAnalytics` | Uses the documented `postMessage` handshake of the Kaltura Analytics app | [Checklist](#checklist) |
| `KalturaRecorder` | Runs the Express Recorder script in your page | [Recorder](#recorder) |
| `KalturaPlayer`, `KalturaFlashcards` clips | Run the Kaltura Player script in your page. Breaking: public functions removed | [Player, Flashcards and Captions editor](#player-flashcards-and-captions-editor) |
| `KalturaCaptionsEditor` | Runs the editor in a same-origin blob iframe. Breaking: public function removed | [Player, Flashcards and Captions editor](#player-flashcards-and-captions-editor) |
| `KalturaGenie`, `KalturaContentLab`, `KalturaAgentsWidget`, `KalturaVodAvatar` | Send the config the live Unisphere runtimes take. Before, they rendered blank. Breaking: new required props on Genie and Content Lab | [Unisphere widgets](#unisphere-widgets) |

The full list is in [GitHub Releases](https://github.com/kaltura/kaltura-a2ui-components/releases).

## Checklist

| # | Who | Do | Why |
|---|---|---|---|
| 1 | Hosts with analytics | Return an ADMIN KS (type=2) for the `analytics` widget from `setKsProvider`. Stop sending a `ks` prop | The KS is no longer a prop. See [KS](#ks) |
| 2 | Hosts with analytics | Mint that KS for an admin user that has a role | Without a role the app fails with "Invalid object id [0]" |
| 3 | Hosts and agents | Check `reportType`, `fromDate` and `toDate` | Bad values now show an error. See [Props](#props) |
| 4 | Hosts that call `buildAnalyticsUrl` | Call it with no arguments | It returns a fixed URL. See [URL](#url) |
| 5 | Hosts with a CSP | Keep the KMC host of your region in `frame-src` | See [host-integration.md](host-integration.md#content-security-policy) |

## KS

Before, the KS went in the iframe URL (`ks=`). Now the component sends it in a `postMessage` to the Analytics origin only, and accepts messages only from that origin and from its own iframe.

```ts
setKsProvider(widget => (widget === 'analytics' ? session.adminKs : session.userKs));
```

- A `ks` prop is dropped, as on the avatar.
- `session.adminKs` must belong to an admin user that has a role. How to pick one: [security/ks.md](security/ks.md#what-to-put-in-a-ks).
- Renewal: the provider is read once at mount. To use a new KS, remount the component.

## URL

| 0.3 | 0.4 |
|---|---|
| `https://kmc.kaltura.com/index.php/kmcng/analytics?ks=…&partnerId=…&…` | `https://kmc.kaltura.com/apps/kmc-analytics/latest/index.html` |
| `buildAnalyticsUrl({ partnerId, ks, … })` | `buildAnalyticsUrl()` |

The region sets the host, as before (`setRegion`). No KS, partner or filter is in the URL.

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

## Recorder

`KalturaRecorder` (`<kaltura-recorder>`) now runs the Express Recorder script in your page. It no longer uses the `extwidget/preview` iframe. Why: [ADR 0005](adr/0005-analytics-and-recorder-integration.md).

| # | Who | Do | Why |
|---|---|---|---|
| 1 | Hosts with a recorder | Send `uiconfId` (positive integer) | It is now required. The Express Recorder needs a recorder uiConf |
| 2 | Hosts with a recorder | Return a KS for the `recorder` widget from `setKsProvider`. It needs `editadmintags:*` | The script gets the KS in its `create` options. The `ks` prop still works as a fallback |
| 3 | Hosts with a CSP | Add `https://www.kaltura.com/apps/` and `https://cdnapisec.kaltura.com/p/` to `script-src`, `blob:` and `data:` to `media-src`, and `worker-src blob:`. Drop the recorder from `frame-src` | See [CSP](host-integration.md#content-security-policy) |
| 4 | Hosts that read recorder state | Use `setEventHandler` for `recorder-upload-ended` | See [host-api.md](host-api.md) |

New optional props: `entryName`, `allowVideo`, `allowAudio`, `allowScreenShare`, `maxRecordingTime`. `conversionProfileId` is not offered.

Trade-off: the script runs in your page origin and can read the KS. Use a short expiry. Details: [docs/security/ks.md](security/ks.md).

The script is pinned to `/apps/expressrecorder/v2.2.10/`. It has no SRI yet, because the Kaltura CDN sends no CORS header for it. The loader can take a hash once Kaltura sends one.

## Unisphere widgets

The live runtimes skip a widget silently when its config does not match, so earlier versions showed an empty box. The runtime names, visual types and settings now match the live runtimes ([props table](host-integration.md#unisphere-widget-props)).

| Widget | Change |
|---|---|
| `KalturaGenie` | `uiconfId` is required |
| `KalturaContentLab` | `uiconfId` and `entryId` are required. The drawer stays empty until the account has given AI consent |
| `KalturaVodAvatar` | `entryId` is optional and ignored, as is `avatarStyle` |
| `KalturaAgentsWidget` | `agentId` is ignored. The drawer opens on load |

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

| # | Who | Do | Why |
|---|---|---|---|
| 1 | Hosts that call a removed function | Delete the call | No URL is built any more |
| 2 | Hosts that set a player sandbox | Isolate on your own: embed the component in a page on a separate origin, or use a CSP | There is no player iframe left to sandbox. The script runs in your page origin |
| 3 | Hosts with a CSP | Player and clips: allow the region `cdn` host (path `/p/`) in `script-src`, `data:` in `media-src` and `worker-src blob:`. Captions editor: add `blob:` to `frame-src`, and the `serviceUrl` host to `connect-src`, `style-src`, `font-src`, `script-src` and `base-uri`. Drop `cdnapisec` and `www` from `frame-src` | See [CSP](host-integration.md#content-security-policy) |
| 4 | Hosts and uiconf owners | Check that the uiconf holds the plugins you need | The plugin set now comes from the uiconf. The `plugins=` URL parameter is gone |
| 5 | Hosts with tests or selectors on the player iframe | Select the container (`role="region"`) instead | The player builds its UI inside a `div`. The Captions editor is still an iframe |

### Behaviour changes

- The player bundle runs in your page origin and can read the KS and your page. The captions iframe `sandbox` has `allow-same-origin` and `allow-scripts`, so it is no boundary. This is the same trade-off as the recorder. Use a short expiry.
- Versions: the player version is the one the customer admin picks for the uiConf in KMC, so the uiConf is the pin. The Captions editor is pinned to `v1.3.10` and checked with `integrity` (page, `main.js`, `main.css`). Pins cover the first hop only. SRI is out of scope while all remote code comes from Kaltura.
- New globals on `window`: `KalturaPlayer`, `__kalturaplayerdata`, `regeneratorRuntime`.
- Two uiconfs on one page: each bundle replaces `window.KalturaPlayer`, so the loader loads a bundle again when the uiconf switches.
- The player reads `kalturaSeekFrom`, `kalturaClipTo` and `kalturaStartTime` from the query string of your page. A link with those parameters can change which part of a clip plays.
- `autoplay` and `muted` reach the player only when the prop is set. The uiconf defaults apply otherwise.
- Flashcards clips take the KS from your `setKsProvider` function (called with `flashcards`), with the `ks` prop as fallback.

### Not verified

- The full Captions editor UI with a real caption asset. The live check on `nvp1` reached the "Current video does not have captions" state.
- Regional accounts for the Captions editor. CORS on `embed.php` was verified on `www.kaltura.com`, `api.eu`, `api.de`, `api.ca`, `api.ap`, `api.cap2.ovp` and `api.syp2.ovp`. The editor itself was loaded only on `nvp1`.
- The effect of a strict host CSP on the player script.
