# 0005. Analytics and recorder integration

Status: ANA-01 accepted and implemented. REC-01 proposed: needs confirmation from the Express Recorder team. No recorder code changes yet.

Covers ANA-01 (plan item 3.1b) and REC-01 (plan item 3.1d). Sources were read on 2026-10-12.

## ANA-01: Analytics embed

### Context

| | Before (0.3) | Kaltura guide |
|---|---|---|
| URL | `https://kmc.kaltura.com/index.php/kmcng/analytics?ks=…&partnerId=…` | `https://kmc.kaltura.com/apps/kmc-analytics/latest/index.html` |
| KS transport | Query string of the iframe URL | `postMessage`, in the `init` message |
| KS type | Any | ADMIN (type=2) of a user that has a role |
| Filters | `entryId`, `reportType`, `fromDate`, `toDate` as query parameters | `navigate` and `updateFilters` messages |
| KS renewal | Remount | `updateConfig` message with the new KS |

The guide's handshake:

1. The iframe sends `analyticsInit` with `payload.viewsConfig`.
2. The host replies `init` with `kalturaServer.uri`, `cdnServers`, `ks`, `pid`, `locale`, `live`, `menuConfig` and `viewsConfig`.
3. The iframe sends `analyticsInitComplete`.
4. The host sends `navigate` and `updateFilters`.
5. The iframe sends `updateLayout` with the height it needs.

The guide says to accept messages from `kmc.kaltura.com` only. Its code sample sends `init`, which holds the ADMIN KS, with target origin `'*'`.

The `kmcng/analytics` URL did not appear in the guide.

### Decision (accepted)

`AnalyticsCore` uses the documented handshake. The `kmcng/analytics?ks=` URL is gone.

- The iframe `src` is `kalturaHosts().kmc` plus `/apps/kmc-analytics/latest/index.html`. It holds no KS and no ids.
- `init` goes out with the KMC origin as target origin, never `'*'`.
- A message is accepted only when `event.origin` is the KMC origin and `event.source` is our iframe's `contentWindow`. Other messages and unknown types are ignored.
- The KS comes from `setKsProvider` only. The `ks` prop is removed, like on the avatar, because it is an ADMIN KS.
- `kalturaServer.uri` and the CDN servers come from the region (`src/core/region.ts`).
- Props map to messages: `entryId` or `reportType` to `navigate`, `fromDate` and `toDate` to `updateFilters`. `reportType` must be one of the views in `ANALYTICS_REPORT_TYPES`. Dates must be `YYYY-MM-DD` and come as a pair. A bad value shows a plain-text error and loads nothing.
- `updateLayout` sets the container height, clamped to 400 to 10000 px (400 px is the CSS minimum of the iframe).
- A new KS from a re-rendered `AnalyticsFrame` is sent with `updateConfig`, with no reload.

### Consequences

- The ADMIN KS is no longer in the iframe URL, history, logs or `Referer`.
- The KS must belong to an admin user that has a role. Without a role the app fails with "Invalid object id [0]". The host KS provider owns this (docs/security/ks.md).
- Breaking for hosts: the `ks` prop, `buildAnalyticsUrl(args)` and the old URL are gone. See docs/migration-0.4.md.
- Gap: `setKsProvider` is read once at mount, so there is no trigger for a new KS yet. `updateConfig` is ready for a provider that can signal renewal. Until then a host renews by remounting the widget.
- Regional KMC hosts come from `region.ts` (see REG-01 in docs/host-api.md).

## REC-01: Recorder

### Context

| | Our code (`src/core/recorder.tsx`) | Kaltura guide |
|---|---|---|
| Integration | Sandboxed iframe: `https://www.kaltura.com/index.php/extwidget/preview/partner_id/…/uiconf_id/…/entry_id//embed/iframe?ks=…&showRecordButton=true` | Script in the host page: `https://www.kaltura.com/apps/expressrecorder/latest/express-recorder.js` |
| Setup | Iframe URL | `Kaltura.ExpressRecorder.create('container', { ks, serviceUrl, partnerId, uiConfId, app, playerUrl, conversionProfileId, entryName, allowVideo, allowAudio, allowScreenShare, maxRecordingTime, showUploadUI })` |
| KS | Any | Must have the `editadmintags:*` privilege |
| Events | None | `recordingStarted`, `recordingEnded`, `recordingCancelled`, `mediaUploadStarted`, `mediaUploadProgress`, `mediaUploadEnded`, `mediaUploadCancelled`, `error` (`code`, `message`) |
| Methods | None | `startRecording`, `stopRecording`, `upload`, `cancelUpload`, `saveCopy`, `destroy` |

The `extwidget/preview` iframe does not appear in the Express Recorder guide.

### Decision (proposed)

Ask the Express Recorder team which integration is intended for an embedded component. Keep the iframe until they answer.

If the script is the answer:

- Load a pinned version with an SRI hash. `latest` without a hash is the gap SEC-08 found in the old avatar SDK.
- Map `mediaUploadEnded` and `error` to `setEventHandler` and `setErrorHandler`.
- Call `destroy` on unmount.

### Consequences

- The script runs in the host page's origin with the KS. The iframe keeps it in a sandbox. Moving to the script trades isolation for events and the documented API.
- `editadmintags:*` goes into the KS guidance in docs/security/ks.md.

## Sources

- Analytics: https://kaltura.md/KALTURA_ANALYTICS_EMBED_API/ (base URL, handshake, `updateConfig`, trusted origin note)
- Express Recorder: https://kaltura.md/KALTURA_EXPRESS_RECORDER_API/ (script URL, `create` options, events, methods, `editadmintags:*`)
- KS types and privileges: https://kaltura.md/KALTURA_SESSION_GUIDE/
