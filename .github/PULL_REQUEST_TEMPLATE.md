## What and why

<!-- One or two sentences. Link the issue or finding ID. -->

## Checks

- [ ] `npm run check` passes (types, lint, unit tests)
- [ ] Tests added or updated for the change, titled `ID: behaviour`
- [ ] Docs updated if behaviour changed
- [ ] PR title says what changed for users. It becomes a line in the Release notes
- [ ] Public API change: snapshot updated (`UPDATE_API_SNAPSHOT=1`) and a migration note added
- [ ] Props change: `npm run gen:catalog` is clean
- [ ] Changed a component or the bundle: `npm run build`, `npm run e2e` and `npm run check:examples` pass

## Security checklist

See [CONTRIBUTING.md](../CONTRIBUTING.md#security-checklist). Agent output is untrusted input.

- [ ] Every new prop has a zod rule, and a hostile value shows a plain-text error
- [ ] No `innerHTML`, `dangerouslySetInnerHTML`, `srcdoc`, `eval` or other raw HTML sinks added
- [ ] Remote code loads only through the Unisphere loader, behind the `serverUrl` allowlist
- [ ] URLs built from props encode their values and start from a fixed Kaltura host
- [ ] The Kaltura session (KS) never appears in agent props, messages, logs or error text
- [ ] Error text holds no prop value and no remote error text
- [ ] New host options are functions the host calls, never props an agent can set
- [ ] No exploit detail in the diff, tests or description (use a private advisory)
