# Architecture decision records

Short records of decisions that affect security or the public contract. One file per decision, named `NNNN-short-title.md`.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-server-url-allowlist.md) | `serverUrl` allowlist | accepted |
| [0002](0002-ks-handling.md) | KS handling | accepted |
| [0003](0003-peer-dependencies.md) | Peer dependencies | accepted |
| [0004](0004-git-tag-distribution.md) | Distribution: jsDelivr from git tags, no npm | accepted, live since v0.2.0 |
| [0005](0005-analytics-and-recorder-integration.md) | Analytics and recorder integration | accepted |
| [0006](0006-catalog-generation.md) | Catalog generation | accepted |
| [0007](0007-ssr-html-element-stub.md) | HTMLElement stub for Node imports (a2ui#3158) | accepted |
| [0008](0008-in-page-player-and-captions-editor.md) | In-page Player and Captions editor | accepted |
| [0009](0009-per-instance-ks-scope.md) | Per-instance KS scope | accepted (Phase 1 implemented) |

## Template

```md
# NNNN. Title

Status: proposed | accepted | superseded by NNNN

## Context
What forces the decision. Facts only.

## Decision
What we do, in one or two sentences.

## Consequences
What gets easier, what gets harder, what to watch.
```
