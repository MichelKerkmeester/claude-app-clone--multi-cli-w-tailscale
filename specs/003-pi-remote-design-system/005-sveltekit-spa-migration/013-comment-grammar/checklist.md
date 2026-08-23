---
title: "Child 013 checklist — inline comment grammar and quality"
description: "Barrier sign-off for the comment pass. Every item is open: the packet is scoped and not started, so each marker names the check that will produce its evidence."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/013-comment-grammar"
    last_updated_at: "2026-08-23T12:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Checklist authored; all items open pending execution."
    next_safe_action: "Close the fence-check re-scope before any comment is edited."
    blockers: []
    completion_pct: 0
---

# Verification Checklist: Child 013 — Inline comment grammar and quality

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

A comment-only packet is verified by two things: counting what changed, and proving what did not.

The counts are cheap and have measured baselines. The proof is not automatable — it is diff inspection
confirming no non-comment line moved, and it is the item everything else here rests on.

**Every item is open.** The packet is scoped, not executed; each marker names the check that will
produce its evidence rather than claiming a result.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [ ] **CHK-PRE-01** [P0] The fence-text check is re-scoped to the marker and count. [deferred: pending execution — this packet rewrites fence prose by design, so the check as written fails on purpose]
- [ ] **CHK-PRE-02** [P0] The re-scoped check still fails when a fence marker is removed. [deferred: pending execution — a loosened check that cannot detect its own violation is not a check]
- [ ] **CHK-PRE-03** [P0] 012 has landed, so banners name components by their final names. [deferred: pending execution — otherwise every banner is rewritten twice]
- [ ] **CHK-PRE-04** [P0] 012 is confirmed not running concurrently. [deferred: pending execution — both packets touch the same 148 files]
- [ ] **CHK-PRE-05** [P1] Baselines recorded. [deferred: pending execution — `51` files unbannered, `403` capitalisation violations, `45` multi-line fences, `277` fences total]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [ ] **CHK-CQ-01** [P0] Every source file carries a section banner. [deferred: pending execution — coverage scan must return 0 files without a `─` rule, down from 51]
- [ ] **CHK-CQ-02** [P0] No comment narrates the line below it. [deferred: pending execution — no mechanical check exists; verified by sampled diff review at 1 in 5]
- [ ] **CHK-CQ-03** [P1] Every comment sentence starts with a capital. [deferred: pending execution — scan must return 0, down from 403, excluding `eslint-disable` and `@ts-` directives]
- [ ] **CHK-CQ-04** [P1] Comment density at or below 3 per 10 lines. [deferred: pending execution — corrected by deletion, since terse restatement is still restatement]
- [ ] **CHK-CQ-05** [P1] Comments sit above their code. [deferred: pending execution — the 5 trailing comments move]
- [ ] **CHK-CQ-06** [P2] Banner weight scales with file size. [deferred: pending execution — a 60-line primitive should not carry a 400-line composer's banner]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [ ] **CHK-TEST-01** [P0] The nine program gates are unaffected, not merely green. [deferred: pending execution — a comment-only change that moves a gate was not comment-only]
- [ ] **CHK-TEST-02** [P0] `npm run test:web` exit 0. [deferred: pending execution — verify by content; piping to `tail` reports the pipe's status, not vitest's]
- [ ] **CHK-TEST-03** [P1] Backend suite green. [deferred: pending execution — run the four real dirs explicitly, since the bare `tests` positional sweeps a protected context repo]
- [ ] **CHK-TEST-04** [P1] No new test was added. [deferred: pending execution — there is no new behaviour to test, and a test here would be theatre]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [ ] **CHK-FIX-01** [P0] All 45 multi-line fence explanations are one line of reason. [deferred: pending execution — scan returns 0]
- [ ] **CHK-FIX-02** [P0] The flagged reference case is rewritten. [deferred: pending execution — `AttachmentPreviewDialog` is the packet's worked example and should appear early in the diff]
- [ ] **CHK-FIX-03** [P1] Comments that cost the reader nothing were deleted, not reworded. [deferred: pending execution — sampled review]
- [ ] **CHK-FIX-04** [P1] No commented-out code introduced or left. [deferred: pending execution — git preserves history, so dead code in a comment is pure noise]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [ ] **CHK-SEC-01** [P0] The diff is comment-only. [deferred: pending execution — inspected by Claude; every safety claim in this packet depends on it]
- [ ] **CHK-SEC-02** [P0] No comment carries an ephemeral artifact pointer. [deferred: pending execution — comment hygiene is a hard block with a pre-commit gate behind it]
- [ ] **CHK-SEC-03** [P1] No comment discloses a secret, token or host detail. [deferred: pending execution — rewriting a WHY is an easy place to leak an internal address]
- [ ] **CHK-SEC-04** [P1] Nothing under `specs/context/**` is touched. [deferred: pending execution — five read-only research repos live there]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [ ] **CHK-DOC-01** [P1] The house grammar is discoverable outside this packet. [deferred: pending execution — `svelte-conventions.md` should carry it, so a future dispatch inherits the standard]
- [ ] **CHK-DOC-02** [P2] The worked before-and-after survives somewhere durable. [deferred: pending execution — an example teaches the rule faster than the rule does]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [ ] **CHK-ORG-01** [P1] Batches commit atomically. [deferred: pending execution — the live-follow daemon reverts uncommitted edits]
- [ ] **CHK-ORG-02** [P2] No file was moved or renamed. [deferred: pending execution — that is 012's job; a move here would confuse both diffs]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

Not yet verified — the packet is scoped, not executed.

The honest risk is not that this packet breaks something. It is that it produces confident, wrong
explanations at scale, which a reader will trust more than the narration they replaced. That is why
the WHY pass is sampled against the code rather than reviewed as prose, and why the sample rate is
stated as a number rather than as an intention.
<!-- /ANCHOR:summary -->
