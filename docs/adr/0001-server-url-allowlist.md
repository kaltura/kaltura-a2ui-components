# 0001. `serverUrl` allowlist

Status: accepted (2026-10-12)

Test ID: SEC-01. Code: `src/core/unisphere-loader.ts`.

## Context

- Unisphere widgets (Media Manager, Genie, Content Lab, Agents, VOD Avatar) call `import()` on a loader module at `<serverUrl>/v1/loader/index.esm.js`.
- `serverUrl` is a prop, so an agent can set it. The imported module runs with the page origin. Its error text would reach the UI.
- The Unisphere guide documents one host per region: `https://unisphere.{nvp1,irp2,frp2,cap2,syp2}.ovp.kaltura.com`. `sgp2` has no Unisphere host, so a Unisphere widget in `sgp2` refuses to load. Sources: https://kaltura.md/KALTURA_API_GETTING_STARTED/ (section 4) and https://kaltura.md/KALTURA_UNISPHERE_FRAMEWORK_API/.
- Private cloud and on-prem installs have their own, account-specific hosts.

## Decision

- `serverUrl` is parsed with `new URL`. Its origin must be a built-in origin (`https://unisphere.<region>.ovp.kaltura.com` for each region code), an origin the host added with `setExtraAllowedOrigins`, or the `unisphere` origin of an environment the host registered with `setEnvironments`. The text must be the origin, optionally followed by `/`, `/v1` or `/v1/`.
- The loader URL is always rebuilt from the origin as `/v1/loader/index.esm.js`. The check runs before any `import()`, and there is one `import()` site.
- Userinfo, ports, query strings, other schemes and look-alike hosts fail. A failure shows a fixed message and the value is never echoed in the UI.
- Only the host can extend the list. `setExtraAllowedOrigins` takes `https:` origins only. `setEnvironments` takes `https:` origins, and `http:` for localhost and private IPs. Agent props cannot reach either.

## Consequences

- A hostile `serverUrl` cannot load foreign code.
- Private cloud hosts need one call at start-up ([host-integration.md](../host-integration.md#unisphere-origins)).
- A new Kaltura region needs a code change and a release. This is on purpose.
- The host still trusts every origin it adds: that module runs with the page origin.
