---
title: "Phase E — Root source banners: headers and numbered sections across the repo-root code"
description: "Ensure every repo-root code file has a // MODULE: header and numbered // N. SECTION banners — 47 files across packages, scripts, extensions, release and root tests. Comment-only: the non-comment source stays byte-identical, typecheck is clean, and the affected suites stay green."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-relay-source-structure/005-root-source-banners"
    last_updated_at: "2026-08-24T21:41:27.992Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "47 repo-root code files headered and bannered; source byte-identical, suites green."
    next_safe_action: "Proceed to 006-root-folder-docs."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase E — Root source banners

> **Phase links** — Parent: [`../spec.md`](../spec.md) · Predecessor: `004-folder-ownership-map` · Successor: `006-root-folder-docs`

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `006-relay-source-structure` |
| Level | 2 |
| Writer | CLI executor (banner insertion) + Claude (contract, verification, git) |
| Barrier | non-comment source byte-identical + typecheck + the affected suites green |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

The code at the repo root that both apps depend on — the shared `pi-rpc-protocol` package, the build and
gate `scripts`, the three Pi `extensions`, the `release` tooling and the root `tests` — reads unevenly.
Of its 47 code files, 31 open with a `// MODULE:` banner but have no interior section markers, and 16
have no header at all. This phase gives every file a `// MODULE:` header and numbered `// N. SECTION`
banners in the same box-drawing form the two apps use, so the shared code reads the same way. Nothing but
comments change.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:** the 47 repo-root code files under `packages`, `scripts`, `extensions`, `release` and
`tests` (`.ts`, `.mjs`, `.cjs`, `.js`, excluding built `dist/`). Each gains a `// MODULE:` header if it
lacks one and numbered section banners; test files use the test-section vocabulary; a shebang stays on
line 1 with the banner after it.

**Out of scope:** any change to imports, types, constants, functions or statements; the app-relay and
app-mobile source (covered elsewhere); the missing folder READMEs (phase F); built output under `dist/`.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — Every one of the 47 files opens with a `// MODULE:` header (added where missing, kept
  where present) in the box-drawing form (a rule of 67 `─`, the MODULE line, a matching rule).
- **REQ-002** — Each file gains numbered section banners for the parts it has; a source file uses
  imports / types / constants / helpers / core logic / exports, a test file uses imports / fixtures /
  helpers / setup / tests.
- **REQ-003** — The pass is comment-only: the multiset of non-comment, non-blank lines is identical
  before and after, per file.
- **REQ-004** — A shebang stays on line 1; no banner is inserted inside a multi-line construct or a
  function/describe/it body.
- **REQ-005** — Typecheck passes and the affected suites (root, package and extension tests) stay green
  from the final state.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. All 47 files carry a `// MODULE:` header and numbered section banners.
2. The non-comment source is byte-identical to the pre-pass source, proven per file.
3. Typecheck passes and the affected suites stay green from the final state.
4. Every added line is a comment or a blank; nothing is deleted; shebangs stay on line 1.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **A banner changes a value inside a template literal or a script's inline string** — guarded by the
  byte-identical non-comment check plus typecheck and the suites, which a changed value would fail.
- **A shebang is displaced, breaking an executable script** — the contract keeps the shebang on line 1;
  typecheck and a smoke of the scripts confirm they still parse and run.
- **The shared package feeds both apps** — a value change would ripple; the multiset check and typecheck
  catch it before it reaches either app.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

None. The header and section vocabulary follow the established repo convention; the executor makes only
the boundary judgement of where each section starts.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `../spec.md` — the phase parent.
- `../001-source-section-banners/` and `../002-bare-file-headers/` — the relay passes this mirrors.
- `packages/pi-rpc-protocol/src/` — the shared package both apps depend on.
<!-- /ANCHOR:cross-refs -->
