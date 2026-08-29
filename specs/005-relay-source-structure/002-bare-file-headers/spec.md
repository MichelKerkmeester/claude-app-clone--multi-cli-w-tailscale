---
title: "Phase B — Bare file headers: module header and sections for the 16 unbannered files"
description: "Give the 16 app-relay files with no header — 15 test suites and src/runtime/plan-status.ts — a // MODULE: banner and the same numbered section markers the rest of the source carries. Comment-only: the non-comment source stays byte-identical and the suite stays green."
trigger_phrases:
  - "bare file headers spec requirements"
  - "bare file headers packet"
  - "spec requirements"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-relay-source-structure/002-bare-file-headers"
    last_updated_at: "2026-08-24T19:45:13.934Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "16 bare files headered with MODULE + numbered sections; source byte-identical, suite green."
    next_safe_action: "Proceed to 003-attachments-readme."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase B — Bare file headers

> **Phase links** — Parent: [`../spec.md`](../spec.md) · Predecessor: `001-source-section-banners` · Successor: `003-attachments-readme`

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `005-relay-source-structure` |
| Level | 2 |
| Writer | CLI executor (banner insertion) + Claude (contract, verification, git) |
| Barrier | non-comment source byte-identical + the app-relay suite green |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

Sixteen files carry no header banner at all: fifteen test suites under `app-relay/tests` and the one
runtime helper `src/runtime/plan-status.ts`. Every other source and test file opens with a `// MODULE:`
header, so these read as the odd ones out. This phase gives each a `// MODULE:` banner naming what it
is, then the same numbered section markers as the rest of the source — for a test file, the sections
are imports, fixtures, helpers, setup and tests. Nothing but comments change.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:** the 16 files with no `// MODULE:` header — `src/runtime/plan-status.ts` and 15 suites
under `app-relay/tests`. Each gains a `// MODULE:` banner and numbered section banners in the repo's
box-drawing form. A test suite header names it `<NAME> TESTS` and its sections are imports, fixtures,
helpers, setup and tests.

**Out of scope:** the 36 already-headered files (phase A); any change to code, fixtures, assertions or
test order; the README and folder map (phases C, D).
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — Each of the 16 files gains a `// MODULE:` header banner naming the file's subject, in
  the box-drawing form (a rule of 67 `─`, the MODULE line, a matching rule, one blank line).
- **REQ-002** — Each file then gains numbered section banners for the parts it has; a source file uses
  imports / types / constants / helpers / core logic / exports, a test file uses imports / fixtures /
  helpers / setup / tests.
- **REQ-003** — The pass is comment-only: the multiset of non-comment, non-blank lines is identical
  before and after, per file.
- **REQ-004** — No banner is inserted inside a multi-line construct; banners sit only between top-level
  declarations, and for tests before the first `describe(`.
- **REQ-005** — The app-relay suite passes from the final state, run on its explicit `tests` directory,
  matching the pre-pass count.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. All 16 files carry a `// MODULE:` header and numbered section banners.
2. The non-comment source is byte-identical to the pre-pass source, proven per file.
3. Typecheck passes and the app-relay suite stays green from the final state.
4. Every added line is a comment or a blank; nothing is deleted.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **A test's behaviour shifts because a banner split a construct** — guarded by the byte-identical
  non-comment check and the full suite, which would fail on any real change.
- **The suite count drifts** — the pre-pass baseline is 46 files / 307 tests; the final run must match,
  which catches a suite accidentally skipped or renamed.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

None. The header names and section vocabulary follow the repo convention; the executor makes only the
boundary judgement.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `../spec.md` — the phase parent.
- `../001-source-section-banners/` — phase A, the same pass over the already-headered files.
- `app-relay/tests/rpc.test.ts` — a test suite whose existing header sets the form for the new ones.
<!-- /ANCHOR:cross-refs -->
