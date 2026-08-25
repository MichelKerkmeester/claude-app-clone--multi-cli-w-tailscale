---
title: "Phase 3 tasks — skill reverify ledger"
description: "Reconcile the skill with the shipped source, remove the residual @ds-named file, and land the version bump. Evidence inline."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/020-source-structure/007-comment-humanization/003-skill-reverify"
    last_updated_at: "2026-08-25T21:00:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "All tasks done; skill reconciled and v1.7.1.0 landed."
    next_safe_action: "None — phase 3 complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Phase 3 tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Evidence inline.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Read the skill's convention claims against the shipped source. [evidence: `comment-grammar.md` + `editability-guardrails.md` specify `Do not edit — <why>`, MODULE + numbered banners, module headers, markup labels — all matching the shipped 99 files]
- [x] **T1.2** Confirm the re-anchored fence gate claim is now true. [evidence: `editability-guardrails.md` says the counter re-anchors to `Do not edit —`; the app `scan-comments.mjs` now counts it — `273`]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** Grep the skill tree for residual `@ds`-named artifacts and rename. [evidence: `manual-testing-playbook/ds-grammar-routing.md` renamed to `comment-convention-routing.md`; its one reference updated; `0` `@ds`-named files remain]
- [x] **T2.2** Bump the version and land via the Public worktree. [evidence: v1.7.1.0; `0b5090b4a9..ed8ff424c0` on `skilled/v4.0.0.0`; router-sync `PASS`, leaf-manifest `13/13`, packet delta `0`]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Confirm no `@ds`-named artifact and the bijection intact after landing. [evidence: `0` `@ds`-named files; router-sync `PASS`; alignment-drift `/skills/sk-code/` delta `0`]
- [x] **T3.2** `validate.sh <packet> --strict` from the final state. [evidence: run through its realpath]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

The skill's convention claims match the shipped source, no `@ds`-named artifact remains, and the version
bump is landed on `skilled/v4.0.0.0` with the router-sync bijection intact.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the reconciliation approach.
- `implementation-summary.md` — the reverify result.
<!-- /ANCHOR:cross-refs -->
