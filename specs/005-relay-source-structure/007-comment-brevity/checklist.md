---
title: "Phase G checklist — comment brevity barrier"
description: "Barrier sign-off for trimming verbose inline comments across the backend and shared code: AST-identical modulo comments, fences 277, typecheck and the affected suites green."
trigger_phrases:
  - "comment brevity verification checklist"
  - "comment brevity packet"
  - "verification checklist"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-relay-source-structure/007-comment-brevity"
    last_updated_at: "2026-08-25T03:30:44.319Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "All barrier items proven; comments trimmed, AST-identical, suites green."
    next_safe_action: "None — the backend and shared source-structure group is complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase G checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. A comment trim is proven
by an AST re-print with comments removed, not by a line or token diff — the standalone scanner mis-spans
template literals.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [x] **CHK-PRE-01** [P1] The AST re-print comparator is prepared before the trim. [evidence: `tokdiff.cjs` parses each file and hashes `printFile` with `removeComments:true`]
- [x] **CHK-PRE-02** [P1] The target file lists are the banner-pass surfaces. [evidence: 37 `app-relay/src` files and 47 repo-root code files]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [x] **CHK-CQ-01** [P0] Every touched file is AST-identical modulo comments — comment-only. [evidence: `tokdiff.cjs` — app-relay `37/37` and root `47/47` AST-identical, 0 code changed]
- [x] **CHK-CQ-02** [P1] Verbose blocks are shortened, not just reflowed; comment-line count drops. [evidence: app-relay comment lines `913 → 770`; `60` of 84 files trimmed (32 relay + 28 root)]
- [x] **CHK-CQ-03** [P1] Section banners and shebangs are unchanged. [evidence: `// MODULE:`/`// N.` banners intact; `0` shebangs lost or moved from line 1]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] **CHK-TEST-01** [P0] Typecheck passes across the workspace from the final state. [evidence: `npm run typecheck` across 5 workspaces, 0 errors]
- [x] **CHK-TEST-02** [P0] The affected suites pass from the final state. [evidence: `npm test` 55 files / 401 tests; app-relay `vitest run tests` 46 / 307; inbound-media 8 / 8]
- [x] **CHK-TEST-03** [P1] The trimmed gate scripts still run and parse. [evidence: `scan-comments.mjs` reports fences 277; `node --check` on the modified scripts, 0 syntax failures]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [x] **CHK-FIX-01** [P0] Every `@ds` guardrail fence is kept; the fence count stays 277. [evidence: `scan-comments.mjs` guardrailFences 277, unchanged]
- [x] **CHK-FIX-02** [P1] The one intermittent test failure is the pre-existing flake, not a regression. [evidence: `tests/auth.test.ts` 201-vs-403 timing flake, unmodified; `npm test` re-ran 401/401 green]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [x] **CHK-SEC-01** [P1] No behaviour changed — a pure comment trim. [evidence: AST-identical modulo comments; typecheck and the suites green]
- [x] **CHK-SEC-02** [P1] Nothing under `specs/context/**` touched, and no file outside the target lists changed. [evidence: `git status` — all changes within the 37 + 47 lists, `0` out-of-list files]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [x] **CHK-DOC-01** [P1] `validate.sh --strict` exit 0 through its realpath. [evidence: `validate.sh <packet> --strict` exit 0, run through its realpath]
- [x] **CHK-DOC-02** [P1] No trimmed comment introduces a spec path or artifact id. [evidence: `scan-comments.mjs` comment-hygiene clean; trims only remove or shorten prose]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [x] **CHK-ORG-01** [P1] The trim is scoped to the backend and shared code; app-mobile is untouched here. [evidence: `git diff` names only `app-relay/src`, `packages`, `scripts`, `extensions`, `release`, `tests`]
- [x] **CHK-ORG-02** [P2] Comments now read at a consistent concise density across the surface. [evidence: verbose multi-line JSDoc collapsed to one-line durable-WHY across 60 files]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

Verbose inline comments across app-relay and the repo-root code were trimmed to a concise durable-WHY
form, proven comment-only by an AST re-print (0 code changed), with the fence count at 277 and typecheck
and the affected suites green.
<!-- /ANCHOR:summary -->
