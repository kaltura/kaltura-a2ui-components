# 0008. In-page Player and Captions editor

Status: accepted and implemented (2026-10-13). Supersedes the "KS in iframe URLs accepted" part of [ADR 0002](0002-ks-handling.md).

Test IDs: SEC-10, SEC-14. Code: `src/core/player-script.ts`, `src/core/player.tsx` (`PlayerEmbed`), `src/core/captions-editor.tsx`.

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

`useHeaderForKs: true` sends the KS in a request header, so no request URL holds it.

The KS comes from `setKsProvider` only. Flashcards ask the provider for `flashcards`. `autoplay` and `muted` go to `playback` only when the prop is set, so the uiconf defaults apply otherwise. The plugin set comes from the uiconf. The old `plugins=` URL parameter is gone.

### Captions editor

The editor has no script loader. It reads its settings from `data-*` attributes on its own iframe element. That works only when the iframe shares the host origin.

1. The component fetches `<serviceUrl>/apps/captionstudio/v1.3.10/embed.php` (no credentials, no referrer, pinned `integrity`).
2. It adds `integrity` and `crossorigin` to `main.js` and `main.css`, puts the HTML in a blob URL and loads that in an iframe. A mismatch on the page shows a plain error and the KS is never sent. A mismatch on `main.js` or `main.css` is blocked by the browser, and only code with the pinned hash can read the KS.
3. It sets `data-pid`, `data-ks`, `data-entryid`, `data-assetid`, `data-cdnurl`, `data-serviceurl` and `data-uiconfid` on the iframe element.

## Consequences

**Gained**

- The KS is in no script or iframe URL for any widget: Analytics, Recorder, Flashcards, Player and Captions editor.
- Redact the KS from CSP reports and logs before you store them ([host-integration.md](../host-integration.md#rollout)).

**Cost: Kaltura code runs in the page origin**

- The Player bundle and the Captions editor page can read the KS and your page. This is the same trade-off as the Express Recorder (ADR 0005) and the Unisphere widgets. The risk moved from URL exposure to script from Kaltura hosts.
- The Captions editor iframe has `allow-same-origin` and `allow-scripts` in its `sandbox`. That is not a security boundary.
- Use a short-lived USER KS with least privilege ([security/ks.md](../security/ks.md)).

**No player sandbox (SEC-14)**

- There is no player iframe left to sandbox. The player sandbox option and the three URL builders for the Player, the clips and the Captions editor are removed (breaking, 0.4.0). The list is in [migration-0.4.md](../migration-0.4.md#player-flashcards-and-captions-editor).
- A host that needs isolation does it itself: embed the component in a page on a separate origin, or use a CSP.

**Versions and SRI**

- The customer admin chooses the player version per player instance (uiConf) in KMC. The uiConf is the pin. The package sets no hash for the player bundle.
- The Captions editor is pinned to `/apps/captionstudio/v1.3.10/`. Its page is fetched with `integrity` (one hash per host), and `main.js` and `main.css` get `integrity` before the blob page is built.

**CSP**

- Player and clips: allow the region `cdn` host (path `/p/`) in `script-src`, `worker-src blob:` (the analytics timer worker), and the Kaltura hosts the player calls in `connect-src` and `media-src`, with `data:` in `media-src` (the autoplay check). They need no `frame-src`.
- Captions editor: `frame-src blob:` and `connect-src <serviceUrl>`. The blob frame inherits the host policy, so `style-src`, `font-src`, `script-src` and `base-uri` also need the `serviceUrl` host (the page has a `<base>` tag: with `base-uri 'none'` it stays blank). The full policy is in [host-integration.md](../host-integration.md#content-security-policy).
- Permissions Policy: the blob frame is same-origin, so the host page decides camera, microphone and display capture for it. Send `camera=(), microphone=(), display-capture=()` to deny them.

**Reloads**

- Each player bundle replaces `window.KalturaPlayer`. With two uiconfs on one page, the loader loads a bundle again when the uiconf switches.

## Alternatives rejected

| Option | Why not |
|---|---|
| Keep the iframes with the KS in the URL | It leaves SEC-10 open. The KS reaches history, logs and `Referer` |
| A `postMessage` bridge page on a separate origin that we host | The package is a static bundle. We would have to host and secure that origin, and every host would depend on it |
| A KS channel in the embeds (like Analytics `init`) | Both embeds run in the host page, and the account owner sets the Player version per uiConf in KMC |

## Sources

- Player: https://kaltura.md/KALTURA_PLAYER_EMBED_GUIDE/ (the iframe embed with the KS in the URL that this replaces)
- Captions editor: https://kaltura.md/KALTURA_CAPTIONS_EDITOR_API/ (iframe embed)
