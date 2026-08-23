---
title: "Child 016/002 checklist — route authority and rate-limit honesty"
description: "Barrier sign-off for the route pass. Every item is open: the packet is scoped and not started."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/016-relay-correctness/002-route-authority"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Checklist authored; all items open pending execution."
    next_safe_action: "Build the harness."
    blockers: []
    completion_pct: 0
---

# Verification Checklist: Child 016/002 — Route authority

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

Two assertions per gated route, and the second is the important one: a foreground device must be
unchanged. The hazard in authority work is not failing to block — it is blocking someone who should
pass, on a phone that is the only client this system has.

**Every item is open.** The packet is scoped, not executed.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [ ] **CHK-PRE-01** [P0] Every route classified as exercising authority or observing state. [deferred: pending execution — that distinction decides gating, not data sensitivity]
- [ ] **CHK-PRE-02** [P0] The route-level harness exists and is route-agnostic. [deferred: pending execution — roughly three quarters of this child's effort; no such test exists today]
- [ ] **CHK-PRE-03** [P1] Backend baseline captured. [deferred: pending execution — four real test dirs explicitly, since the bare positional sweeps a protected repo]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [ ] **CHK-CQ-01** [P0] The gates copy the adjacent route's pattern. [deferred: pending execution — a second idiom for the same check is a future inconsistency]
- [ ] **CHK-CQ-02** [P0] The prompt gate no longer depends on payload shape. [deferred: pending execution — whether a prompt carries an image is unrelated to whether the device may steer]
- [ ] **CHK-CQ-03** [P1] The authority predicate itself is unchanged. [deferred: pending execution — this child changes callers, not the rule]
- [ ] **CHK-CQ-04** [P1] The asserted foreground flag is named as asserted. [deferred: pending execution — two facts under one name is the reasoning error being removed]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [ ] **CHK-TEST-01** [P0] Background device refused on all three mutation routes. [deferred: pending execution — approval-decide, accept-edits, prompt-submit]
- [ ] **CHK-TEST-02** [P0] Foreground device unchanged on all three. [deferred: pending execution — the assertion that protects the only client this system has]
- [ ] **CHK-TEST-03** [P0] Listing route still answers a background device. [deferred: pending execution — a permanent guard against a future over-correction]
- [ ] **CHK-TEST-04** [P1] Plain and attachment-carrying prompts gated identically. [deferred: pending execution — the erosion this child repairs]
- [ ] **CHK-TEST-05** [P0] `npm test` exit 0. [deferred: pending execution — four real directories explicitly]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [ ] **CHK-FIX-01** [P0] No bare rate-limited response remains. [deferred: pending execution — verified by grep over the response sites; nine send no hint today]
- [ ] **CHK-FIX-02** [P1] The client receives a real value. [deferred: pending execution — its parser, clamp and consumer are already shipped and currently fed nothing]
- [ ] **CHK-FIX-03** [P1] The rate limiter's window does not fire during a normal approval burst. [deferred: pending execution — a limiter that fires wrongly is a bug, one that never fires costs nothing]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [ ] **CHK-SEC-01** [P0] The foreground invariant is universal across mutation routes. [deferred: pending execution — twelve of fifteen honour it today, which makes it a convention]
- [ ] **CHK-SEC-02** [P0] Reads remain ungated. [deferred: pending execution — gating a read regresses a phone whose socket is still re-opening]
- [ ] **CHK-SEC-03** [P1] The claim made is consistency, not new security. [deferred: pending execution — the surface is already principal-scoped and revocation-aware]
- [ ] **CHK-SEC-04** [P1] Nothing under `specs/context/**` is touched. [deferred: pending execution — five read-only research repos live there]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [ ] **CHK-DOC-01** [P1] The exercises-versus-observes rule is written where the next route author will read it. [deferred: pending execution — durable WHY only, since comment hygiene is a hard block]
- [ ] **CHK-DOC-02** [P2] The listing route's deliberate exemption is stated. [deferred: pending execution — an unexplained exception invites someone to remove it]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [ ] **CHK-ORG-01** [P1] Per-phase commits. [deferred: pending execution — the live-follow daemon reverts uncommitted edits]
- [ ] **CHK-ORG-02** [P2] The harness lives where the next route test will find it. [deferred: pending execution — its value is that it outlasts this child]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

Not yet verified — the packet is scoped, not executed.

The honest framing: this child buys a property for readers rather than protection from an attacker.
Anyone reviewing it should hold it to that claim and not to a larger one.
<!-- /ANCHOR:summary -->
