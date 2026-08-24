---
title: "Phase A — Source section banners: numbered sections in the 36 module files"
description: "Add numbered // N. SECTION banners to the 36 app-relay source files that already carry a // MODULE: header, so imports, types, constants, helpers and core logic read as marked sections. Comment-only: the non-comment source stays byte-identical and the suite stays green."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-relay-source-structure/001-source-section-banners"
    last_updated_at: "2026-08-24T21:00:00Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "36 module files gained numbered section banners; non-comment source byte-identical, suite green."
    next_safe_action: "Proceed to 002-bare-file-headers."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase A — Source section banners

> **Phase links** — Parent: [`../spec.md`](../spec.md) · Successor: `002-bare-file-headers`

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `006-relay-source-structure` |
| Level | 2 |
| Writer | CLI executor (banner insertion) + Claude (contract, verification, git) |
| Barrier | non-comment source byte-identical + the app-relay suite green |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

The 36 source files under `app-relay/src` each open with a `// MODULE:` banner but have no interior
markers. A reader has to scan to find where imports stop and the real work begins. This phase adds
numbered section banners — the same `// N. TITLE` form the web client uses — for the parts each file
actually has: imports, type definitions, constants, helpers, core logic and a trailing export block.
Nothing but comments change.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:** the 36 `app-relay/src/**` files that already carry a `// MODULE:` header. Each gains
numbered `// N. SECTION` banners in the repo's box-drawing form (a rule of 67 `─`, the numbered title,
a matching rule, one blank line), renumbered sequentially over only the sections present.

**Out of scope:** any change to imports, types, constants, functions, classes or statements; the 16
files that carry no `// MODULE:` header (phase B); the attachment README and folder map (phases C, D).
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — Each of the 36 files gains numbered section banners for the parts it contains, in the
  order imports, type definitions, constants, helpers, core logic, exports; absent parts are skipped
  and the numbering has no gaps.
- **REQ-002** — Every banner matches the existing `// MODULE:` rule exactly: `// ` then 67 `─`
  characters, the `// N. TITLE` line, a matching rule, and one blank line after.
- **REQ-003** — The pass is comment-only: the multiset of non-comment, non-blank source lines is
  identical before and after, per file.
- **REQ-004** — A banner is never inserted inside a multi-line construct (import list, object, array,
  template literal, function body); banners sit only between top-level declarations.
- **REQ-005** — The app-relay test suite passes from the final state, run on its explicit `tests`
  directory.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. All 36 files carry numbered section banners for the sections they have.
2. The non-comment source is byte-identical to the pre-pass source, proven per file.
3. Typecheck passes and the app-relay suite stays green from the final state.
4. No banner falls inside a statement; every added line is a comment or a blank.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **A banner lands inside a multi-line construct and changes a value** — most dangerous inside a
  template literal, where a comment line would become string content. Guarded by the byte-identical
  non-comment check plus a full suite run, which a changed string would fail.
- **A file is skipped or under-marked** — coverage is checked: every file must gain at least one banner
  and end with more banner rules than it began with.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

None. The banner form and section vocabulary follow the established repo convention; the executor makes
only the boundary judgement of where each section starts.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `../spec.md` — the phase parent.
- `../002-bare-file-headers/` — phase B, the same pass over the files that lack a header.
- `app-relay/src/index.ts` — the entrypoint whose `// MODULE:` banner sets the box-drawing form.
<!-- /ANCHOR:cross-refs -->
