---
title: "Phase A checklist — source section banners barrier"
description: "Barrier sign-off for the numbered section banners on the 36 module files: non-comment source byte-identical, only comment lines added, typecheck and the app-relay suite green."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-relay-source-structure/001-source-section-banners"
    last_updated_at: "2026-08-24T19:42:47.201Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "All barrier items proven; banners added, non-comment source byte-identical, suite green."
    next_safe_action: "Proceed to 002-bare-file-headers."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase A checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. A comment-only pass is
proven by byte-identity of the non-comment source, not by inspection.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [x] **CHK-PRE-01** [P0] The code-line multiset baseline is captured for the 36 files before any edit. [evidence: 36 per-file `sha256` hashes of the sorted non-comment lines stored before any edit; 19,571 code lines]
- [x] **CHK-PRE-02** [P1] The 36 files are confirmed to already carry a `// MODULE:` header. [evidence: `grep '^// MODULE:'` matched 36/36]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [x] **CHK-CQ-01** [P0] The non-comment source is byte-identical before and after, per file. [evidence: code-line multiset diff — `0/36` files differ]
- [x] **CHK-CQ-02** [P0] Only comment and blank lines were added; nothing was deleted. [evidence: `git diff` over the 36 files — 0 deletions, 462 comment lines added, 0 non-comment non-blank additions]
- [x] **CHK-CQ-03** [P1] Every file gained numbered section banners for the sections it has. [evidence: executor reported 2–5 banners per file; 36/36 files carry `// N.` banners]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] **CHK-TEST-01** [P0] Typecheck passes from the final state. [evidence: `tsc --noEmit` rc 0]
- [x] **CHK-TEST-02** [P0] The app-relay suite passes on its explicit `tests` directory, matching the baseline. [evidence: `vitest run tests` — 46 files / 307 tests passed, matching the pre-pass baseline]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [x] **CHK-FIX-01** [P1] No banner was inserted inside a multi-line construct. [evidence: code-line multiset `0 of 36` differ; `vitest run tests` 307 passed — a banner inside a template literal would change a value and fail the suite]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [x] **CHK-SEC-01** [P1] No rendered value, security boundary, route or behaviour changed — a pure comment insertion. [evidence: code-line multiset `0/36` differ; `tsc` rc 0; `vitest run tests` 307 passed]
- [x] **CHK-SEC-02** [P1] Nothing under `specs/context/**` touched. [evidence: no change under `specs/context/`]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [x] **CHK-DOC-01** [P1] `validate.sh --strict` exit 0 through its realpath. [evidence: `validate.sh <packet> --strict` exit 0, run through its realpath]
- [x] **CHK-DOC-02** [P1] No banner comment carries a spec path or artifact id. [evidence: the `462` added lines are all `// N. TITLE` or `// ─` box rules; no path or id present]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [x] **CHK-ORG-01** [P1] The banners are scoped to the 36 `app-relay/src` module files; no other file changed for this phase. [evidence: `git diff` names only the 36 listed `.ts` files]
- [x] **CHK-ORG-02** [P2] Each file's sections read in the canonical order (imports → types → constants → helpers → core logic → exports). [evidence: banners renumbered 1..N over only the sections present, no gaps]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

The 36 module files gained numbered section banners, proven comment-only by a byte-identical non-comment
multiset and a `git diff` that adds only comment lines, with typecheck and the full suite green.
<!-- /ANCHOR:summary -->
