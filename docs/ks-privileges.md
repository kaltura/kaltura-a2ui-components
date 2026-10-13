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
| `KalturaFlashcards` | `flashcards` | USER | Same as the Player, for each clip. Clips use the same player script | [Player guide](https://kaltura.md/KALTURA_PLAYER_EMBED_GUIDE/) |
| `KalturaMediaManager` | `media-manager` | USER | Read-only select mode: content browsing. Manage mode with uploads: explicit content creation (`baseEntry`, `uploadToken`, `categoryEntry`, `category` access). The guide also mentions an ADMIN KS for manage mode. Prefer a USER KS with these rights | [Media Manager guide](https://kaltura.md/KALTURA_MEDIA_MANAGER_API/) |
| `KalturaAnalytics` | `analytics` | ADMIN | The guide requires an ADMIN KS (type=2) whose user has an analytics role (Publisher Administrator has it). Narrow it with `setrole` and `iprestrict`, keep the expiry short and keep it off agent output | [Analytics guide](https://kaltura.md/KALTURA_ANALYTICS_EMBED_API/) |
| `KalturaCaptionsEditor` | `captions-editor` | USER | Edit rights on the entry's caption assets. Allow for the whole editing session: the editor does not renew the KS and saves fail without one. The guide suggests about 2 hours | [Captions guide](https://kaltura.md/KALTURA_CAPTIONS_EDITOR_API/) |
| `KalturaRecorder` | `recorder` | USER | `editadmintags:*` | [Express Recorder guide](https://kaltura.md/KALTURA_EXPRESS_RECORDER_API/) |
| `KalturaGenie` | `genie` | USER | `setrole:PLAYBACK_BASE_ROLE`, `sview:*` | [Unisphere guide](https://kaltura.md/KALTURA_UNISPHERE_FRAMEWORK_API/) |
| `KalturaContentLab`, `KalturaAgentsWidget`, `KalturaVodAvatar` | `content-lab`, `agents-widget`, `vod-avatar` | USER | The Unisphere guide says the privileges depend on the services the runtime calls. Start with `setrole:PLAYBACK_BASE_ROLE` and widen only as the widget needs | [Unisphere guide](https://kaltura.md/KALTURA_UNISPHERE_FRAMEWORK_API/) |
| `KalturaAvatar` | `avatar` | USER | The KS selects the avatar agent. From the provider only, never a `ks` prop. Privileges not verified yet | [Unisphere guide](https://kaltura.md/KALTURA_UNISPHERE_FRAMEWORK_API/) |
| `KalturaChart` | none | none | Renders the data it is given | not applicable |

## Where the KS goes

| Widget | Transport |
|---|---|
| Player, flashcard clips | In the player config of the `embedPlaykitJs` script, with `useHeaderForKs: true`, which runs in your page. The KS is in no URL. Every script on the page can read it. See [ADR 0008](adr/0008-in-page-player-and-captions-editor.md) |
| Captions editor | In `data-*` attributes on a same-origin iframe (its page is loaded from a blob URL). The KS is in no URL. The editor runs in your page origin and can read it. See [ADR 0008](adr/0008-in-page-player-and-captions-editor.md) |
| Recorder | In the `create` options of the Express Recorder script, which runs in your page. The KS is visible to every script on that page. See [ADR 0005](adr/0005-analytics-and-recorder-integration.md) |
| Analytics | `postMessage` (`init`, then `updateConfig`) to the Kaltura Analytics origin only. Never in the iframe URL. The KS must belong to an admin user that has a role. See finding ANA-01 and [ADR 0005](adr/0005-analytics-and-recorder-integration.md) |
| Unisphere widgets | In the workspace config, in page memory |

## Mixed widgets on one page

`setKsProvider` gets the widget name, so one function can return a different KS per widget:

```ts
setKsProvider(widget => (widget === 'analytics' ? session.adminKs : session.userKs));
```

Never give the ADMIN KS to a widget that does not need it. A hostile agent can choose which components appear on the page, but it cannot read the KS: it is not in the data model or in any prop.
