---
title: "AI Council report — final cross-repo synthesis"
description: "The council's final output pointer and ranked set. The full recommendation document lives at the packet root as final-synthesis.md; this file records composition, comparison, convergence status and the ranked result so the council artifact set is complete."
trigger_phrases:
  - "council report context research"
importance_tier: "important"
contextType: "research"
---

# Council report

**The synthesized plan is `../final-synthesis.md`.** It is written for the operator and lives at the
packet root beside `recommendations.md`, which it supersedes. This file records the council's own
result so the artifact set is complete; it does not restate the plan.

**Status: AWAITING OPERATOR DECISION. Nothing has been scaffolded.**

## Composition

Five mandated lenses across two dispatch rounds plus adjudication. All seats were native dispatches
with independent file evidence; no external AI system participated and no vantage was simulated.

| Round | Seat | Lens | Final score |
|---|---|---|---|
| 0 | adjudicator baseline | analytical | — |
| 1 | protocol | analytical | 94 |
| 1 | security | critical | 99 |
| 1 | mobile-ux | holistic | 83 |
| 2 | skeptic | pragmatic | 97 |
| 2 | verification | research | 96 |

## Result

Eleven items, from seventeen Round 1 candidates and thirteen in the prior document. Six killed, four
narrowed, one upgraded, five defects added that no research document surfaced. Four items in common
with `recommendations.md`.

| # | Item | Lane | When |
|---|---|---|---|
| S-01 | Register `supervisor.onError`; allocate sequences from the store | relay | now, first |
| S-02 | Foreground-gate the two approval mutations; fix the prompt asymmetry | relay | now |
| S-03 | Send `Retry-After` on every 429 | relay | now, with S-02 |
| S-04 | Server heartbeat with an injectable interval | relay | now |
| S-05 | One name for "foreground" | relay | now |
| S-06 | Rotate the sync epoch on host restart, with GC and map bounds | relay | now-ish |
| S-07 | Close-code classification | client | before 012 |
| S-08 | Hoist disclosure state out of the row | client | after 012 |
| S-09 | Differentiate the blanket grant; model repairability | client / 011 | after 012 |
| S-10 | Distinguish "working" from "stalled" | client / 011 | after 012, with S-08 |
| S-11 | Repair the test lanes | infra | before S-07 |

## Rejected alternatives

The `pi.*` envelope re-taxonomy, a client runtime contiguity branch, a live epoch-gap broadcast
guard, a custom `$effect` lint rule, a relay-side approval risk classifier, and a hard abort while a
draft exists. Reasons and evidence in `../final-synthesis.md` §6.

## Confidence

**Overall 88%.** Every recommendation carries `file:line` from this repo, and the four load-bearing
conclusions were verified independently by the adjudicator after the seat reported them. Confidence
is held below 95% by three things: two of the nine gates are not programs, so some claims about
enforcement rest on prose; the incidence of two failure modes (mid-session host restart, connection-slot
lockout) is unknown and is the main input to their priority; and real-device behaviour for two items
cannot be reproduced by any harness in this repo.

**Consensus quality: strong.** The two Round 2 seats, pointed at different questions, did not
contradict each other once, and each independently reached the same top item and the same sequencing.

**Risk level: low.** Six of eleven items are relay-side, additive, and touch no contract. The two
largest asks in the source material were both declined.

## Convergence

Round 1: not converged — nine new defects, two mandated lenses unrun. Round 2: converged under the
two-of-three-agree rule; every landed attack removed, narrowed or preconditioned an item rather than
contradicting the plan's direction. Three disagreements survive and are recorded in
`../final-synthesis.md` §7 and `deliberation.md`.

## Boundary

No file outside `010-context-repo-research/` was modified. `specs/context/**` was read only. No phase
folder, plan edit, or task was created.
