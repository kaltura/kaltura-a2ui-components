# Architecture decision records

Short records of decisions that affect security or the public contract. One file per decision, named `NNNN-short-title.md`.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-server-url-allowlist.md) | `serverUrl` allowlist | accepted |
| [0002](0002-ks-handling.md) | KS handling | accepted |
| [0003](0003-peer-dependencies.md) | Peer dependencies | accepted |
| [0004](0004-npm-first-distribution.md) | Distribution: jsDelivr from git tags, no npm | accepted |
| [0005](0005-analytics-and-recorder-integration.md) | Analytics and recorder integration | proposed |
| [0006](0006-catalog-generation.md) | Catalog generation | accepted |

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
