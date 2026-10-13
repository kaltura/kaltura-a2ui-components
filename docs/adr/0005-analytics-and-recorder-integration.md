# 0005. Analytics and recorder integration

Status: ANA-01 proposed (needs the Analytics team). REC-01 accepted and implemented (recorder script).

Covers ANA-01 (plan item 3.1b) and REC-01 (plan item 3.1d). Sources were read on 2026-10-12.

## ANA-01: Analytics embed

### Context

| | Our code (`src/core/analytics.tsx`) | Kaltura guide |
|---|---|---|
| URL | `https://kmc.kaltura.com/index.php/kmcng/analytics?ks=…&partnerId=…` | `https://kmc.kaltura.com/apps/kmc-analytics/latest/index.html` |
| KS transport | Query string of the iframe URL | `postMessage`, in the `init` message |
| KS type | Any | ADMIN (type=2) with analytics permissions |
| Filters | `entryId`, `reportType`, `fromDate`, `toDate` as query parameters | `navigate` and `updateFilters` messages |
| KS renewal | Remount | `updateConfig` message with the new KS |

The guide's handshake:

1. The iframe sends `analyticsInit` with `payload.viewsConfig`.
2. The host replies `init` with `kalturaServer.uri`, `cdnServers.securedServerUri`, `ks`, `pid`, `locale`, `menuConfig` and `viewsConfig`.
3. The iframe sends `analyticsInitComplete`.
4. The host sends `navigate` and `updateFilters`.

The guide says to accept messages from `kmc.kaltura.com` only. Its code sample sends `init`, which holds the ADMIN KS, with target origin `'*'`.

The `kmcng/analytics` URL we use does not appear in the guide. We do not know if it is supported.

### Decision (proposed)

Ask the Analytics team if `kmcng/analytics?ks=` is supported. If not, move `AnalyticsCore` to the documented handshake:

- Send `init` with target origin `https://kmc.kaltura.com`, never `'*'`.
- Accept a message only when `event.origin` is `https://kmc.kaltura.com` and `event.source` is our iframe's `contentWindow`.
- Map our props to `navigate` and `updateFilters`. Renew the KS with `updateConfig`.

### Consequences

- The ADMIN KS leaves the iframe URL, so it is no longer in history, logs or `Referer`.
- The component needs message handling and a test for the origin and source checks.
- The regional KMC host is still unknown (see REG-01 in docs/host-api.md).

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

### Decision (accepted)

`KalturaRecorder` uses the Express Recorder script. The `extwidget/preview` iframe is gone.

- The script loads only from `https://www.kaltura.com/apps/expressrecorder/latest/express-recorder.js`. All recorders on a page share one load. A failed load is retried on the next mount.
- The KS comes from the host KS provider only (`src/core/ks.ts`). `create` gets `ks`, `serviceUrl`, `playerUrl`, `partnerId`, `uiConfId` and `app: 'a2ui'`. The script shows "Missing props: app" without `app`.
- `uiconfId` is now required. `conversionProfileId` is not offered. `showUploadUI` and the recorder methods are not exposed.
- `mediaUploadEnded` becomes the host event `recorder-upload-ended`. An `error` event becomes a generic `setErrorHandler` code with the fixed text `Recorder error`. Remote error text is dropped, because it can hold the KS or markup.
- `destroy` runs on unmount and on every prop change.

#### SRI is not possible today

Version 2.2.10 was audited on 2026-10-13, sha384 `VkTBbp92aE8w5t8L3oNuCWPla+b1pnhgEHE3qBg+6VgCuGOou14E4Dwp/ZPcDWYS`. The CDN has no versioned path, only `latest`, so that hash would break on the next Kaltura release. The response also has no `Access-Control-Allow-Origin`, so `integrity` with `crossorigin="anonymous"` fails to load. The loader (`src/core/recorder-script.ts`) sets both when a hash is configured, and shows a plain-text error on an integrity failure. `RECORDER_SCRIPT` has no hash until Kaltura publishes a versioned, CORS-enabled path. The script loads the player script from `cdnapisec` by itself, so that file has no SRI either.

### Consequences

- The script runs in the host page's origin with the KS. The iframe kept it in a sandbox. The move trades isolation for events and the documented API. The host CSP must allow `www.kaltura.com` and `cdnapisec.kaltura.com` in `script-src` ([host-integration.md](../host-integration.md#content-security-policy)).
- `editadmintags:*` is in the KS guidance in docs/security/ks.md.
- The size budget has no margin left (ESM is at its limit).

## Sources

- Analytics: https://kaltura.md/KALTURA_ANALYTICS_EMBED_API/ (base URL, handshake, `updateConfig`, trusted origin note)
- Express Recorder: https://kaltura.md/KALTURA_EXPRESS_RECORDER_API/ (script URL, `create` options, events, methods, `editadmintags:*`)
- KS types and privileges: https://kaltura.md/KALTURA_SESSION_GUIDE/
