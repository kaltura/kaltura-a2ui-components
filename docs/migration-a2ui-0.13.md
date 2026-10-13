# Move to the A2UI 0.13 peers

The release after 0.2.0 needs `@a2ui/react` and `@a2ui/web_core` 0.13. The script-tag bundle (`kaltura-wc.js`) has no peers and needs no change.

## Checklist

| # | Who | Do | Why |
|---|---|---|---|
| 1 | ESM users | `npm i @a2ui/react@^0.13.0 @a2ui/web_core@^0.13.0` with the new tag | The peers are `^0.13.0`. 0.11 stops the install with `ERESOLVE` |
| 2 | Code that imports `basicCatalog` | Import it from `@a2ui/web_core/v0_9/basic_catalog` | `@a2ui/react/v0_9` no longer has it |
| 3 | Code that calls `new Catalog(...)` | Pass the protocol version second: `new Catalog(id, 'v0.9', components, functions)` | 0.12 changed the constructor |
| 4 | Node imports (SSR, tests) | Import `@kaltura/a2ui-react` before `@a2ui/react` | [Server imports](host-integration.md#server-imports-ssr) |
| 5 | CSS or tests that select basic component markup | Check your selectors | Basic components are custom elements, and every component sits in an `<a2ui-react-<name>>` element |
| 6 | Agents that call `add`, `equals` and other math or compare functions | Register your own functions | The v0.9 basic catalog dropped them |
| 7 | Everyone with a `dompurify` override | Keep it | `@a2ui/markdown-it` 0.2.1 still pins 3.4.11 |

The guarded basic Image, Video, AudioPlayer and Text render as `kaltura-a2ui-image`, `kaltura-a2ui-video`, `kaltura-a2ui-audioplayer` and `kaltura-a2ui-basic-text`. Their checks are the same as in 0.2.0: `url` must be `https` on Kaltura or an origin from `setExtraMediaOrigins`, and a URL with a KS is refused ([host-api.md](host-api.md#basic-media-urls)). The Kaltura catalog also replaces `openUrl`: it opens only absolute `https:` URLs. Upstream details: the `@a2ui/react` and `@a2ui/web_core` CHANGELOGs for 0.12.0 and 0.13.0.
