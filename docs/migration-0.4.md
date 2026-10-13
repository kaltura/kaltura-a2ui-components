# Migrate from 0.3.x to 0.4.0

## Recorder

`KalturaRecorder` (`<kaltura-recorder>`) now runs the Express Recorder script in your page. It no longer uses the `extwidget/preview` iframe. Why: [ADR 0005](adr/0005-analytics-and-recorder-integration.md).

| # | Who | Do | Why |
|---|---|---|---|
| 1 | Hosts with a recorder | Send `uiconfId` (positive integer) | It is now required. The Express Recorder needs a recorder uiConf |
| 2 | Hosts with a recorder | Return a KS for the `recorder` widget from `setKsProvider`. It needs `editadmintags:*` | The script gets the KS in its `create` options. The `ks` prop still works as a fallback |
| 3 | Hosts with a CSP | Add `https://www.kaltura.com` and `https://cdnapisec.kaltura.com` to `script-src` and `blob:` to `media-src`. Drop the recorder from `frame-src` | See [CSP](host-integration.md#content-security-policy) |
| 4 | Hosts that read recorder state | Use `setEventHandler` for `recorder-upload-ended` | See [host-api.md](host-api.md) |

New optional props: `entryName`, `allowVideo`, `allowAudio`, `allowScreenShare`, `maxRecordingTime`. `conversionProfileId` is not offered.

Trade-off: the script runs in your page origin and can read the KS. Use a short expiry. Details: [docs/security/ks.md](security/ks.md).

The script has no SRI today. The Kaltura CDN has no versioned path and sends no CORS header.
