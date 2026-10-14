# 0005. Analytics and recorder integration

Status: ANA-01 and REC-01 accepted and implemented. REC-01 has no SRI yet (Kaltura CDN limit).

Covers ANA-01 and REC-01. Sources were read on 2026-10-12.

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
- Regional KMC hosts come from `region.ts` (see [Regions](../host-api.md#regions)).

## REC-01: Recorder

### Context

| | Our code (`src/core/recorder.tsx`) | Kaltura guide |
|---|---|---|
| Integration | Sandboxed iframe: `https://www.kaltura.com/index.php/extwidget/preview/partner_id/…/uiconf_id/…/entry_id//embed/iframe?ks=…&showRecordButton=true` | Script in the host page: `https://www.kaltura.com/apps/expressrecorder/v2.2.10/express-recorder.js` |
| Setup | Iframe URL | `Kaltura.ExpressRecorder.create('container', { ks, serviceUrl, partnerId, uiConfId, app, playerUrl, conversionProfileId, entryName, allowVideo, allowAudio, allowScreenShare, maxRecordingTime, showUploadUI })` |
| KS | Any | Must have the `editadmintags:*` privilege |
| Events | None | `recordingStarted`, `recordingEnded`, `recordingCancelled`, `mediaUploadStarted`, `mediaUploadProgress`, `mediaUploadEnded`, `mediaUploadCancelled`, `error` (`code`, `message`) |
| Methods | None | `startRecording`, `stopRecording`, `upload`, `cancelUpload`, `saveCopy`, `destroy` |

The `extwidget/preview` iframe does not appear in the Express Recorder guide.

### Decision (accepted)

`KalturaRecorder` uses the Express Recorder script. The `extwidget/preview` iframe is gone.

- The script loads only from the recorder host of the region (`https://www.kaltura.com` in the US, the recorder host from `src/core/region.ts` elsewhere) at `/apps/expressrecorder/v2.2.10/express-recorder.js`. All recorders on a page share one load. A failed load is retried on the next mount.
- The KS comes from the host KS provider only, as on the player (`src/core/ks.ts`). `create` gets `ks`, `serviceUrl`, `playerUrl`, `partnerId`, `uiConfId` and `app: 'a2ui'`. The script shows "Missing props: app" without `app`.
- `uiconfId` is now required. `conversionProfileId` is not offered. `showUploadUI` and the recorder methods are not exposed.
- `mediaUploadEnded` becomes the host event `recorder-upload-ended`. An `error` event becomes a generic `setErrorHandler` code with the fixed text `Recorder error`. Remote error text is dropped, because it can hold the KS or markup.
- `destroy` runs on unmount and on every prop change.

#### Pinned path, no SRI yet

The Express Recorder has versioned paths (`v2.2.4` to `v2.2.10` returned 200 on 2026-10-13). `latest` was byte-identical to `v2.2.10` then. The loader (`src/core/recorder-script.ts`) uses `/apps/expressrecorder/v2.2.10/`, so a Kaltura release cannot change the code under you. Bumps go through a release.

SRI is the open part. The response has no `Access-Control-Allow-Origin`, so `integrity` with `crossorigin="anonymous"` fails to load (W3C SRI needs CORS for cross-origin scripts). The loader sets both when a hash is configured, and shows a plain-text error on an integrity failure. `RECORDER_SCRIPT` has no hash until Kaltura sends CORS on `/apps/expressrecorder/`. Then the known hash can go in.

The script loads the player script from `cdnapisec` by itself, with no integrity. Pins and SRI cover the first hop only. SRI is out of scope for the rest while all remote code comes from Kaltura.

### Consequences

- The script runs in the host page's origin with the KS. The iframe kept it in a sandbox. The move trades isolation for events and the documented API. The host CSP must allow `https://www.kaltura.com/apps/` and `https://cdnapisec.kaltura.com/p/` in `script-src` ([host-integration.md](../host-integration.md#content-security-policy)).
- `editadmintags:*` is in the KS guidance in docs/security/ks.md.
- The size budget has no margin left (ESM is at its limit).

## Sources

- Analytics: https://kaltura.md/KALTURA_ANALYTICS_EMBED_API/ (base URL, handshake, `updateConfig`, trusted origin note)
- Express Recorder: https://kaltura.md/KALTURA_EXPRESS_RECORDER_API/ (script URL, `create` options, events, methods, `editadmintags:*`)
- KS types and privileges: https://kaltura.md/KALTURA_SESSION_GUIDE/
