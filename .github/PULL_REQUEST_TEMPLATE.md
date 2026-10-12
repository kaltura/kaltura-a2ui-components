## What and why

<!-- One or two sentences. Link the issue or finding ID. -->

## Checks

- [ ] `npm run check` passes (types, lint, unit tests)
- [ ] Tests added or updated for the change
- [ ] Docs updated if behaviour changed

## Security checklist

- [ ] Agent output is treated as untrusted (validated, never trusted by shape)
- [ ] No `innerHTML` or other raw HTML sinks added
- [ ] Any `serverUrl` use goes through the allowlist
- [ ] The Kaltura session (KS) never appears in agent props, messages or logs
