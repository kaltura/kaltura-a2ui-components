# Move to the A2UI 0.14 peers

This release needs `@a2ui/react` and `@a2ui/web_core` 0.14. The script-tag bundle (`kaltura-wc.js`) has no peers and needs no change.

## Checklist

| # | Who | Do | Why |
|---|---|---|---|
| 1 | ESM users | `npm i @a2ui/react@^0.14.0 @a2ui/web_core@^0.14.0` with the new tag | The peers are `^0.14.0`. 0.13 stops the install with `ERESOLVE` |
| 2 | Hosts that pin `@a2ui/markdown-it@0.2.1` | Remove the pin | 0.2.2 matches `@a2ui/web_core` 0.14 |
| 3 | CSS or tests that select basic component markup | Check your selectors | Basic components use `a2ui-` prefixed class names, such as `a2ui-error-message` |
| 4 | Code that implements `CatalogInterface` | Add `toJson()` and `validationSchema` | `@a2ui/web_core` 0.14 requires both |
| 5 | Everyone with a `dompurify` override | Keep it | `@a2ui/markdown-it` 0.2.2 still pins 3.4.11 |

Node imports still need `@kaltura/a2ui-react` before `@a2ui/react` ([server imports](host-integration.md#server-imports-ssr)). `@a2ui/react` 0.14.0 still fails in Node without it.

The Kaltura catalog and its props are unchanged. Upstream details: the `@a2ui/react` and `@a2ui/web_core` CHANGELOGs for 0.14.0.
