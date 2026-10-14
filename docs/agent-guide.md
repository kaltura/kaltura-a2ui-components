# Agent guide

The agent writes A2UI JSON and [your page renders it](../README.md#quick-start).

## 1. Give the model the catalog

- By URL: `https://cdn.jsdelivr.net/gh/kaltura/kaltura-a2ui-components@<tag>/src/catalog/kaltura_catalog.json` (`<tag>` is the tag you pinned).
- Inline, for agents that accept it: `processor.getRendererCapabilities({ versions: ['v0.9'], includeInlineCatalogs: true })` ([host-api](host-api.md#capability-negotiation)).

The full catalog is large. Send only the components you use: delete the other keys under `components` and their `$ref` lines in `$defs.anyComponent.oneOf`.

## 2. The smallest valid sequence

A surface needs one component with the id `root`. Props for each component: [components.md](components.md).

```json
[
  { "version": "v0.9", "createSurface": { "surfaceId": "s1", "catalogId": "https://kaltura.github.io/a2ui/v2/catalog.json" } },
  { "version": "v0.9", "updateComponents": { "surfaceId": "s1", "components": [
    { "id": "root", "component": "KalturaPlayer", "partnerId": 1234567, "uiconfId": 7654321, "entryId": "1_abc12345" } ] } }
]
```

## 3. One config for the prompt and the limits

```ts
import { setAllowedPartners, setAllowedUiconfs } from '@kaltura/a2ui-react';
const host = { partnerIds: [1234567], uiconfIds: [7654321], entryIds: ['1_abc12345'] };
setAllowedPartners(host.partnerIds); // the package refuses other ids
setAllowedUiconfs(host.uiconfIds);
const systemPrompt = `
Show Kaltura media with A2UI v0.9 messages: createSurface, then updateComponents.
- Use a catalogId from the client's supportedCatalogIds.
- One component must have the id "root".
- There is no ks prop. The page supplies the Kaltura Session.
- Use only these partnerId values: ${host.partnerIds.join(', ')}.
- Use only these uiconfId values: ${host.uiconfIds.join(', ')}.
- Use only these entryId values: ${host.entryIds.join(', ')}.
- partnerId and uiconfId are integers, not strings.
- Leave out serverUrl. The page uses the Unisphere host of its region.
- Add "action": { "event": { "name": "kalturaFeedback" } } to each Kaltura component.
`;
```

One object feeds both, so they cannot drift apart. There is no entry allowlist: the prompt asks, and a narrow KS enforces ([ks-privileges](ks-privileges.md)).

## 4. Send errors and events back

```ts
const processor = new MessageProcessor<ReactCatalogComponent>([kalturaReactCatalog], (action) => agent.send(action));
setErrorHandler((error) => agent.send(toClientError(error)));
```

| Comes back | When | Agent should |
|---|---|---|
| Action `kalturaFeedback` | A component with an `action` has an error or event | Read `context.event` and `context.code` |
| Client `error` message | `setErrorHandler` runs | On code `invalid-props`, resend the component with fixed props |

Context fields: [host-api](host-api.md#agent-feedback). Common errors: [troubleshooting](troubleshooting.md).
