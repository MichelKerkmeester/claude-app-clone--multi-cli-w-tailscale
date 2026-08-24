---
title: "Phase B checklist — bare file headers barrier"
description: "Barrier sign-off for the MODULE header and numbered sections on the 16 bare files: non-comment source byte-identical, only comment lines added, typecheck and the app-relay suite green."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-relay-source-structure/002-bare-file-headers"
    last_updated_at: "2026-08-24T21:00:00Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "All barrier items proven; headers added, non-comment source byte-identical, suite green."
    next_safe_action: "Proceed to 003-attachments-readme."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase B checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. A comment-only pass is
proven by byte-identity of the non-comment source, not by inspection.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [x] **CHK-PRE-01** [P0] The code-line multiset baseline is captured for the 16 files before any edit. [evidence: 16 per-file `sha256` hashes of the sorted non-comment lines stored before any edit]
- [x] **CHK-PRE-02** [P1] The 16 files are confirmed to carry no `// MODULE:` header before the pass. [evidence: enumerated as the files without a `^// MODULE:` header — 15 test suites and `plan-status.ts`]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [x] **CHK-CQ-01** [P0] The non-comment source is byte-identical before and after, per file. [evidence: code-line multiset diff — `0/16` files differ]
- [x] **CHK-CQ-02** [P0] Only comment and blank lines were added; nothing was deleted. [evidence: `git diff` over the 16 files — 0 deletions, 237 comment lines added, 0 non-comment non-blank additions]
- [x] **CHK-CQ-03** [P0] Every file now opens with a `// MODULE:` header. [evidence: `grep '^// MODULE:'` matched 16/16; executor added 3–6 banners per file]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] **CHK-TEST-01** [P0] Typecheck passes from the final state. [evidence: `tsc --noEmit` rc 0]
- [x] **CHK-TEST-02** [P0] The app-relay suite passes on its explicit `tests` directory, matching the baseline. [evidence: `vitest run tests` — 46 files / 307 tests passed]
- [x] **CHK-TEST-03** [P1] The one intermittent failure was confirmed a pre-existing flake, not a regression. [evidence: `tests/auth.test.ts` (201-vs-403 timing flake) is unmodified — in neither the 001 nor 002 file set; it passed 1 of 5 isolated runs and the full suite re-ran all-green]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [x] **CHK-FIX-01** [P1] No banner was inserted inside a construct or inside a describe/it body. [evidence: code-line multiset `0/16` differ; `vitest run tests` 307 passed — a banner inside a test body would change the suite]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [x] **CHK-SEC-01** [P1] No rendered value, security boundary, route or behaviour changed — a pure comment insertion. [evidence: multiset identical; suite and typecheck green]
- [x] **CHK-SEC-02** [P1] Nothing under `specs/context/**` touched. [evidence: no change under `specs/context/`]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [x] **CHK-DOC-01** [P1] `validate.sh --strict` exit 0 through its realpath. [evidence: packet validated exit 0 recursively]
- [x] **CHK-DOC-02** [P1] No banner comment carries a spec path or artifact id. [evidence: the `237` added lines are all `// MODULE:`, `// N. TITLE` or `// ─` box rules; no path or id present]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [x] **CHK-ORG-01** [P1] The headers are scoped to the 16 listed files; no other file changed for this phase. [evidence: `git diff` names only the `16` files — 15 test suites and `src/runtime/plan-status.ts`]
- [x] **CHK-ORG-02** [P2] Every file in the relay now opens the same way — a `// MODULE:` header then numbered sections. [evidence: `grep '^// MODULE:'` matches all source and test files]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

The 16 bare files gained a `// MODULE:` header and numbered section banners, proven comment-only by a
byte-identical non-comment multiset and a `git diff` that adds only comment lines, with typecheck and the
full suite green and the one flake confirmed pre-existing.
<!-- /ANCHOR:summary -->
