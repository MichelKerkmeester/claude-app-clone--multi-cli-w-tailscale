---
title: "Phase B — Comment structure: one Svelte section vocabulary across every component"
description: "Harmonize the section-banner comments the migration already uses so every .svelte file names its script sections with one canonical vocabulary and order, adds banners to the significant files that lack them, and leaves the @ds design-system comments and the 277 guardrail fences untouched."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/020-source-structure/002-comment-structure"
    last_updated_at: "2026-08-24T11:01:11Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Phase B complete; 55 files harmonized; fences 277; whole gate green."
    next_safe_action: "Proceed to Phase C (update the sk-code-mobile-cli skill)."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase B — Comment structure

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `020-source-structure` |
| Level | 2 |
| Writer | executor (`app-mobile/src/**` section banners) + Claude (verification, git, barrier) |
| Barrier | fences stay 277 + `@ds` content unchanged + the whole gate green |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

The migration authored its `.svelte` files with `sk-code`'s numbered section banners, but only 51 of 96
files carry them and the vocabulary drifted. `DERIVED STATE` and `LOCAL STATE` swap positions across
files (14 each way), and the same concept appears under synonyms — `PUBLIC PROPS`, `RENDER STATE`,
`PROPS AND STATE`. A reader who learns one file's layout cannot rely on it in the next. One canonical
vocabulary and order, applied everywhere it belongs, makes every component navigable the same way.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:** the numbered `// N. LABEL` section banners inside `.svelte` files — normalize their
vocabulary and order, renumber them sequentially, and add them to the significant files that lack them.
The canonical order is `IMPORTS → PROPS → LOCAL STATE → DERIVED STATE → EFFECTS → HANDLERS → HELPERS`.

**Out of scope:** the `@ds` design-system comment vocabulary (`@ds edit`, `@ds state`, `@ds slot`,
`@ds surface`, and every `@ds guardrail: do-not-edit` fence) — never edited, moved, or reformatted. The
277 guardrail fences stay exactly 277. Trivial pass-through primitives (imports + props + markup, no
real script structure) stay bare; a banner there is noise. No behavior change, no rendered value change.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — Section banners use the canonical vocabulary and order; synonyms normalize (`PUBLIC
  PROPS` → `PROPS`, `RENDER STATE` → `DERIVED STATE`, `PROPS AND STATE` → `PROPS` + `LOCAL STATE`).
- **REQ-002** — Genuinely domain-specific section names that carry real meaning (`MARKDOWN MODEL`,
  `BOUNDED PARSER`, `LIVE REGION STATE`) are preserved, not flattened to a generic label.
- **REQ-003** — Banners renumber sequentially from 1 over the sections actually present in each file;
  file headers and module banners are not counted as numbered sections.
- **REQ-004** — The significant bare files gain banners; trivial pass-through primitives stay bare, and
  the skip list is recorded rather than silently dropped.
- **REQ-005** — Every `@ds` comment is byte-for-byte unchanged and the guardrail fence count stays 277;
  a section reorders only when it moves no declaration ahead of one it references.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. Every bannered and every significant file names its sections with the one canonical vocabulary and
   order; a grep for the old synonyms returns zero.
2. The guardrail fence count is 277 and the total `@ds` line count is unchanged from baseline.
3. Build, typecheck, `test:web`, catalog smoke and token identity stay green from the final state.
4. The skip list of trivial primitives is recorded in the implementation summary.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **An executor reformats or drops an `@ds` fence, breaking the 277 count.** This corrupted an earlier
  attempt. The contract forbids touching any line containing `@ds`; the barrier re-counts fences and
  diffs every `@ds` line after each batch, reverting a batch that changed one.
- **Reordering a section moves a `$derived` ahead of the `$state` it reads, causing a temporal-dead-zone
  break.** Reordering is allowed only when it introduces no such forward reference; build and `test:web`
  from the final state catch a break value resolution cannot see.
- **A banner is added to a trivial primitive, adding noise.** The coverage rule keeps banners to files
  with real script structure; the skip list makes the boundary auditable.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

None. The operator approved the canonical order (`LOCAL STATE` before `DERIVED STATE`), the coverage
(harmonize the 51 bannered plus the significant bare files, skip trivial primitives), and the
preserve-domain-sections rule.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `../spec.md` — the phase parent.
- `../001-css-ownership/` — Phase A, the CSS ownership sibling.
- `sk-code` §code-organization — the numbered-section banner convention this vocabulary follows.
<!-- /ANCHOR:cross-refs -->
