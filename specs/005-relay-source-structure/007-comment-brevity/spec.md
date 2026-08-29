---
title: "Phase G — Comment brevity: trim verbose inline descriptions in the backend and shared code"
description: "Shorten over-long inline comment descriptions across app-relay and the repo-root code toward a concise durable-WHY style, keeping the section banners and guardrail fences. Comment-only, proven by an AST re-print that is byte-identical modulo comments."
trigger_phrases:
  - "comment brevity spec requirements"
  - "comment brevity packet"
  - "spec requirements"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-relay-source-structure/007-comment-brevity"
    last_updated_at: "2026-08-25T03:30:44.319Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "app-relay and root comments trimmed; AST-identical, typecheck and suites green."
    next_safe_action: "None — the backend and shared source-structure group is complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase G — Comment brevity

> **Phase links** — Parent: [`../spec.md`](../spec.md) · Predecessor: `006-root-folder-docs`

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `005-relay-source-structure` |
| Level | 2 |
| Writer | CLI executor (comment trim) + Claude (contract, AST verification, git) |
| Barrier | AST re-print identical modulo comments + fences 277 + typecheck + suites green |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

The banner passes made the backend and shared code navigable, but some files still carry inline comment
descriptions that run several lines to narrate what the code already says. This phase shortens those to a
concise durable style — a comment states the non-obvious WHY in a line or two, matching the sk-code
convention — across `app-relay` and the repo-root code. The section banners stay, the guardrail fences
stay, and no code changes.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:** verbose multi-line `//` and `/* */` comment blocks in the 37 `app-relay/src` files and the
47 repo-root code files, collapsed to concise WHY-comments. Section banners (`// ─`, `// MODULE:`,
`// N.`), shebangs, and `@ds` guardrail fences are kept verbatim.

**Out of scope:** app-mobile comments (a separate child under the migration packet); any code, type or
value change; the banner and folder-doc phases already shipped.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — Over-long inline comment descriptions are shortened to a concise durable-WHY form; a
  comment that only restates the code or a name is removed.
- **REQ-002** — The change is comment-only: each file's AST re-printed with comments removed is identical
  before and after.
- **REQ-003** — Section banners, shebangs and every `@ds` guardrail fence are unchanged; the fence count
  stays 277.
- **REQ-004** — Genuine WHY comments — invariants, edge cases, security boundaries — are kept, tightened
  only where clearly bloated.
- **REQ-005** — Typecheck passes and the affected suites (app-relay and root) stay green from the final
  state.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. Verbose comment blocks in the backend and shared code read concisely, banners intact.
2. Every touched file is AST-identical modulo comments — provably comment-only.
3. The fence count is 277; typecheck and the affected suites stay green.
4. Comment-line count drops; no code token changes.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **A trim removes a load-bearing comment (a fence or a real WHY).** Guarded by keeping `@ds` fences
  verbatim (count stays 277) and by the executor contract to preserve genuine WHY comments.
- **A trim silently changes code.** Guarded by an AST re-print check (`removeComments`) per file — the
  raw line/token diff is unreliable around template literals, the AST parse is not.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

None. The concise-WHY target follows the sk-code convention; the executor makes the per-comment judgement
of what to keep.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `../spec.md` — the phase parent.
- `../005-root-source-banners/` — the banner pass this trims the comments of.
- `../../system-spec-kit/constitutional/comment-hygiene.md` — the durable-WHY comment convention.
<!-- /ANCHOR:cross-refs -->
