---
title: "AI Council round 2 deliberation — critique, convergence and the final set"
description: "Round 2 comparison and synthesis: the skeptic and verification lenses attacked Round 1's list, overturning three of its conclusions and one of the adjudicator's. Records the scoring, the convergence decision, and the eleven-item result."
trigger_phrases:
  - "council round 2 deliberation"
importance_tier: "supporting"
contextType: "research"
---

# Round 2 deliberation

## Composition

| Seat | Lens | Mandate |
|---|---|---|
| seat-004 | pragmatic | Argue items **down**; blast radius versus payoff at this deployment |
| seat-005 | research | What test catches each item regressing; is it visible to any of the nine gates |

Both received Round 1's findings as their attack surface.

## Seat comparison

| Dimension | Weight | seat-004 skeptic | seat-005 verification |
|---|---|---|---|
| Correctness | 30% | 30 | 29 |
| Completeness | 20% | 19 | 20 |
| Elegance | 15% | 15 | 14 |
| Robustness | 20% | 20 | 19 |
| Integration | 15% | 15 | 14 |
| Pre-critique total | 100% | 99 | 96 |
| Post-critique adjustment | ±10 | −2 | 0 |
| **Final** | | **97** | **96** |

seat-004 lost 2 for asserting the epoch-item comment was "not lying" in a way that reads as fully
exculpatory, when the comment does sit two lines above a handler that leaves the *transcript* epoch
alone — the ambiguity it identifies is real and is itself worth fixing.

## Cross-critique

The two seats did not contradict each other once, which is the strongest convergence signal in this
run given that they were pointed at different questions. Where they touched the same item they
reinforced:

- Both independently concluded the projection sequence desync is the top item, one by blast-radius
  reasoning and one by "the failure has no output, so nothing but a test can see it".
- Both independently concluded the client transport work must land before 012 rather than after,
  for different reasons — merge mechanics and harness cost.
- seat-005 found the `/api/prompt/submit` attachment-conditional foreground gate while mapping
  coverage; seat-004 independently narrowed the approval-route item by observing that one of the
  three is a read. Together they resized the same item from "three routes" to "two routes plus one
  asymmetry" — more accurate than either alone.

## Positions overturned

Four, all verified independently by the adjudicator before acceptance:

1. **The `pi.*` lane recommendation** — premise false; the event vocabulary is already pinned at a
   closed allowlist. An L-effort wire change plus a schema migration collapsed into three lines of an
   existing item.
2. **The client contiguity branch** — the store already refuses to persist a hole. Demoted to a test.
3. **The live epoch-gap guard** — unreachable branch.
4. **The lint rule** — the toolchain it assumes does not exist.

And one item moved the other way: `Retry-After` uniformity was upgraded from a footnote to a ranked
item, because the client consumer is already shipped and only the server is silent.

## Convergence decision

**Converged.** Both seats endorsed the same ordering; no new high-severity finding emerged from the
critique that the other seat contradicted; and the three surviving disagreements are all
operator-decidable rather than evidence-resolvable. Adjudication closed the four overturned positions
and wrote the final set.

Result: eleven items, from a Round 1 candidate list of seventeen. Six killed, four narrowed, one
upgraded. Four items in common with the prior document's thirteen.
