---
title: "Child 015 implementation summary — test lanes repaired"
description: "Continuity anchor for the test-infrastructure packet. Nothing is implemented yet: this records the verified measurements and why the packet runs first."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/015-test-lanes"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet scoped from verified measurements; nothing changed."
    next_safe_action: "Record baselines, then swap the allowlist for a glob."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 015 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `005-sveltekit-spa-migration` |
| Level | 2 |
| Status | **Scoped, not started** |
| Requirements shipped | none yet; REQ-001 … REQ-007 all open |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Nothing. No test or config has been edited.

The measurements below were verified directly against the tree rather than inherited from the research
synthesis:

| Measurement | Value |
|---|---|
| Paths in the logic-lane allowlist | 15, hardcoded |
| Tests the config itself names as dead | 4, documented in its own header comment |
| Suites mocking the virtualizer to return every row | 4 |
| Tests that have ever exercised the real virtualizer | 0 |
| `**/*.svelte` blocks in the ESLint config | 0 |
| Svelte ESLint parser or plugin installed | neither |
| `$effect` occurrences in app source, unread by any rule | 114 |
| Historical `$effect` self-invalidation incidents in this program | 7 |
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Per-phase commits, baseline first. The executor writes tests and configs; Claude verifies the counts
and owns git.

The packet runs before every other post-cutover item, because each of those is verified by these
lanes. A fix written against an unrepaired lane produces a green board and no coverage.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**A glob, not a longer allowlist.** The defect is the shape, not the contents. An allowlist fails
silently when someone adds a file; a glob fails loudly. Adding the four missing paths would fix
today's symptom and leave tomorrow's.

**Every exclusion carries a written reason, in the config.** The next reader opens the config, not the
commit log. An explicit gap is the outcome being bought here; a silent one is the defect.

**Negative controls where they are cheap.** A test that cannot fail is an assertion-shaped comment.
The reducer test gets one; the packet does not pretend to give one to everything.

**Report, do not fix, what the un-mocked virtualizer exposes.** Those are findings for the packets
that own those surfaces. Absorbing them here would turn a precondition into an open-ended project.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Baseline counts | not recorded |
| Glob swap | not run |
| Virtualizer un-mock | not run |
| ESLint Svelte pass | not run |
| Reducer test and negative control | not written |

No completion claim is made or implied.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

**This packet fixes no user-visible defect.** Its entire value is downstream, which makes it the
easiest one to deprioritise and the most expensive one to skip — every later fix would be verified by
instruments already known to be measuring less than they report.

**The ESLint first pass is an unknown quantity.** 114 `$effect` occurrences have never been linted, so
the finding count could be large. The plan is to baseline and ratchet rather than to triage
everything, which means the lane lands with known debt rather than clean.

**Quarantine is not repair.** Four tests are expected to be quarantined with reasons rather than
fixed, because they fail on stale fetch-mock and Worker-environment assumptions of unknown size.
That leaves real coverage missing — visibly, which is the improvement.
<!-- /ANCHOR:limitations -->
