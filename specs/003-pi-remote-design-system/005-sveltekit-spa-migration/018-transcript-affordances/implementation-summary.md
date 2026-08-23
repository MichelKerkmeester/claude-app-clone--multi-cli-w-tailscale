---
title: "Child 018 implementation summary — transcript affordances"
description: "Continuity anchor. Nothing is implemented yet: this records the three defects, why the gates cannot see them, and what only a device can confirm."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/018-transcript-affordances"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Scoped three client affordances; no code changed."
    next_safe_action: "Land the repairability type change; it needs no sign-off."
    blockers: ["needs 011 requirements; runs after 012 and 015"]
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 018 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `005-sveltekit-spa-migration` |
| Level | 2 |
| Status | **Scoped, not started** — blocked on 012, 015 and 011 sign-off |
| Requirements shipped | none yet; REQ-001 … REQ-007 all open |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Nothing. No client source has been edited.

The three defects, all invisible to the nine program gates:

| Defect | Mechanism |
|---|---|
| Disclosure state dies on scroll | `app-mobile/src/pages/chat/transcript/TranscriptList.svelte` virtualizes with a six-row overscan; component-local open state is destroyed with the unmounted row |
| Blanket grant looks like the single approval | `app-mobile/src/pages/review/Review.svelte` renders both as plain buttons, same row, same size, same thumb distance |
| A wedged host reads as a working one | The transcript renders a fixed working label while the run flag is true; nothing there is a function of time |
| Repairability is unmodelled | `app-mobile/src/shared/data/runtime-issues.ts` maps a code to a bare string, so nothing downstream can branch on recoverability |
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Ordered by approval cost, not by importance: the type-safe change first, then the state fix, then the
two that change what the user sees. That way something lands while the sign-off conversation runs.

The executor writes `app-mobile/src/**`. Claude reviews every fence crossing in one pass and owns git.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Differentiation, not classification.** A relay-side risk classifier was ruled out: it adds a field
three packages must keep in sync and a heuristic that will sometimes be wrong, and a wrong risk label
is worse than none because a confirmation you learn to tap through stops confirming anything. The
actual defect is a mis-tap, and mis-taps are solved with distance and shape.

**Only half of the activity work is taken.** The stall signal is worth having; the tool-to-verb
vocabulary is not, because it would change rendered strings the identity gate and the story fixtures
depend on, to surface information already one tap away.

**The disclosure fix is not the five-line lift it was billed as.** It moves state through markup
inside guardrail fences, so it costs a fence review and must not disturb a gated count — and it
diverges from the frozen oracle despite changing no rendered value.

**Device verification is required evidence, not a nicety.** Headless rendering at a fixed width cannot
reproduce momentum scrolling or judge whether copy reads as stalled. Writing that down is what keeps
it from becoming an assumption that the gates covered it.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Repairability modelled | not done |
| Disclosure hoisted and state-layer test | not done |
| Fence review | not run |
| Approval differentiation | not done |
| Stall threshold | not done |
| Token identity and fence count (`npm run test:web`) | not run |
| `validate.sh --strict` via realpath | not run |

No completion claim is made or implied.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

**Two items cannot be closed by any gate in this program.** The gates prove nothing changed, which is
the wrong question for a deliberate rendered-value change. Their evidence is a requirement plus an
operator on a device, and that is a slower, less repeatable form of proof.

**The stall threshold is a guess until someone measures a long silent tool run.** Set it too short and
a legitimate run reads as stalled, which trains the user to ignore the signal — a worse outcome than
having no signal.

**This packet depends on three others.** It needs the rename to have landed, the test lanes to have
been repaired, and the affordances packet to supply requirements. That is a lot of upstream, and it is
the reason this sits late in the queue despite containing the defect a user is most likely to notice.
<!-- /ANCHOR:limitations -->
