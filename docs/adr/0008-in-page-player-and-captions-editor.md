# 0008. In-page Player and Captions editor

Status: accepted and implemented (2026-10-13). Supersedes the "KS in iframe URLs accepted" part of [ADR 0002](0002-ks-handling.md). Not verified yet: the full Captions editor UI with a real caption asset, and regional accounts.

Covers SEC-10 (SECF-30841) and SEC-14. Code: `src/core/player-script.ts`, `src/core/player.tsx` (`PlayerEmbed`), `src/core/captions-editor.tsx`.

## Context

- Before, the Player, the Flashcards clips and the Captions editor were iframes with the KS in the URL (`ks=` or in the query). A KS in a URL reaches browser history, server and proxy logs, `Referer` headers and screenshots. A host cannot prevent that.
- Analytics ([ADR 0005](0005-analytics-and-recorder-integration.md)) sends the KS by `postMessage`. The Recorder takes it in the script options. The Unisphere widgets take it in the workspace config. Only these three were left.
- The Kaltura guides document the iframe embeds with the KS in the URL. They offer no `postMessage` channel for these embeds.

## Decision

Keep the KS out of script and iframe URLs. Run the embeds in the page and pass the KS in JavaScript.

### Player and Flashcards clips

Both use `PlayerEmbed`.

1. The loader adds `<cdn>/p/{pid}/embedPlaykitJs/partner_id/{pid}/uiconf_id/{uiconf}` as a `<script>`. `<cdn>` is the region host (`kalturaHosts().cdn`).
2. `KalturaPlayer.setup({ targetId, provider: { partnerId, uiConfId, ks, useHeaderForKs: true }, playback })` builds the player.
3. `player.loadMedia({ entryId }, { seekFrom, clipTo })` starts the entry.

`useHeaderForKs: true` is required. Checked live on `nvp1` with a real KS: with it, no request carried the KS in its URL. Without it, the `playManifest` requests carried the KS in the URL.

The KS comes from `setKsProvider` first. The `ks` prop is the fallback. Flashcards ask the provider for `flashcards`. `autoplay` and `muted` go to `playback` only when the prop is set, so the uiconf defaults apply otherwise. The plugin set comes from the uiconf. The old `plugins=` URL parameter is gone.

### Captions editor

The editor has no script loader. Its README (`kaltura/closed-captions-studio`) says it reads `data-*` attributes from `window.frameElement` when its URL has no parameters. That works only in a same-origin iframe.

1. The component fetches `<serviceUrl>/apps/captionstudio/v1.3.10/embed.php` (no credentials, no referrer, pinned `integrity`).
2. It adds `integrity` and `crossorigin` to `main.js` and `main.css`, puts the HTML in a blob URL and loads that in an iframe. A mismatch on the page shows a plain error and the KS is never sent. A mismatch on `main.js` or `main.css` is blocked by the browser, so the frame stays blank, and only code with the pinned hash can read the KS.
3. It sets `data-pid`, `data-ks`, `data-entryid`, `data-cdnurl`, `data-serviceurl` and `data-uiconfid` on the iframe element.

Checked live on `nvp1`: the editor loaded and signed in (it reached "Current video does not have captions", because the account has no captions), and no script or iframe URL held the KS. A later audit found that the editor's own player requests `cdnapisec.../playManifest/.../ks/<KS>/a.mp4` (1 of 29 requests). See Consequences. The CORS header of `embed.php` was open on `www.kaltura.com`, `api.eu`, `api.de`, `api.ca`, `api.ap`, `api.cap2.ovp` and `api.syp2.ovp`.

## Consequences

**Gained**

- The KS is in no script or iframe URL for any widget: Analytics, Recorder, Flashcards, Player and Captions editor.
- One exception remains. The Captions editor has its own player, and it requests a `playManifest` URL with the KS in the path. Neither we nor the host can change that. A CSP report for a blocked URL can hold the full KS (`blockedURI`, `document-uri`, console text): the host must redact it ([host-integration.md](../host-integration.md#rollout)). Open request to the Caption Studio owners: send the KS by header for `playManifest`.

**Cost: third-party code runs in the page origin**

- The Player bundle and the Captions editor page can read the KS and your page. This is the same trade-off as the Express Recorder (ADR 0005) and the Unisphere widgets. The risk moved from URL exposure to third-party script.
- The Captions editor iframe has `allow-same-origin` and `allow-scripts` in its `sandbox`. That is not a security boundary.
- Use a short-lived USER KS with least privilege ([security/ks.md](../security/ks.md)).

**No sandbox (SEC-14 removed)**

- There is no player iframe left to sandbox. The player sandbox option and the three URL builders for the Player, the clips and the Captions editor are removed (breaking, 0.4.0). The list is in [migration-0.4.md](../migration-0.4.md#player-flashcards-and-captions-editor).
- A host that needs isolation must do it itself: embed the component in a page on a separate origin, or use a CSP.

**Versions and SRI**

- The player version is chosen by the customer admin per player instance (uiConf) in KMC. The uiConf is the pin. The bundle is built per uiConf, with CORS `*` and a 10 minute cache, and we set no hash for it.
- The Captions editor is pinned to `/apps/captionstudio/v1.3.10/`. Its page is fetched with `integrity` (the page differs per host, because it writes the host into its `<base>` tag), and `main.js` and `main.css` get `integrity` before the blob page is built.
- Pins and hashes cover the first hop only. The editor's `main.js` loads the player bundle with no integrity. Do not set `Integrity-Policy: blocked-destinations=(script)`: it would block that load.
- SRI for the rest is out of scope while all remote code comes from Kaltura.

**CSP**

- Player and clips: allow the region `cdn` host (path `/p/`) in `script-src`, `worker-src blob:` (the analytics timer worker), and the Kaltura hosts the player calls in `connect-src` and `media-src`, with `data:` in `media-src` (the autoplay probe). They no longer need `frame-src`.
- Captions editor: `frame-src blob:` and `connect-src <serviceUrl>`. The blob frame inherits the host policy, so `style-src`, `font-src`, `script-src` and `base-uri` also need the `serviceUrl` host (the page has a `<base>` tag: with `base-uri 'none'` it stays blank). Checked on the real page on `nvp1` with the policy in `docs/host-integration.md`: no violation.
- Permissions Policy: the blob frame is same-origin, so the host page decides camera, microphone and display capture for it. Send `camera=(), microphone=(), display-capture=()` to deny them.
- The real Player script was checked under the policy in `docs/host-integration.md` in Chromium on `nvp1`. Watch the console for `Content Security Policy` messages in other browsers and regions.

**Page globals and reloads**

- The player bundle adds `KalturaPlayer`, `__kalturaplayerdata` and `regeneratorRuntime` to `window`.
- Each bundle replaces `window.KalturaPlayer`. With two uiconfs on one page, the loader loads a bundle again when the uiconf switches.

**Host page URL can change clips**

- `KalturaPlayer.setup` also reads `kalturaSeekFrom`, `kalturaClipTo` and `kalturaStartTime` from the query string of the host page. A link with those parameters can change which part of a clip plays.

**Open items**

- Captions editor: the full UI with a real caption asset, and regional accounts are not verified.
- A `cap2` or `syp2` account fetches `embed.php` from `api.ca.kaltura.com` or `api.ap.kaltura.com` (the `serviceUrl`). CORS is open on both. The editor itself was not loaded on a regional account.

## Alternatives rejected

| Option | Why not |
|---|---|
| Keep the iframes with the KS in the URL | It leaves SEC-10 open. The KS reaches history, logs and `Referer` |
| A `postMessage` bridge page on a separate origin that we host | The package is a static bundle. We would have to host and secure that origin, and every host would depend on it |
| Ask Kaltura for a KS channel in the embeds (like Analytics `init`) | Still the right long-term fix, because it would restore isolation. It is a request to Kaltura, not something we can ship. If Kaltura adds it, this ADR can be superseded |

## Sources

- Player: https://kaltura.md/KALTURA_PLAYER_EMBED_GUIDE/ (the iframe embed with the KS in the URL that this replaces). The `KalturaPlayer.setup` and `player.loadMedia` calls were checked live, not taken from the guide
- Captions editor: https://kaltura.md/KALTURA_CAPTIONS_EDITOR_API/ (iframe embed) and the `kaltura/closed-captions-studio` README (`data-*` attributes)
