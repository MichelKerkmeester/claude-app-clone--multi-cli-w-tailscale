---
title: "Phase 2 checklist — source @ds retirement barrier"
description: "Barrier sign-off for retiring @ds across the app source: comment-only per file, @ds=0, banners intact, frozen-seam fences preserved under the re-anchored gate, token-identity 0-diff, test:web green."
contextType: "implementation"
importance_tier: "normal"
trigger_phrases:
  - "svelte refactor verification checklist"
  - "svelte refactor packet"
  - "verification checklist"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/020-source-structure/007-comment-humanization/002-svelte-refactor"
    last_updated_at: "2026-08-25T20:45:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Barrier proven; source @ds retired comment-only, gates green, pushed."
    next_safe_action: "None — phase 2 complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 2 checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. A comment-only source
change is proven by a per-file non-comment hash, a value oracle (token-identity), and `test:web` — not by
a line diff. The frozen-seam preservation is the load-bearing item.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [x] **CHK-PRE-01** [P0] The phase-1 skill convention is landed as the written authority. [evidence: skill v1.7.0.0 on `skilled/v4.0.0.0`]
- [x] **CHK-PRE-02** [P0] The live-follow daemon is disabled so a long edit is not reverted. [evidence: `--live main` daemon killed; edits stayed intact]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [x] **CHK-CQ-01** [P0] `@ds` is retired from all app source. [evidence: `grep -rl '@ds' app-mobile/src` = `0`]
- [x] **CHK-CQ-02** [P0] The `MODULE` and numbered section banners are intact. [evidence: `MODULE` banners `63` = HEAD; `0` modules without a banner; `389` numbered section headers]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] **CHK-TEST-01** [P0] token-identity holds at zero diffs. [evidence: `0` CHANGED / VANISHED / ADDED across `65` tokens x light/dark/system]
- [x] **CHK-TEST-02** [P0] `test:web` passes from the final state. [evidence: `545`+`189` = `734` pass, 3 skip; raw exit `0`]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [x] **CHK-FIX-01** [P0] Every frozen-seam fence is preserved. [evidence: prior guardrail comment fences `273` = new `Do not edit` markers `273`; the `276`->`273` raw delta is the 3 catalog data-strings the old gate over-counted]
- [x] **CHK-FIX-02** [P0] The fence gate is re-anchored so the count is measured, not lost. [evidence: `scan-comments.mjs` counts `Do not edit`; `guardrailFences` = `273`; nothing asserts the literal 277]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [x] **CHK-SEC-01** [P0] No rendered value, a11y contract, route, or behaviour changed. [evidence: token-identity `0/0/0`; `test:web` green; change is comment-only bar 3 catalog description strings]
- [x] **CHK-SEC-02** [P0] Nothing under `specs/context/**`, `scripts/` (bar the gate), backend, or config was touched. [evidence: staged diff scoped to `app-mobile/src` + `scan-comments.mjs`]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [x] **CHK-DOC-01** [P1] The one non-comment deviation is recorded. [evidence: 3 `catalog-registry.ts` editability strings that named the retired `@ds` syntax, updated for consistency; no test asserts them]
- [x] **CHK-DOC-02** [P1] `validate.sh <packet> --strict` from the final state. [evidence: run through its realpath]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [x] **CHK-ORG-01** [P1] The change is pushed to Mobile CLI main. [evidence: `9309e3f..614a08e` on `main`]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

`@ds` was retired from every `.svelte` file, `app.css`, and the 3 `.ts` files, comment-only bar three
catalog editability-description strings. Frozen seams are preserved at `273`, the banners are intact,
token-identity is `0` diffs, and `test:web` is `734` pass — proven from the final state and pushed.
<!-- /ANCHOR:summary -->
