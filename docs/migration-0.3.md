# Migrate from 0.2.x to 0.3.0

0.3.0 changes `KalturaAvatar` (`<kaltura-avatar>`). It now runs on the Unisphere embeds API (`genieAvatar`) instead of the old avatar web SDK script. Its props are new. The full list is in [GitHub Releases](https://github.com/kaltura/kaltura-a2ui-components/releases).

## Checklist

| # | Who | Do | Why |
|---|---|---|---|
| 1 | Hosts with an avatar | Return a KS for the `avatar` widget from `setKsProvider` | The avatar takes its KS from the provider only. The KS picks the agent. With no KS it does not load |
| 2 | Hosts with an avatar | Send `partnerId` and `serverUrl`. Drop `avatarId`, `projectId`, `language` and `allowInterrupt` | See [Props](#props) |
| 3 | Hosts with a CSP | Remove `https://static.avatar.us.kaltura.ai` from `script-src`. Add the avatar API host to `connect-src` | See [CSP](#csp) |
| 4 | Hosts that read avatar state | Use `setEventHandler` for `avatar-disconnected` | See [Events](#events) |

## Props

| 0.2 | 0.3 | Notes |
|---|---|---|
| `avatarId` | removed | The KS from your provider selects the agent |
| `projectId` | removed | Same |
| `language` | removed | Not in the embeds API |
| `allowInterrupt` | removed | Not in the embeds API |
| `autoStart` | `autoConnect` | Boolean. Default `false` |
| none | `partnerId` | Required. Positive integer |
| none | `serverUrl` | Required. A Unisphere origin from the allowlist, e.g. `https://unisphere.nvp1.ovp.kaltura.com/v1`. The region in it picks the avatar region |
| none | `openingPhrase` | Optional. Up to 500 characters |
| none | `captions` | Optional boolean |
| none | `theme` | Optional: `light`, `dark` or `studio`. Default: `light` when the page has `data-theme="light"`, else `dark` |

A `ks` prop is ignored. Other props are dropped.

Before:

```json
{ "id": "a", "component": "KalturaAvatar", "avatarId": "av-1", "autoStart": true }
```

After:

```json
{ "id": "a", "component": "KalturaAvatar", "partnerId": 1234567, "serverUrl": "https://unisphere.nvp1.ovp.kaltura.com/v1", "autoConnect": true }
```

```ts
setKsProvider(widget => (widget === 'avatar' ? avatarKs : userKs));
```

## CSP

The avatar now loads through the Unisphere loader, which `script-src` already lists. The old SDK host is no longer contacted. A live session calls the avatar API host: add it to `connect-src` (`https://api.avatar.us.kaltura.ai` in the US). Policy: [host-integration.md](host-integration.md#content-security-policy).

## Events

```ts
setEventHandler(event => {
  if (event.type === 'avatar-disconnected') showEnded(event.detail.reason);
});
```

`detail` is `{ reason, instanceId }`. `reason` is a name such as `ConversationEnded`, or `UnknownReason`. Details: [host-api.md](host-api.md#events).
