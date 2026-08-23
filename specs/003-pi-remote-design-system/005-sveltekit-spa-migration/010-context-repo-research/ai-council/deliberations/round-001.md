---
title: "AI Council round 1 deliberation — verification of the five-repo recommendation set"
description: "Round 1 comparison and synthesis: three seats verified every inherited recommendation against the shipped relay, protocol and client. Records the scoring, the agreements, the one refuted hypothesis, and the convergence decision to run a second round."
trigger_phrases:
  - "council round 1 deliberation"
importance_tier: "supporting"
contextType: "research"
---

# Round 1 deliberation

## Composition

| Seat | Lens | Vantage | Mandate |
|---|---|---|---|
| seat-000 | analytical | native adjudicator | Independent client + program-context baseline, gathered before seats returned |
| seat-001 | analytical | native dispatch | Relay server + wire contract: replay, ordering, reconnect |
| seat-002 | critical | native dispatch | Posture, authority, redaction, fail-closed |
| seat-003 | holistic | native dispatch | Transcript, composer, disclosure, failure copy |

## Seat comparison

| Dimension | Weight | seat-001 protocol | seat-002 security | seat-003 mobile-ux |
|---|---|---|---|---|
| Correctness | 30% | 30 | 30 | 26 |
| Completeness | 20% | 20 | 20 | 18 |
| Elegance | 15% | 13 | 14 | 13 |
| Robustness | 20% | 20 | 20 | 16 |
| Integration | 15% | 14 | 15 | 14 |
| Pre-critique total | 100% | 97 | 99 | 87 |
| Post-critique adjustment | ±10 | −3 | 0 | −4 |
| **Final** | | **94** | **99** | **83** |

Adjustments: seat-001 lost 3 for advancing a client loss window as its closing headline without
tracing the teardown path (refuted below). seat-003 lost 4 for stating the abort gap without
weighing the Steer path that the protocol documents as interrupting, and for scoring one
already-satisfied item as a corroboration rather than checking whether the control it named
(voice) exists at all.

## Agreements across seats

1. **The five repos' single strongest recommendation is already implemented, better.** seat-001 and
   seat-000 independently concluded that R-01's reconnect contract is satisfied — server-side by
   register-before-snapshot plus an initializing queue (`sync.ts:78`, `:99-101`, `:85-90`),
   client-side by a gap reducer that clears and refuses deltas until an authoritative snapshot
   (`state.ts:331`, `:357-370`).
2. **Several recommendations do not survive translation from a native platform.** All three seats
   independently rejected items whose premise is a transport or platform event this architecture
   abstracts away: PTY tail classification, chunk-safe think-tag parsing, per-part delta throttling,
   the 300 ms keyboard-settle timer, client filename sanitization.
3. **Two seats found the same defect by different routes.** seat-001 (N-3, from the transport side)
   and seat-002 (H6-2, from the authority side) both landed on the missing WebSocket heartbeat.
   Independent arrival from opposite directions is the strongest signal in this round.
4. **A recommendation that already exists under another name must not be re-proposed.** seat-002
   made this the explicit test and applied it to R-05's structured-grant half, which ships as the
   accept-edits grant.

## Disagreements and how they were resolved

**Severity of the abort gap (seat-003 H6-1 vs the adjudicator).** seat-003 rated "you cannot stop a
running turn once you have typed anything" as the highest-consequence gap in the app. The
adjudicator read the surrounding branch: at `SessionComposer.svelte:738` the primary disc becomes
Steer when running, and `packages/pi-rpc-protocol/src/types.ts:204` documents `'steer'` as
interrupting the turn. The user therefore *can* interrupt while a draft exists. The accurate,
narrower gap is that they cannot abort **without sending text**, and the behaviour is deliberate
(`SessionComposer.svelte:247-249`). Downgraded, carried into round 2 for the skeptic to attack.

**Diagnosis of the disclosure bug (seat-003 vs the inherited claim).** The inherited recommendation
blamed key churn at finalization. seat-003 showed that hazard is structurally absent — the block id
comes from the protocol and does not change (`transcript-helpers.ts:48`) — and located the real
cause in virtualization windowing. The prescription survives; the reasoning behind it was wrong.
This is the clearest case in the sweep of a correct fix proposed for an incorrect reason.

## Refuted hypothesis

seat-001 closed by flagging, as INFERRED, the only place it believed bytes could still be lost:
`useSyncSocket.svelte.ts:217` advances `cursor` on message receipt while application happens in a
later `requestAnimationFrame`, so a close with `pendingMessages` non-empty would leave the cursor
claiming coverage the reducer never applied.

The adjudicator traced it and **it does not reproduce.** The teardown at `:261-268` cancels the
frame and clears `pendingMessages`, and on the next effect entry `cursor` is reassigned — either
from the cache at `:140` or to `null` at `:142`. The cache cannot lead the applied state, because
`saveCache` writes `coversThrough: current.coversThrough` from the reducer's `TranscriptState`
(`cache.ts:155-164`), not from the socket cursor. The socket-close-without-teardown path at `:241`
reuses the advanced cursor but retains `pendingMessages`, so the unapplied envelopes are still
applied in order when the frame resumes.

Had this been taken on faith it would have entered the synthesis as a P0. It is recorded here
because the discipline that caught it — treat every inherited finding as a hypothesis — is the same
discipline that this whole council was convened to apply to the prior document.

## Convergence decision

Not converged. Round 1 produced nine defects that no research document surfaced, three of which
change the shape of the recommendation set. Two mandated lenses had not yet run. Proceed to round 2
with the skeptic (argue items down, blast radius versus payoff) and the verification reviewer (what
test catches each item regressing, and is it visible to any existing gate).
