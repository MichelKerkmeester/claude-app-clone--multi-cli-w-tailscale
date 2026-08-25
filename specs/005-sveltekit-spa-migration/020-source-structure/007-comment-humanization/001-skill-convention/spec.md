---
title: "Phase 1 — Skill convention: teach the natural comment convention, retire @ds in the surface skill"
description: "Update the sk-code-mobile-cli surface skill so it teaches the natural human-voice comment convention and no longer instructs authors to write @ds markers. Rewrite the comment references (ds-grammar.md, comment-grammar.md, editability-guardrails.md) and every reference that cites @ds; keep the numbered section banners and the module banner; describe the module-script header, in-markup section labels, per-function purpose lines, and the greppable do-not-edit note that replaces @ds guardrail. Skill docs only; landed via the Public worktree flow. Proven by scan-skill-references broken:0, the router-sync bijection, packet-scoped drift-guard delta 0, and a version changelog."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/020-source-structure/007-comment-humanization/001-skill-convention"
    last_updated_at: "2026-08-25T19:25:28.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Scoped; ready to update the skill's comment references off @ds."
    next_safe_action: "Rewrite the skill's @ds comment references to the natural convention; land via Public worktree."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 1 — Skill convention

> **Phase links** — Parent: [`../spec.md`](../spec.md) · Predecessor: `006-bem-css` (prior group child)

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `007-comment-humanization` |
| Level | 2 |
| Surface | Public monorepo skill `sk-code/sk-code-mobile-cli` (+ hub `sk-code` if the RESOURCE_MAP changes) |
| Executor | luna 5.6 (gpt-5.6-luna) xhigh via `cli-codex`; Claude owns the barrier verification and the Public landing |
| Barrier | `scan-skill-references` broken:0 · router-sync bijection green · drift-guard packet delta 0 · skill loads · changelog + version bump |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

The surface skill teaches the `@ds` grammar as the comment contract — `ds-grammar.md` is a full reference
for it, `comment-grammar.md` layers it on the banners, and ~20 other skill files cite an `@ds` marker.
Phase 2 retires `@ds` from the client source, so the skill must first stop teaching it and start teaching
the natural convention the operator approved on the `screen-chat.svelte` pilot. Updating the skill first
gives the refactor a written authority to follow, and keeps the skill from instructing the next author
back into the grammar we are removing.

The convention this phase documents: keep the `MODULE:` banner and the numbered ALL-CAPS box-drawing
section banners; add a plain-English header to each `<script module>` island; label each markup region
with an `<!-- section -->` comment; give each function, effect and rule a one-line purpose comment in
human voice; and replace `@ds guardrail: do-not-edit` with a natural, consistent "Do not edit — <why>"
note that stays greppable so the frozen-seam safety net survives the rename.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:** the `sk-code-mobile-cli` skill's comment-convention teaching —
- Rewrite `references/comment-grammar.md` as the single source for the natural convention (banners kept;
  module header, markup labels, per-part purpose lines; the do-not-edit note).
- Retire `references/ds-grammar.md` — repoint or fold its content into `comment-grammar.md` /
  `editability-guardrails.md`; update the RESOURCE_MAP and any router entry that named it.
- Rewrite `references/editability-guardrails.md` so the frozen-seam contract is expressed as the natural
  do-not-edit note (greppable marker) rather than `@ds guardrail:`.
- Update every reference and asset that instructs `@ds` authoring so it no longer does:
  `a11y-parity.md`, `component-tokens.md`, `browser-free-verification-recipe.md`, `verification.md`,
  `token-library.md`, `theme-remap.md`, `scoped-style-ownership.md`, `css-class-naming-bem.md`,
  `standards/code-standards.md`, `manual-testing-playbook/guardrail-routing.md`,
  `manual-testing-playbook/ds-grammar-routing.md`, and the `assets/*-checklist.md` that cite `@ds`.
- Update `SKILL.md` (§3b conventions, §2b RESOURCE_MAP) and `README.md`; add a version changelog entry.

**Out of scope:** any `.svelte` / `.css` / `.ts` source edit (that is phase 2); the `scan-comments.mjs`
gate itself (re-anchored in phase 2 alongside the source); the historical `changelog/v*.md` entries
(they are history and keep their `@ds` mentions); the design-system SEMANTICS `@ds` encoded (token /
theme / slot meaning) except to restate them in natural prose where a reference relied on the marker.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — After this phase the skill teaches the natural convention and instructs `@ds` authoring
  nowhere; every live reference and asset reads in human voice, banners kept.
- **REQ-002** — The frozen-seam contract survives: `editability-guardrails.md` defines a natural,
  greppable do-not-edit marker and states that phase 2 re-anchors `scan-comments.mjs` onto it so the
  fence count is preserved, not dropped.
- **REQ-003** — `ds-grammar.md` is retired cleanly: no live reference, RESOURCE_MAP entry, router row or
  trigger phrase points at a file that no longer teaches the convention; `scan-skill-references` is
  broken:0 and the router-sync bijection holds.
- **REQ-004** — The skill still loads and the packet-scoped drift-guard delta is 0; a changelog entry and
  a version bump record the change.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. `grep -rl '@ds' <skill>` returns only the historical `changelog/v*.md` files (or the retained
   design-system semantic references, restated in prose) — no live comment-convention teaching of `@ds`.
2. `scan-skill-references.mjs` broken:0 across every touched reference; RESOURCE_MAP and router-sync agree.
3. The `run-all-drift-guards.sh` packet-scoped delta for `/skills/sk-code/` is 0.
4. The skill loads and a new-version changelog entry exists.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **Dropping the guardrail safety net.** `@ds guardrail:` is a searchable enumeration of frozen a11y /
  security / logic seams the `scan-comments` gate counts (277). If retirement leaves only free-form
  prose, that enumeration is lost. Mitigation: a consistent natural do-not-edit opener that stays
  greppable, with the gate re-anchored on it in phase 2 (this phase writes the contract; phase 2 enforces).
- **A dangling `ds-grammar.md` reference.** Retiring a reference without repointing its RESOURCE_MAP /
  router / trigger-phrase citations breaks `scan-skill-references` or the router-sync bijection. Mitigation:
  the drift-guard recipe from [[public-cross-repo-skill-landing-flow]] — leaf §2b is source of truth, hub
  ROUTER.md §11 is its exact re-prefixed union.
- **Public landing.** Cross-repo push to `skilled/v4.0.0.0` needs the isolated worktree, the three
  pre-push gates, and a fresh push go-ahead — never staged in the shared checkout.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

None blocking. The do-not-edit marker stays a natural sentence opener (prose, not an `@ds`-style prefix)
so it satisfies the human-voice ask while remaining greppable; phase 2 chooses the exact wording the gate
counts and this phase is updated to match if it differs.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `../spec.md` — the comment-humanization phase parent.
- `../002-svelte-refactor/` — applies this convention to the source and re-anchors the gate.
- `../../../019-surface-skill-refresh/` — the surface-skill phase this extends.
- `[[public-cross-repo-skill-landing-flow]]` — the Public worktree landing flow and the drift-guard recipe.
<!-- /ANCHOR:cross-refs -->
