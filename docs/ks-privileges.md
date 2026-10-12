# KS privileges per widget

What the Kaltura guides ask of the KS for each component. Your server mints the KS and your `setKsProvider` function returns it ([host-integration.md](host-integration.md#kaltura-session-ks)). The component never mints or renews one.

Checked against the guides on 2026-10-12. If a guide changes, the guide wins.

## Rules for every widget

- USER KS (type=0), minted on your server, 1 hour or less. [Session Guide](https://kaltura.md/KALTURA_SESSION_GUIDE/) (best practices, section 7).
- Prefer an AppToken (`appToken.startSession`). Admin secrets never reach the browser.
- Add `setrole:PLAYBACK_BASE_ROLE` where a widget only plays or reads.
- Add `appid:<APP_NAME>-<APP_DOMAIN>` for per-app analytics. Add `iprestrict` or `actionslimit` to cut the damage of a leaked KS.
- `session.end` revokes a KS. Use it at logout.

## Per widget

| Component | `KsWidget` name | KS type | Privileges the guide names | Guide |
|---|---|---|---|---|
| `KalturaPlayer` | `player` | USER | Public entries need no KS. For protected entries: `sview:<entryId>` (or `sview:*`), `setrole:PLAYBACK_BASE_ROLE`, `appid`, and for entitlements `privacycontext` and `enableentitlement` | [Player guide](https://kaltura.md/KALTURA_PLAYER_EMBED_GUIDE/) |
| `KalturaFlashcards` | none (clips use the player URL) | USER | Same as the Player, for each clip. Flashcards reads only a `ks` prop and ignores the provider | [Player guide](https://kaltura.md/KALTURA_PLAYER_EMBED_GUIDE/) |
| `KalturaMediaManager` | `media-manager` | USER | Read-only select mode: content browsing. Manage mode with uploads: explicit content creation (`baseEntry`, `uploadToken`, `categoryEntry`, `category` access). The guide also mentions an ADMIN KS for manage mode. Prefer a USER KS with these rights | [Media Manager guide](https://kaltura.md/KALTURA_MEDIA_MANAGER_API/) |
| `KalturaAnalytics` | `analytics` | ADMIN | The guide requires an ADMIN KS (type=2) whose user has an analytics role (Publisher Administrator has it). Narrow it with `setrole` and `iprestrict`, keep the expiry short and keep it off agent output | [Analytics guide](https://kaltura.md/KALTURA_ANALYTICS_EMBED_API/) |
| `KalturaCaptionsEditor` | `captions-editor` | USER | Edit rights on the entry's caption assets. Allow for the whole editing session: the editor does not renew the KS and saves fail without one. The guide suggests about 2 hours | [Captions guide](https://kaltura.md/KALTURA_CAPTIONS_EDITOR_API/) |
| `KalturaRecorder` | `recorder` | USER | `editadmintags:*` | [Express Recorder guide](https://kaltura.md/KALTURA_EXPRESS_RECORDER_API/) |
| `KalturaGenie` | `genie` | USER | `setrole:PLAYBACK_BASE_ROLE`, `sview:*` | [Unisphere guide](https://kaltura.md/KALTURA_UNISPHERE_FRAMEWORK_API/) |
| `KalturaContentLab`, `KalturaAgentsWidget`, `KalturaVodAvatar` | `content-lab`, `agents-widget`, `vod-avatar` | USER | The Unisphere guide says the privileges depend on the services the runtime calls. Start with `setrole:PLAYBACK_BASE_ROLE` and widen only as the widget needs | [Unisphere guide](https://kaltura.md/KALTURA_UNISPHERE_FRAMEWORK_API/) |
| `KalturaAvatar` | none | none | The avatar SDK takes no KS from this package | not applicable |
| `KalturaChart` | none | none | Renders the data it is given | not applicable |

## Where the KS goes

| Widget | Transport |
|---|---|
| Player, flashcard clips, captions editor, recorder | In the iframe URL. The guides use this pattern. It reaches browser history and proxy logs, so keep the expiry short. This is finding SEC-10, accepted |
| Analytics | Our code puts it in the iframe URL. The guide says to send it with `postMessage`. See finding ANA-01 and [ADR 0005](adr/0005-analytics-and-recorder-integration.md) |
| Unisphere widgets | In the workspace config, in page memory |

## Mixed widgets on one page

`setKsProvider` gets the widget name, so one function can return a different KS per widget:

```ts
setKsProvider(widget => (widget === 'analytics' ? session.adminKs : session.userKs));
```

Never give the ADMIN KS to a widget that does not need it. A hostile agent can choose which components appear on the page, but it cannot read the KS: it is not in the data model or in any prop.
