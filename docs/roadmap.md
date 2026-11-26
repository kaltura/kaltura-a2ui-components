# Roadmap

Where the project goes after 0.8.0. Each item waits for an upstream change. Details and reasons are in [the 1.0 plan](plan-a2ui-1.0-upgrade.md#follow-ups).

| # | Work | Waits for |
|---|---|---|
| F1 | Add the `@child`, `@action` and `@functionCall` envelope keys. The `@accessibility`, `@metadata`, `@checks` and `@catalogId` keys are done (catalog id `v4`, [ADR 0012](adr/0012-catalog-versioning.md)) | A `@a2ui/web_core` release that accepts them. They are in open PRs #4170 and #4171. The pin test `test/conformance/envelope-keys.test.ts` fails on that bump |
| F2 | Move to `accessibilityRef` and `validationErrorsRef`. Stop using `element.context`. Retest the light-DOM guard styles | The upstream HEAD changes in a release |
| F4 | Remove the SSR `HTMLElement` stub ([ADR 0007](adr/0007-ssr-html-element-stub.md)) | Ready once `@a2ui/react` 0.16 is the minimum peer: CONF-17 shows it imports in Node alone. The stub is tied into the release hashes, stamping and CDN checks, so remove it in its own change |
