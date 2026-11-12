# Roadmap

Where the project goes after 0.7.0. Each item waits for an upstream change. Details and reasons are in [the 1.0 plan](plan-a2ui-1.0-upgrade.md#follow-ups).

| # | Work | Waits for |
|---|---|---|
| F1 | Use the `@accessibility`, `@metadata`, `@checks` and `@catalogId` envelope keys. Add `@child`, `@action` and `@functionCall` | A `@a2ui/web_core` release that accepts them. The pin test `test/conformance/envelope-keys.test.ts` fails on that bump. Upstream `main` (checked 2026-11-12, `web_core` still versioned 0.15.0) already uses the `@` keys, so its example schema rejects our bare `accessibility`. The released 0.15.0 rejects `@accessibility`, so one cannot be moved without the other. `@child`, `@action` and `@functionCall` are in open PRs #4170 and #4171 |
| F2 | Move to `accessibilityRef` and `validationErrorsRef`. Stop using `element.context`. Retest the light-DOM guard styles | The upstream HEAD changes in a release |
| F3 | Drop the `markdown-it` override | The `@a2ui/markdown-it` peer range accepts the current `web_core` |
| F4 | Remove the SSR `HTMLElement` stub ([ADR 0007](adr/0007-ssr-html-element-stub.md)) | Upstream issue #3158 fixed. `check:consumer` shows when |
