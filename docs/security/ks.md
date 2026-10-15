# Kaltura Session (KS) handling

The host owns the KS. The agent never sees it, writes it or asks for it.

> [!IMPORTANT]
> **Agent rules**
> - The catalog has no `ks` prop. The A2UI adapter ignores a `ks` in agent output, so an agent cannot set the KS.
> - Do not put a KS in the data model, a URL or any text you give the agent.
> - The only source is `setKsProvider`, which the host page calls. No agent message can call it.

## Model

| Step | What happens |
|---|---|
| 1 | Your server mints a KS for the signed-in user. |
| 2 | The host page registers a provider with `setKsProvider`. |
| 3 | A component that needs a KS checks its props, then calls the provider with its widget name and a request: the scope of that one instance ([The request](#the-request)). |
| 4 | The component checks the value with the ks rule: a non-empty string with no control characters. |

- **Order.** On the A2UI path the provider is the only source. If it returns `undefined` or `''`, or no provider is set, the component has no KS. Every call to Kaltura needs a KS, and a KS only works for its own account, so an agent cannot act on an account whose KS it does not hold.
- **Async.** The component renders nothing until its first KS arrives. When the scope changes later, it keeps showing the last props with the KS minted for them until the next KS arrives (no remount).
- **Errors.** An invalid value, a throw or a rejected promise shows `Failed to load <widget>: Invalid ks`. The value and the error are never shown or logged.
- **Components.** Player, Flashcards, Media Manager, Analytics, Captions Editor, Recorder, Genie, Content Lab, Agents Widget, VOD Avatar and Avatar use the provider.
- **No KS.** The player loads without one (public entries). The other widgets in the list above render nothing until a KS arrives. A web component gets no later config, so there they show `Failed to load <widget>: Invalid ks` instead.
- **Renewal.** Components do not renew a KS. See [When the KS expires](#when-the-ks-expires).

## Wire it

Set the provider before the components mount.

React host:

```ts
import { setKsProvider, type KsRequest, type KsWidget } from '@kaltura/a2ui-react';

setKsProvider(async (widget: KsWidget, request: KsRequest) => {
  const res = await fetch('/api/kaltura-session', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ widget, version: request.version, scope: request.scope }),
    signal: request.signal,
  });
  return res.ok ? (await res.json()).ks : undefined;
});
```

A provider that ignores its arguments, such as `() => ks`, still works. Use the request to mint a KS for one entry or category: [The request](#the-request).

Plain-HTML host: the bundle exposes the same function as `KalturaA2UIWebComponents.setKsProvider`. Call it in a script right after the bundle `<script>` and before the Kaltura elements in the page.

## The request

The second argument says what one widget instance asks for. Every value is data the agent chose, so treat it as untrusted input.

| Field | Meaning |
|---|---|
| `widget` | The `KsWidget` name. Narrow on it to read the matching `scope`. |
| `version` | `1`. Bumped when a widget gains a scope key. Reject versions and keys you do not know. |
| `scope` | Deep-frozen. `partnerId` and `region` always. Then per widget (below). |
| `surfaceId`, `componentId`, `dataPath` | A2UI only. Chosen by the agent. For logs and correlation, never for access decisions. |
| `signal` | Aborted when the scope changes again or the widget unmounts. Pass it to `fetch`. |

| `widget` | `scope` adds |
|---|---|
| `player`, `captions-editor`, `content-lab` | `entryId` |
| `flashcards` | `entryIds`: the clip entries, sorted, unique, at most 20 |
| `analytics` | optional `entryId`, `reportType`, `fromDate`, `toDate` |
| `media-manager` | optional `contextId` (category id, digits only) |
| `genie` | optional `categoryId` (digits only) |
| `recorder`, `agents-widget`, `vod-avatar`, `avatar` | nothing |

Rules the component applies before it calls you:

- The props must pass the widget's schema and the field rules, and `serverUrl` must be an allowed Unisphere origin. A bad value shows the error and the provider is not called. An id the host [allowlists](../host-api.md#allowed-partners-and-uiconfs) refuse also stops the call.
- The scope has no `ks`, no config props and no free text.
- `region` is the region of the widget: its `region` prop, else the region in `serverUrl`, else `setRegion`. It is a region code, or the name of an environment the host registered with `setEnvironments`. A name that is unknown or not allowed never reaches the provider.

What your backend must do:

- Check `partnerId` against the accounts you serve, and `entryId`, `entryIds`, `categoryId` and `contextId` against what the signed-in user may see. A scope value is a request, not a grant.
- Put the scope into the KS privileges (for example `sview:<entryId>`). Per widget: [ks-privileges.md](../ks-privileges.md).
- Reject unknown `version` and unknown scope keys. Rate-limit the endpoint.
- Never log or echo the returned KS.

A UI-level prop that the KS cannot enforce (for example the `analytics` dates) is a hint. The KS is the only boundary.

### When the scope changes

| Event | What the component does |
|---|---|
| First render | Calls the provider at once. |
| A prop in the scope changes | Aborts the open request at once. Waits 300 ms for the scope to settle, then calls the provider again. This also holds while the first reply is still pending. One request is in flight per instance. |
| `flashcards` gains a clip | Reuses the held KS while the new `entryIds` are a subset of the old ones. Otherwise it mints again. |
| The provider throws or rejects | Shows `Invalid ks`. No retry. |
| Unmount | Aborts the open request. After `deleteSurface` the React renderer keeps rendering until the host removes the surface, so remove it on `onSurfaceDeleted`. |

A reply for an old scope is dropped.

## What to put in a KS

Follow the Kaltura Session Guide:

- Mint the KS on your server. Prefer AppTokens (`appToken.startSession`). Admin secrets never leave the server.
- Use a USER KS (type=0).
- Keep the expiry short, for example 1 hour.
- Grant least privilege. For playback: `setrole:PLAYBACK_BASE_ROLE`, `sview:<entryId>`, `privacycontext`, `appid`. Add `iprestrict` or `actionslimit` where you can.
- Give each widget only what its guide lists, for example Genie `setrole:PLAYBACK_BASE_ROLE` and Express Recorder `editadmintags:*`.
- The recorder KS needs `editadmintags:*`. The Express Recorder script runs in your page, so the KS is visible to the page's JavaScript and to any other script on that page. Keep its expiry short and mint it for one user.
- The Player, the Flashcards clips and the Captions editor keep the KS out of script and iframe URLs (player config with `useHeaderForKs: true`, `data-*` attributes). Their code runs in your page origin too, so it can read the KS like the recorder script. The Captions editor's own player requests a `playManifest` URL with the KS in its path, so the KS can reach Kaltura CDN logs and CSP reports (redact `blockedURI`, `document-uri` and console text: [Rollout](../host-integration.md#rollout)). The player version is the uiConf the customer admin picks, the recorder and editor are pinned to a version, and SRI is out of scope while all remote code comes from Kaltura ([Remote code from Kaltura](../host-integration.md#remote-code-from-kaltura)). Keep the expiry short and the privileges narrow. See [ADR 0008](../adr/0008-in-page-player-and-captions-editor.md).
- Analytics is the exception: its guide requires an ADMIN KS (type=2). Mint it on the server with a short expiry and narrow it with `setrole` and `iprestrict`.
- **The Analytics KS must belong to an admin user that has a role.** A KS with no role makes the app fail with "Invalid object id [0]". This is the concern of your KS provider: the component cannot check it. Pick the user with `user.list` and `isAdminEqual=1`, and use one that has `roleIds`.
- Analytics receives the KS in a `postMessage` to the Kaltura Analytics origin, never in the iframe URL. A message is accepted only from that origin and from our iframe. See [ADR 0005](../adr/0005-analytics-and-recorder-integration.md).

## One KS per widget

The provider gets the widget name (`KsWidget`), so each widget can get its own least-privilege KS:

| `widget` | KS |
|---|---|
| `'analytics'` | ADMIN KS (type=2), short expiry |
| `'player'`, `'flashcards'`, `'captions-editor'`, `'recorder'`, `'media-manager'`, `'genie'`, `'content-lab'`, `'agents-widget'`, `'vod-avatar'` | USER KS (type=0) with only the privileges that widget needs |
| `'avatar'` | KS that selects the avatar agent (see [migration-0.3.md](../migration-0.3.md)) |

```ts
setKsProvider(widget => (widget === 'analytics' ? session.adminKs : session.userKs));
```

`session` here is whatever your host already fetched from its server. The provider runs in the browser, so both KS values are minted on the server.

## When the KS expires

A component calls the provider when it mounts and when its scope changes. It never calls it to renew. It does not know when the KS expires. After the expiry, Kaltura rejects the calls the widget makes with that KS. The widget shows its own Kaltura message, or plays no protected media. This package shows no error for it.

A chat can outlast a short KS. To renew, mint a new KS before the old one expires and remount the surface. The provider then runs again and returns the new KS.

```tsx
import { useEffect, useState } from 'react';
import { A2uiSurface } from '@a2ui/react/v0_9';

function Surface({ surface, refreshKs }: { surface: Parameters<typeof A2uiSurface>[0]['surface']; refreshKs: () => Promise<void> }) {
  const [epoch, setEpoch] = useState(0);
  useEffect(() => {
    const timer = setInterval(async () => {
      await refreshKs(); // fetch a new KS from your server into what setKsProvider returns
      setEpoch(n => n + 1); // a new key remounts the surface
    }, 50 * 60 * 1000); // KS lives 1 hour
    return () => clearInterval(timer);
  }, [refreshKs]);
  return <A2uiSurface key={epoch} surface={surface} />;
}
```

The surface keeps its components and data model, because they live in the `MessageProcessor`. A remount restarts the widgets, so a playing video or a running recording stops. Remount between turns, not in the middle of a recording. A plain-HTML host removes the element and adds it again.

## Keep the KS out of the A2UI data model

> [!WARNING]
> Do not put the KS in the A2UI data model. The agent can read the data model and can wire its values into other components, so a KS there is not protected. Use `setKsProvider`.
