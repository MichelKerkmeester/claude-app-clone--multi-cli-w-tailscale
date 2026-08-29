---
title: "Child 017 implementation summary — ask-question activation"
description: "Continuity anchor. Nothing is implemented yet: this records the wiring gap, how it stayed invisible, and the one unknown that determines the packet's size."
trigger_phrases:
  - "ask question activation implementation summary"
  - "ask question activation packet"
  - "implementation summary"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/017-ask-question-activation"
    last_updated_at: "2026-08-24T17:58:13.883Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Service constructed and both ends wired; round-trip test red before green."
    next_safe_action: "Nothing outstanding; 018 no longer waits on this node."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 017 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `004-sveltekit-spa-migration` |
| Level | 2 |
| Status | **Shipped** |
| Requirements shipped | none yet; REQ-001 … REQ-007 all open |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Nothing. No relay source has been edited.

The gap, verified directly against the tree:

| Fact | State |
|---|---|
| Services defined under `app-relay/src/` | 8 |
| Services imported by `app-relay/src/index.ts` | 7 — every one except ask-question |
| Callers of the service's presenter outside its own file | 0 |
| Routes answering `503 ask_question_unavailable` | 3 |
| Client components, stories and protocol types shipped | full feature — a card, six sub-components, seven stories, a test |
| Supporting plumbing already aware of the feature | demux, projector, redaction, replay, supervisor, store, auth policy |

The client was ported correctly during the feature-directory work. The relay wiring never existed.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Trace, then wire. The construction is roughly a dozen lines; the producer path is the unknown that
determines whether this packet is small or large.

The executor writes `app-relay/src/**`. Claude verifies the round trip and owns git.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Nothing is turned on until the round trip is proven.** Making the routes stop answering unavailable
is the easy half and proves nothing — without a producer, the feature would go from an honest error to
a card that never arrives, which is a worse failure because it looks like it should work.

**The round-trip test is the deliverable, equally with the wiring.** The service already has unit
tests and they pass, against an instance the test constructs itself. That coverage shape is exactly
what let this survive, so more unit tests are not the answer; an integration assertion is.

**No client change.** The phone side is complete. If the round trip turns out to need one, that is a
finding to report rather than scope to absorb.

**Reviewed as a feature landing.** Every other packet in this queue preserves behaviour. This one
deliberately changes it, and a newly live surface deserves the attention that implies.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Producer path traced | not done |
| Round-trip test written | not written |
| Service constructed in `app-relay/src/index.ts` | not done |
| Both ends connected | not done |
| Backend suite (`npm test`, four real dirs) | baseline not captured |
| `validate.sh --strict` via realpath | not run |

No completion claim is made or implied.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

**The packet's size is not yet known.** If no host event raises a question today, the scope extends to
the host side and this stops being a wiring packet. That is the first task precisely so it is
discovered before work starts rather than midway.

**Existing tests may not survive real wiring.** They have only ever exercised a hand-constructed
instance, so some of their assumptions may not hold against the real dependency graph.

**This is the only behaviour-changing packet in the queue.** The program's gates are built to prove
that nothing changed, so they are the wrong instrument here — the round-trip test is the only evidence
that matters, and its absence would not show up as a red gate anywhere.
<!-- /ANCHOR:limitations -->
