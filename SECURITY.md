# Security policy

## Supported versions

| Version | Supported |
|---|---|
| Latest minor release | Yes |
| Older releases | No |

## Report a vulnerability

Use GitHub private vulnerability reporting for this repository: open the **Security** tab and choose **Report a vulnerability**.

Do not open public issues, pull requests or discussions for vulnerabilities.

Reports are handled on a best-effort basis. There is no fixed response or fix time.

## Trust model

- Agent output is untrusted input. Every A2UI message and every prop value can be hostile.
- The host application owns the Kaltura Session (`ks`). Pass a scoped, short-lived value from your own code, never a literal from agent output.
- The host owns the `serverUrl` allowlist. Agent output must never add an origin to it.
- Iframes (Player, Captions Studio, Recorder, Analytics) load Kaltura-hosted pages. They run with the trust level of the Kaltura service, not of the agent.
- Unisphere widgets and the Media Manager load Kaltura-hosted code into the page origin. Only allow origins you trust to run code in your page.
- CSP recommendation: see `docs/host-integration.md` (to be written).
