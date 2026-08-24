---
title: "Child 017 checklist — ask-question activation"
description: "Barrier sign-off for the ask-question wiring. Every item is open: the packet is scoped and not started."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/017-ask-question-activation"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Checklist authored; all items open pending execution."
    next_safe_action: "Trace the producer path."
    blockers: []
    completion_pct: 0
---

# Verification Checklist: Child 017 — Ask-question activation

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

The trap in this packet is that the visible symptom and the actual defect are two different things.
Making the routes stop answering unavailable is easy and proves nothing; a question still has to be
raised, and today nothing raises one.

So the protocol refuses grep-level evidence for the thing that matters: only a round trip counts.

**Every item is open.** The packet is scoped, not executed.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [ ] **CHK-PRE-01** [P0] The host event that should raise a question is traced and its shape confirmed. [deferred: pending execution — if none exists the packet grows to the host side, which is an operator decision]
- [ ] **CHK-PRE-02** [P1] The service's declared dependencies are all already held by `app-relay/src/index.ts`. [deferred: pending execution — the other seven services are constructed there]
- [ ] **CHK-PRE-03** [P1] Existing service-test assumptions reviewed. [deferred: pending execution — they have only run against a hand-constructed instance]
- [ ] **CHK-PRE-04** [P1] Backend baseline captured. [deferred: pending execution — four real test dirs explicitly]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [ ] **CHK-CQ-01** [P0] The service is constructed alongside the seven that already are. [deferred: pending execution — same place, same shape, no second idiom]
- [ ] **CHK-CQ-02** [P0] The presenter has a real caller. [deferred: pending execution — verified by grep; the service compiles perfectly without one, which is why this is the half that gets forgotten]
- [ ] **CHK-CQ-03** [P1] No change to the service's internal logic. [deferred: pending execution — it is already tested; this packet wires it, nothing more]
- [ ] **CHK-CQ-04** [P1] No file under `app-mobile/src/` changed. [deferred: pending execution — the phone side is complete]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [ ] **CHK-TEST-01** [P0] The round-trip test was observed failing before the wiring. [deferred: pending execution — one that passes beforehand is testing its own fixtures]
- [ ] **CHK-TEST-02** [P0] The same test passes after. [deferred: pending execution — question raised by the host reaches the phone; answer reaches the handoff]
- [ ] **CHK-TEST-03** [P1] Existing service tests still pass. [deferred: pending execution — or their assumptions are corrected with a reason]
- [ ] **CHK-TEST-04** [P0] `npm test` exit 0. [deferred: pending execution — four real directories explicitly]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [ ] **CHK-FIX-01** [P0] Both ends are connected, not just the routes. [deferred: pending execution — producer into the presenter, answer into the handoff]
- [ ] **CHK-FIX-02** [P0] No route answers unavailable when the relay is healthy. [deferred: pending execution — `503` is for a runtime condition, not a wiring gap]
- [ ] **CHK-FIX-03** [P1] Any client change the round trip needs was reported, not absorbed. [deferred: pending execution — that would be a finding for another packet]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [ ] **CHK-SEC-01** [P0] Eligibility to answer is enforced by the relay. [deferred: pending execution — consistent with every other mutation surface here; never trusted from the client]
- [ ] **CHK-SEC-02** [P0] Turning the feature on does not bypass redaction. [deferred: pending execution — the projector and redaction already know about this feature and must stay on the path]
- [ ] **CHK-SEC-03** [P1] Question content is subject to the same content rules as any transcript block. [deferred: pending execution — a newly live surface is a new place for content to escape]
- [ ] **CHK-SEC-04** [P1] Nothing under `specs/context/**` is touched. [deferred: pending execution — five read-only research repos live there]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [ ] **CHK-DOC-01** [P1] The producer path is described where the next reader will look. [deferred: pending execution — durable WHY only; comment hygiene is a hard block]
- [ ] **CHK-DOC-02** [P2] The feature's newly live status is reflected in the folder documentation. [deferred: pending execution — hand to the documentation packet if it lands later]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [ ] **CHK-ORG-01** [P1] Wiring and producer connection are separate commits. [deferred: pending execution — they fail differently and should bisect apart]
- [ ] **CHK-ORG-02** [P2] The round-trip test lives with the relay suites. [deferred: pending execution — it must run in the lane that runs on every commit]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

Not yet verified — the packet is scoped, not executed.

This is the only packet in the current queue that deliberately changes behaviour rather than
preserving it. It should be reviewed as a feature landing, with the corresponding attention to what a
newly live surface exposes.
<!-- /ANCHOR:summary -->
