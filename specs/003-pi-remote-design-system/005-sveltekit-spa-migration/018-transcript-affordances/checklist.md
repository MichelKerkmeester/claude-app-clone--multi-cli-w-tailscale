---
title: "Child 018 checklist — transcript affordances"
description: "Barrier sign-off for the three client affordances. Every item is open: the packet is scoped and not started."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/018-transcript-affordances"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Checklist authored; all items open pending execution."
    next_safe_action: "Land the repairability type change."
    blockers: []
    completion_pct: 0
---

# Verification Checklist: Child 018 — Transcript affordances

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

The nine program gates exist to prove nothing changed. Two items here change what the user sees on
purpose, so a green board is not evidence of success for them — it is only evidence that nothing else
broke.

Their closing evidence is an explicit requirement plus a person on a device. That is stated as a
requirement rather than left to be assumed away.

**Every item is open.** The packet is scoped, not executed.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [ ] **CHK-PRE-01** [P0] The test-lane packet has landed. [deferred: pending execution — the absent real-virtualizer test is why this bug survived every gate]
- [ ] **CHK-PRE-02** [P0] The rename packet has landed. [deferred: pending execution — all three items touch files it moves]
- [ ] **CHK-PRE-03** [P0] The absorb-or-separate decision is recorded. [deferred: pending execution — `011-ux-affordances` holds one requirement today and this would add three or four]
- [ ] **CHK-PRE-04** [P0] Fence inventory and baseline count captured. [deferred: pending execution — three of these changes sit inside guardrail fences]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [ ] **CHK-CQ-01** [P0] Disclosure state is keyed by the protocol block id. [deferred: pending execution — stable, and not derived from render order]
- [ ] **CHK-CQ-02** [P1] The hoist follows the pattern the todo panel already uses. [deferred: pending execution — a second idiom for the same job is a future inconsistency]
- [ ] **CHK-CQ-03** [P0] Differentiation composes existing tokens. [deferred: pending execution — no new token, no new value; token identity is the proof]
- [ ] **CHK-CQ-04** [P1] Repairability is modelled in the catalog, not inferred at each call site. [deferred: pending execution — inference at the edges is how the two states got conflated]
- [ ] **CHK-CQ-05** [P1] No tool-to-verb activity vocabulary was added. [deferred: pending execution — deliberately out of scope; it would change rendered strings the identity gate depends on]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [ ] **CHK-TEST-01** [P0] Expansion survives unmount and remount. [deferred: pending execution — state-layer test: mount, expand, unmount, remount, still expanded]
- [ ] **CHK-TEST-02** [P0] At least one test drives the real virtualizer. [deferred: pending execution — supplied by the test-lane packet, not by this one]
- [ ] **CHK-TEST-03** [P1] The stall label changes after the threshold. [deferred: pending execution — assertable by clock]
- [ ] **CHK-TEST-04** [P1] The repairability change needs no test. [deferred: pending execution — `svelte-check` proves exhaustive keying and an existing test asserts the key set]
- [ ] **CHK-TEST-05** [P0] `npm run test:web` exit 0. [deferred: pending execution — verify by content, not by a piped exit status]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [ ] **CHK-FIX-01** [P0] A mis-tap on the blanket grant requires a different motion. [deferred: pending execution — differentiation of intention alone does not fix a mis-tap]
- [ ] **CHK-FIX-02** [P1] The strip can say something better than unavailable. [deferred: pending execution — the point of modelling repairability at all]
- [ ] **CHK-FIX-03** [P1] The stall threshold exceeds the longest legitimate silent tool run. [deferred: pending execution — a false stall report trains the user to ignore the signal]
- [ ] **CHK-FIX-04** [P2] The two miscalibrated runtime strings are addressed or explicitly deferred. [deferred: pending operator — they read as walls but are doors]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [ ] **CHK-SEC-01** [P0] No security invariant changes. [deferred: pending execution — these are presentation affordances; the approval path's authority is untouched]
- [ ] **CHK-SEC-02** [P1] Differentiation does not weaken the confirmation. [deferred: pending execution — making the grant harder to hit must not make it easier to dismiss]
- [ ] **CHK-SEC-03** [P1] Nothing under `specs/context/**` is touched. [deferred: pending execution — five read-only research repos live there]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [ ] **CHK-DOC-01** [P0] Each rendered-value change has an explicit requirement. [deferred: pending execution — they diverge from the frozen oracle deliberately, and an undocumented divergence is indistinguishable from a regression]
- [ ] **CHK-DOC-02** [P1] The reason disclosure state lives outside the row is written where it is read. [deferred: pending execution — durable WHY only; comment hygiene is a hard block]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [ ] **CHK-ORG-01** [P1] Per-item commits. [deferred: pending execution — three items with different approval costs should bisect apart]
- [ ] **CHK-ORG-02** [P1] Fence-crossing work is reviewed in one pass. [deferred: pending execution — three separate fence reviews cost three times as much and agree less]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

Not yet verified — the packet is scoped, not executed.

Two of the three items are closed by a person, not a gate — the approval row and the stall copy both
need a device, and the gates are structurally blind to that class. Recording that as required evidence
is what stops it from quietly becoming an assumption.
<!-- /ANCHOR:summary -->
