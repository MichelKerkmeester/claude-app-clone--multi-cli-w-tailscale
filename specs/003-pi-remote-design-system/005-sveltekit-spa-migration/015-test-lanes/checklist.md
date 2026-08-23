---
title: "Child 015 checklist — test lanes repaired"
description: "Barrier sign-off for the test-infrastructure repair. Every item is open: the packet is scoped and not started."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/015-test-lanes"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Checklist authored; all items open pending execution."
    next_safe_action: "Record baselines, then swap the allowlist for a glob."
    blockers: []
    completion_pct: 0
---

# Verification Checklist: Child 015 — Test lanes repaired

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

A packet whose product is tests has to defend against one specific self-deception: proving coverage by
counting files. The counts here are always paired — before and after — and the important tests carry a
negative control, because a passing test that cannot fail measures nothing.

**Every item is open.** The packet is scoped, not executed.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [ ] **CHK-PRE-01** [P0] Baseline counts recorded per lane. [deferred: pending execution — files collected and tests passed, so later numbers have a comparison]
- [ ] **CHK-PRE-02** [P0] Every test file mapped to the lane that collects it, or to none. [deferred: pending execution — the uncollected set is the packet's real scope]
- [ ] **CHK-PRE-03** [P1] 012 has not started. [deferred: pending execution — a config edit must not collide with a 148-file rename batch]
- [ ] **CHK-PRE-04** [P1] Dev-dependency approval obtained. [deferred: pending execution — `eslint-plugin-svelte` and `svelte-eslint-parser` are a scoped mutation]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [ ] **CHK-CQ-01** [P0] The logic lane resolves by glob. [deferred: pending execution — a new test file must run without a config edit, the property the allowlist removed]
- [ ] **CHK-CQ-02** [P0] No test is excluded implicitly. [deferred: pending execution — every exclusion carries a written reason in the config]
- [ ] **CHK-CQ-03** [P1] The glob was not re-narrowed to restore green. [deferred: pending execution — that would reproduce the original defect with extra steps]
- [ ] **CHK-CQ-04** [P1] Test filenames describe what they assert. [deferred: pending execution — `disclosure-persistence.svelte.test.ts` asserts placement, not persistence]
- [ ] **CHK-CQ-05** [P1] Dead React ESLint configuration removed. [deferred: pending execution — plus the override pointing at a directory that no longer exists]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [ ] **CHK-TEST-01** [P0] `npm run test:web` exit 0. [deferred: pending execution — verify by content; piping to `tail` reports the pipe's status, not the runner's]
- [ ] **CHK-TEST-02** [P0] At least one suite exercises the real virtualizer. [deferred: pending execution — today all four mock `getVirtualItems()` to return every item]
- [ ] **CHK-TEST-03** [P0] Reducer test covers snapshot, delta, gap and the mutation barrier. [deferred: pending execution — nothing currently touches that path]
- [ ] **CHK-TEST-04** [P0] The reducer test has a negative control. [deferred: pending execution — remove the barrier, confirm the test fails]
- [ ] **CHK-TEST-05** [P1] `npm test` unaffected. [deferred: pending execution — this packet does not touch relay tests; run the four real dirs explicitly]
- [ ] **CHK-TEST-06** [P1] ESLint parses `.svelte` and reports a baseline. [deferred: pending execution — 114 `$effect` occurrences have never been read by a rule]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [ ] **CHK-FIX-01** [P0] The four self-documented dead tests are repaired or quarantined with a reason. [deferred: pending execution — the config names them at `:17-21`]
- [ ] **CHK-FIX-02** [P1] Bugs exposed by the un-mocked virtualizer are reported, not fixed here. [deferred: pending execution — they are findings for another packet]
- [ ] **CHK-FIX-03** [P1] Test count delta fully accounted for. [deferred: pending execution — a number that rises unexplained is as suspicious as one that falls]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [ ] **CHK-SEC-01** [P0] No source file under `app-mobile/src/` or `app-relay/src/` changed. [deferred: pending execution — `git diff --stat` must show tests and configs only]
- [ ] **CHK-SEC-02** [P1] The two new dev dependencies are dev-only. [deferred: pending execution — nothing here may reach a production bundle]
- [ ] **CHK-SEC-03** [P1] Nothing under `specs/context/**` is touched. [deferred: pending execution — five read-only research repos live there]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [ ] **CHK-DOC-01** [P1] Each quarantine carries its reason in the config, not in a commit message. [deferred: pending execution — the next reader opens the config, not the log]
- [ ] **CHK-DOC-02** [P2] The ESLint baseline number is written down. [deferred: pending execution — a ratchet needs a starting notch]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [ ] **CHK-ORG-01** [P1] Per-phase commits. [deferred: pending execution — the live-follow daemon reverts uncommitted edits]
- [ ] **CHK-ORG-02** [P2] Renamed test files keep their history. [deferred: pending execution — `git mv`, so `git log --follow` still works]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

Not yet verified — the packet is scoped, not executed.

The failure mode to watch for is subtle: this packet can be declared done while quietly making the
lanes narrower, because narrowing is the fastest route back to green. Every exclusion carrying a
written reason is what makes that visible rather than comfortable.
<!-- /ANCHOR:summary -->
