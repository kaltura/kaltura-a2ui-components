# Kaltura Session (KS) handling

The host owns the KS. The agent never sees it, writes it or asks for it.

## Model

| Step | What happens |
|---|---|
| 1 | Your server mints a KS for the signed-in user. |
| 2 | The host page registers a provider with `setKsProvider`. |
| 3 | A component that needs a KS calls the provider once, when it mounts, with its widget name. |
| 4 | The component checks the value with the ks rule: a non-empty string with no control characters. |

- **Order.** A non-empty provider result wins. If the provider returns `undefined` or `''`, or no provider is set, the component uses its `ks` prop. The prop exists only for older hosts.
- **Async.** The component renders nothing until the provider's promise settles.
- **Errors.** An invalid value, a throw or a rejected promise shows `Failed to load <widget>: Invalid ks`. The value and the error are never shown or logged.
- **Components.** Player, Media Manager, Analytics, Captions Editor, Recorder, Genie, Content Lab, Agents Widget, VOD Avatar and Avatar use the provider. Flashcards still reads only its `ks` prop.
- **No KS.** The player loads without one (public entries). The other widgets in the list above render nothing until a KS arrives. A web component gets no later config, so there they show `Failed to load <widget>: Invalid ks` instead.
- **Renewal.** Components do not renew a KS. To use a new KS, remount the component.

## Wire it

Set the provider before the components mount.

React host:

```ts
import { setKsProvider, type KsWidget } from '@kaltura/a2ui-react';

setKsProvider(async (widget: KsWidget) => {
  const res = await fetch(`/api/kaltura-session?widget=${widget}`, { credentials: 'same-origin' });
  return res.ok ? (await res.json()).ks : undefined;
});
```

A provider with no argument, such as `() => ks`, still works.

Plain-HTML host: the bundle exposes the same function as `KalturaA2UIWebComponents.setKsProvider`. Call it in a script right after the bundle `<script>` and before the Kaltura elements in the page.

## What to put in a KS

Follow the Kaltura Session Guide:

- Mint the KS on your server. Prefer AppTokens (`appToken.startSession`). Admin secrets never leave the server.
- Use a USER KS (type=0).
- Keep the expiry short, for example 1 hour.
- Grant least privilege. For playback: `setrole:PLAYBACK_BASE_ROLE`, `sview:<entryId>`, `privacycontext`, `appid`. Add `iprestrict` or `actionslimit` where you can.
- Give each widget only what its guide lists, for example Genie `setrole:PLAYBACK_BASE_ROLE` and Express Recorder `editadmintags:*`.
- The recorder KS needs `editadmintags:*`. The Express Recorder script runs in your page, so the KS is visible to the page's JavaScript and to any other script on that page. Keep its expiry short and mint it for one user.
- Analytics is the exception: its guide requires an ADMIN KS (type=2). Mint it on the server with a short expiry and narrow it with `setrole` and `iprestrict`.

## One KS per widget

The provider gets the widget name (`KsWidget`), so each widget can get its own least-privilege KS:

| `widget` | KS |
|---|---|
| `'analytics'` | ADMIN KS (type=2), short expiry |
| `'player'`, `'captions-editor'`, `'recorder'`, `'media-manager'`, `'genie'`, `'content-lab'`, `'agents-widget'`, `'vod-avatar'` | USER KS (type=0) with only the privileges that widget needs |
| `'avatar'` | KS that selects the avatar agent, from the provider only (see [migration-0.3.md](../migration-0.3.md)) |

```ts
setKsProvider(widget => (widget === 'analytics' ? session.adminKs : session.userKs));
```

`session` here is whatever your host already fetched from its server. The provider runs in the browser, so both KS values are minted on the server.

## Keep the KS out of the A2UI data model

> [!WARNING]
> Do not put the KS in the A2UI data model, and do not bind `ks` to a data model path. The agent can read the data model and can wire its values into other components, so a KS there is not protected. Use `setKsProvider`.
