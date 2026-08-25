---
title: "Phase 3 — Skill reverify: reconcile the skill with the shipped .svelte reality"
description: "After the refactor, re-read the sk-code-mobile-cli skill against what actually shipped in the .svelte source and the edge cases phase 2 surfaced (module-header wording, markup-label style, the do-not-edit marker the gate now counts). Fix any drift between what the skill teaches and what the code does; bump the skill version if it changes. Proven by a fresh grep of the shipped convention against the skill's claims, scan-skill-references broken:0, and the drift guards."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/020-source-structure/007-comment-humanization/003-skill-reverify"
    last_updated_at: "2026-08-25T19:25:28.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Scoped; runs after phase 2 refactor completes."
    next_safe_action: "After phase 2, diff the skill's claims against the shipped .svelte convention."
    blockers: ["phase 2 (002-svelte-refactor) ships the source first"]
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Phase 3 — Skill reverify

> **Phase links** — Parent: [`../spec.md`](../spec.md) · Predecessor: `002-svelte-refactor`

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `007-comment-humanization` |
| Level | 1 |
| Executor | luna 5.6 (gpt-5.6-luna) xhigh via `cli-codex` for any skill edit; Claude owns the reconciliation read and the push |
| Barrier | the skill's convention claims match the shipped `.svelte` reality · `scan-skill-references` broken:0 · drift-guard packet delta 0 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

Phase 1 wrote the convention before the refactor; phase 2 is where the edge cases surface — the exact
module-header wording, how a markup label reads when a region has no obvious name, and the precise
do-not-edit marker the gate ends up counting. This phase closes the loop: re-read the skill against the
shipped source and fix any place the skill now describes something the code no longer does (or omits a
pattern the refactor settled on). If nothing drifted, that is a recorded result, not a skipped step.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:** a reconciliation read of `comment-grammar.md`, `editability-guardrails.md`, `SKILL.md` §3b
and the touched references against the shipped `.svelte` convention and the re-anchored `scan-comments`
marker; any skill edit needed to remove drift; a version bump and changelog entry if the skill changes.

**Out of scope:** any further `.svelte` source change (that is phase 2's ledger); new conventions beyond
what phase 2 shipped; app behaviour.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — Every convention claim in the skill matches an actual pattern in the shipped `.svelte`
  source (module header, section labels, per-part comments, banners kept, the do-not-edit marker the gate
  counts); no claim describes a retired `@ds` form.
- **REQ-002** — `scan-skill-references` broken:0 and the drift-guard packet delta 0 after any edit; a
  version bump + changelog entry if the skill changed, or a recorded "no drift" result if it did not.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. A diff of the skill's convention claims against the shipped source shows no contradiction.
2. Reference integrity and the drift guards are green; the skill version records the final state.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:cross-refs -->
## 6. CROSS-REFERENCES

- `../spec.md` — the phase parent.
- `../001-skill-convention/` — the convention this phase reconciles against reality.
- `../002-svelte-refactor/` — the shipped source this phase reads.
<!-- /ANCHOR:cross-refs -->
