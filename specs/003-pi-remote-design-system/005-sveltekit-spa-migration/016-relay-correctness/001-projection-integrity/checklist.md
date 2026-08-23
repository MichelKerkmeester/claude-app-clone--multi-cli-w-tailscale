---
title: "Child 016/001 checklist — projection integrity"
description: "Barrier sign-off for the projection and epoch work. Every item is open: the packet is scoped and not started."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/016-relay-correctness/001-projection-integrity"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Checklist authored; all items open pending execution."
    next_safe_action: "Reproduce the drop before changing code."
    blockers: []
    completion_pct: 0
---

# Verification Checklist: Child 016/001 — Projection integrity

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

Every defect in this child is silent by construction, so the protocol is negative-control-first:
observe the failure, then fix it, then observe the same check pass. A check that was never seen
failing is indistinguishable from one that cannot fail.

**Every item is open.** The packet is scoped, not executed.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [ ] **CHK-PRE-01** [P0] The chain is re-confirmed against current source. [deferred: pending execution — cached counter, early return consuming no sequence, contiguity throw, over-wide `try`, absent listener]
- [ ] **CHK-PRE-02** [P0] Backend baseline captured. [deferred: pending execution — run the four real test dirs explicitly; the bare positional sweeps a protected research repo]
- [ ] **CHK-PRE-03** [P1] No sibling relay child is in flight. [deferred: pending execution — keeps the diff readable and the bisect honest]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [ ] **CHK-CQ-01** [P0] The store is the sole allocator of its sequence. [deferred: pending execution — no caller keeps a private copy of a counter another component may decline to advance]
- [ ] **CHK-CQ-02** [P0] The framing `try` wraps the parse only. [deferred: pending execution — relabelling a downstream throw destroys the one clue a reader has]
- [ ] **CHK-CQ-03** [P1] The error listener uses the logging idiom already in the file. [deferred: pending execution — a second idiom for the same job is a future inconsistency]
- [ ] **CHK-CQ-04** [P1] Collection is behind an explicit retained-epoch count. [deferred: pending execution — a hardcoded policy is a policy nobody can tune]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [ ] **CHK-TEST-01** [P0] The regression test was observed failing before the fix. [deferred: pending execution — if it passes on today's code the analysis is wrong and nothing should proceed]
- [ ] **CHK-TEST-02** [P0] The same test passes after. [deferred: pending execution — same test, same command, both outputs read]
- [ ] **CHK-TEST-03** [P0] A deliberately raised framing error appears in output. [deferred: pending execution — proves the listener is wired, not merely written]
- [ ] **CHK-TEST-04** [P1] Rotation yields a first sequence of one and the reused-epoch guard still rejects a repeat. [deferred: pending execution — both halves, since one without the other is a silent corruption]
- [ ] **CHK-TEST-05** [P0] `npm test` exit 0. [deferred: pending execution — four real directories, explicitly]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [ ] **CHK-FIX-01** [P0] Rotation and collection landed together. [deferred: pending execution — rotation alone multiplies orphaned partitions and makes storage strictly worse than today]
- [ ] **CHK-FIX-02** [P1] The four unbounded attachment maps are bounded. [deferred: pending execution — matching the bound the prompt service already applies]
- [ ] **CHK-FIX-03** [P1] Throws newly surfaced by the narrowed `try` are reported, not absorbed. [deferred: pending execution — they are findings for whichever packet owns that surface]
- [ ] **CHK-FIX-04** [P2] The transcript now shows a generation change. [deferred: pending execution — parity with the command catalog, todos and attachments]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [ ] **CHK-SEC-01** [P0] No security invariant is touched. [deferred: pending execution — this child changes sequencing and retention, not authority]
- [ ] **CHK-SEC-02** [P0] Collection was verified against a database copy first. [deferred: pending execution — it deletes rows, and the code reverts while the rows do not]
- [ ] **CHK-SEC-03** [P1] No new error output leaks session content. [deferred: pending execution — making errors audible must not make transcripts audible]
- [ ] **CHK-SEC-04** [P1] Nothing under `specs/context/**` is touched. [deferred: pending execution — five read-only research repos live there]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [ ] **CHK-DOC-01** [P1] The reason the store owns the counter is written where the loop reads it. [deferred: pending execution — the durable WHY, no artifact ids, since comment hygiene is a hard block]
- [ ] **CHK-DOC-02** [P1] The retained-epoch count states what it protects. [deferred: pending execution — a bare number invites someone to tune it blind]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [ ] **CHK-ORG-01** [P1] Per-phase commits. [deferred: pending execution — the live-follow daemon reverts uncommitted edits]
- [ ] **CHK-ORG-02** [P2] The reproduction test lives with the relay suites. [deferred: pending execution — it must run in the lane that runs on every commit]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

Not yet verified — the packet is scoped, not executed.

The chain was verified link by link against source during scoping, so the analysis is not a
hypothesis. What remains unproven is the fix, and the single check that matters is whether the
reproduction test was watched failing first.
<!-- /ANCHOR:summary -->
