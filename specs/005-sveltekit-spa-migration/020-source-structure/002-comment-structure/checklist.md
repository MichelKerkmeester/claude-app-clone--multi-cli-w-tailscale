---
title: "Phase B checklist — comment structure barrier"
description: "Barrier sign-off for the section-banner harmonization: fence stability, @ds preservation, canonical vocabulary, coverage split, and the whole gate. Every item proven with evidence."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/020-source-structure/002-comment-structure"
    last_updated_at: "2026-08-24T11:01:11Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "All barrier items proven; fences 277; whole gate green."
    next_safe_action: "Proceed to Phase C (skill update)."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase B checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. A comment pass is
proven by the invariants it must not move — the fence count and the `@ds` line set — not by inspection.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [x] **CHK-PRE-01** [P0] The canonical vocabulary, order, synonym map, and coverage split are frozen before any batch. [evidence: contract frozen before batch 1 — canonical order, synonym map, `14 significant / 31 trivial` split]
- [x] **CHK-PRE-02** [P1] The baseline fence count (277) and `@ds` line count are captured, so the post-pass delta is provable. [evidence: baseline fences 277 and 1030 `@ds` lines captured pre-pass]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [x] **CHK-CQ-01** [P0] Section banners use the canonical vocabulary and order; the synonym grep returns zero. [evidence: `grep` for synonyms returns zero; vocabulary is `9 canonical labels + 6 preserved domain names`]
- [x] **CHK-CQ-02** [P0] Every `@ds` comment is byte-for-byte unchanged; the guardrail fence count is 277. [evidence: `@ds` count 1030 unchanged; the one moved `@ds` line is byte-identical and rode with its code; fences 277]
- [x] **CHK-CQ-03** [P1] Banners renumber sequentially from the sections present; domain-specific section names are preserved. [evidence: sequential renumbering; `MARKDOWN MODEL` / `BOUNDED PARSER` / `LIVE REGION STATE` and 3 more preserved]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] **CHK-TEST-01** [P0] Build and `npm run typecheck` pass from the final state. [evidence: build RC 0; typecheck 1124 files, 0 errors]
- [x] **CHK-TEST-02** [P0] `npm run test:web` exit 0, verified by content. [evidence: `test:web` 68 + 17 files, 545 + 189 passed, RC 0]
- [x] **CHK-TEST-03** [P1] Token identity holds at zero diffs across three themes — a comment pass changes no value. [evidence: `token-identity.mjs` 0 changed / 0 vanished / 0 added across light, dark, system]
- [x] **CHK-TEST-04** [P1] Catalog smoke renders every story in both themes with zero throws. [evidence: `catalog-smoke-cdp.mjs` 267 stories × 2 themes = 534 frames, 0 throws]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [x] **CHK-FIX-01** [P0] Every bannered and every significant file uses the one canonical vocabulary. [evidence: 65 bannered files share the canonical vocabulary; the per-file `git show HEAD` code-line multiset is identical]
- [x] **CHK-FIX-02** [P1] The significant bare files gained banners; trivial primitives stay bare and are listed. [evidence: 14 files gained banners (`51 -> 65`); 31 trivial primitives listed in the implementation summary]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [x] **CHK-SEC-01** [P1] No rendered value, security boundary, route or a11y contract changed — a pure comment pass. [evidence: code-line multiset identical across 55 files; token identity 0-diff; `test:web` and catalog smoke green]
- [x] **CHK-SEC-02** [P1] Nothing under `specs/context/**` touched. [evidence: no batch touched `specs/context/`]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [x] **CHK-DOC-01** [P1] `validate.sh --strict` exit 0 through its realpath. [evidence: `validate.sh --strict` exit 0 through its realpath]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [x] **CHK-ORG-01** [P1] Each harmonized file names its sections the same way, so a reader learns one layout. [evidence: 31 files in canonical `LOCAL` -> `DERIVED` order; 2 held `DERIVED` -> `LOCAL` for TDZ safety and recorded]
- [x] **CHK-ORG-02** [P2] Commits are per directory batch, so a reviewer reads one coherent area at a time. [evidence: seven disjoint directory batches (`b1`-`b7`); final state committed together after the whole gate]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

The phase is a pure comment pass: section banners converge on one vocabulary and order across the
component tree, proven to move neither a rendered value, the guardrail fence count, nor the `@ds` line
set, and green across the whole gate from the final state.
<!-- /ANCHOR:summary -->
