---
title: Deep Research Dashboard - Orca UX Mining / Luna
description: Final status dashboard for the detached research lineage.
contextType: status
version: 1.0.0
---

# Deep Research Dashboard - Orca UX Mining / Luna

## Status

- **Status:** complete
- **Stop reason:** `maxIterationsReached`
- **Iterations:** 20 / 20
- **Convergence threshold:** 0.05
- **Convergence policy:** telemetry only under `stopPolicy=max-iterations`; synthesis was not triggered early
- **Questions:** 5 / 5 answered
- **Artifact boundary:** `specs/007-orca-ux-mining/research/lineages/luna`
- **Executor:** `cli-codex model=gpt-5.6-luna`

## Iteration table

| Iteration | Focus | New-info ratio | Findings | Status |
|---:|---|---:|---:|---|
| 1 | Mobile history cards, peek, resume, search | 0.92 | 6 | complete |
| 2 | Resume slot, worktree list, pin overlay | 0.88 | 2 | complete |
| 3 | Attention-first ordering and filters | 0.84 | 2 | complete |
| 4 | Agent state identity and disclosure | 0.80 | 2 | complete |
| 5 | Host-scanned card DTO and filters | 0.76 | 2 | complete |
| 6 | Message copy, scroll, tool fold | 0.86 | 2 | complete |
| 7 | Context-menu scope and action boundaries | 0.74 | 2 | complete |
| 8 | Pending image chips and image-only send | 0.82 | 2 | complete |
| 9 | Image/text paste and async fencing | 0.70 | 2 | complete |
| 10 | Dictation and per-session drafts | 0.78 | 2 | complete |
| 11 | File/command autocomplete | 0.72 | 2 | complete |
| 12 | Prompt history and session options | 0.68 | 2 | complete |
| 13 | Incremental streaming assembly | 0.83 | 2 | complete |
| 14 | Optimistic echo reconciliation | 0.79 | 2 | complete |
| 15 | Ask cards and Stop outcomes | 0.75 | 2 | complete |
| 16 | Route identity and active-tab transitions | 0.68 | 2 | complete |
| 17 | Refresh, freshness, and placeholders | 0.62 | 2 | complete |
| 18 | Rich messages and authorized file links | 0.57 | 2 | complete |
| 19 | Contract tests and host-field priority | 0.49 | 2 | complete |
| 20 | Final rescan and negative knowledge | 0.34 | 2 | complete |

## Question status

| Question | Result |
|---|---|
| Session selection | Host-scanned card projection, attention ordering, local deterministic filters, bounded peek, refresh, and exact-id navigation. |
| Message UX | Copy, scroll-to-turn, role-aware rows, tool folding, and scoped presentation are portable; mutation actions lack evidence. |
| Composer | Attachments, paste, drafts, dictation state, autocomplete, prompt history, and serialized options are portable as scoped flows. |
| Streaming/control | Rebuild fallback, reconciliation, ask evidence, and accepted/rejected/unconfirmed outcomes preserve trust. |
| Portability | Optional card/attention/artifact/follow fields require host contract; client authority ideas are not portable. |

## Convergence trend

The new-information ratio decreased as the run moved from discovery to boundary auditing: 0.92 at iteration 1, 0.75 at iteration 15, 0.57 at iteration 18, 0.49 at iteration 19, and 0.34 at iteration 20. This trend is recorded as telemetry. The configured max-iterations policy required all 20 passes, so no early synthesis occurred.

## Portability summary

- Drop-in view affordance: 19 consolidated promoted findings.
- Needs a new host field: 5 consolidated findings, primarily title/preview/attention, ask evidence, follow intent, and artifact references.
- Not portable as-is: client-owned mutable metadata, arbitrary file opening, hostless permission/capability actions, and unsupported message mutation semantics; these are explicit exclusions rather than promoted findings.

## Dead ends and negative knowledge

- Do not derive title/preview/project identity from opaque ids, paths, or local transcript mining.
- Do not treat cached or refreshed data as live authority.
- Do not make skeletons, stale cards, or unknown capabilities actionable.
- Do not infer regenerate/edit/reply/reactions, speech RPC, pin/unread persistence, or arbitrary file routes from adjacent Orca features.

## Blocked stops

None. No timeout, stuck, or unrecoverable execution state occurred. The normal external executor/continuity and packet validation paths were intentionally skipped because the detached lineage's write boundary forbade writes outside this directory.

## Next focus

No further research iteration remains. The next work belongs to implementation planning and host-contract design, using `research.md` and the explicit field/portability matrix as inputs.
