# 0011. Recorder in a Unisphere iframe

Status: accepted (0.8.0). Replaces the REC-01 part of [ADR 0005](0005-analytics-and-recorder-integration.md).

Test IDs: REC-01, SEC-03. Tests: `test/security/recorder.test.tsx`, `test/security/iframe-permissions.test.tsx`, `e2e/recorder.spec.ts`, `e2e/live/player.live.spec.ts` (LIVE-15, LIVE-28).

## Context

- The old recorder was the Express Recorder script. It ran in the host page with the KS in its options.
- Kaltura ships a new Express Recorder as a Unisphere runtime. It has a `loader.html` page that you frame and talk to with `postMessage`.
- The loader sends `recorderInit`. The host answers with `messageType: 'loadRecorder'` and `{ config, env }`. The recorder reports `recordingStarted`, `recordingComplete`, `useThisSelected`, `orientationChanged` and `uploadComplete`. It sends no error, progress or cancel message.
- Checked live (2026-11-16): a USER KS without privileges loads the UI but the upload fails. A USER KS with `editadmintags:*` uploads.

## Decision

`KalturaRecorder` frames `https://unisphere.<region>.ovp.kaltura.com/v1/static/applications/recorder/recorder-assets/<version>/assets/loader/loader.html?parentOrigin=<host origin>`. The loader version is pinned in `src/core/recorder.tsx`.

- Messages are accepted only from the frame's window and the Unisphere origin of the region. The KS is sent only to that origin.
- The frame has `allow="camera; microphone; display-capture; fullscreen"`, `sandbox="allow-scripts allow-same-origin allow-downloads"` and `referrerPolicy="strict-origin"`.
- `uploadComplete` becomes `recorder-upload-ended` (`entryId`, and `entries` when there is more than one). Entry ids are checked and the payload text is never passed on.
- No message within 15 s gives the fixed error `Recorder could not start`.
- `hosts.recorder` is removed from the region table. `env` must be a built-in region code, so custom environments are refused.
- New props: `orientation`, `prompterText`.

## Consequences

- The KS no longer sits in page JavaScript options. A page script cannot read it from the cross-origin frame.
- The host CSP needs `frame-src` for the Unisphere host. The script-src entries for the old recorder are no longer needed.
- Your `Permissions-Policy` must delegate camera, microphone, display-capture and fullscreen to the Unisphere origin ([host-integration.md](../host-integration.md#recorder-permissions)).
- The runtime inside the frame floats. Kaltura can change it without a release here. The reader of `uploadComplete` accepts both known payload shapes.
- Limits: English only, light theme, no `sgp2`, and the host gets no error or cancel event from the recorder.
