---
title: "Phase 2 — Svelte refactor: humanize comments across every .svelte file, re-anchor the gate"
description: "Apply the natural human-voice comment convention to every .svelte file in the repo, comment-only: retire the @ds markers, add a module-script header and in-markup section labels, give each function/effect/rule a one-line purpose comment, keep the numbered section banners, and replace @ds guardrail with a greppable do-not-edit note. Re-anchor scripts/naming/scan-comments.mjs onto the new marker so the frozen-seam fence count is preserved. Proven per file by a non-comment byte-identical check, and suite-wide by @ds count 0, banners intact, fences preserved at 273, token-identity 0-diff, and test:web green."
contextType: "implementation"
importance_tier: "normal"
trigger_phrases:
  - "svelte refactor spec requirements"
  - "svelte refactor packet"
  - "spec requirements"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/020-source-structure/007-comment-humanization/002-svelte-refactor"
    last_updated_at: "2026-08-25T20:45:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Source @ds retired comment-only; verified and pushed."
    next_safe_action: "None — phase 2 complete; phase 3 reverifies the skill."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 2 — Svelte refactor

> **Phase links** — Parent: [`../spec.md`](../spec.md) · Predecessor: `001-skill-convention`

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `007-comment-humanization` |
| Level | 2 |
| Executor | luna 5.6 (gpt-5.6-luna) xhigh via `cli-codex`, per file; Claude owns per-file and suite verification and the push |
| Barrier | per file: non-comment content byte-identical · suite: `@ds` count 0 in `.svelte` · banners intact · do-not-edit fences preserved at 273 · token-identity 0-diff · `test:web` green |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

The convention is written in the skill (phase 1); this phase applies it to the source so the whole client
reads in one human voice. Every `.svelte` file loses its `@ds` markers and gains the navigation the pilot
established: a module-script header, in-markup section labels, and a one-line purpose comment on each
function, effect and rule. The numbered section banners stay. It is comment-only — no rendered value, no
behaviour, no markup structure changes — and the `screen-chat.svelte` pilot is the register every file
matches.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope (full @ds retirement — 1632 lines):** the comments of every `.svelte` file (1018 lines / 95
files), `app.css` (605 lines), and the 3 `.ts` files (9 lines) under `app-mobile/src/**` — retire every
`@ds` marker, add the module header (`.svelte`/`.ts`), add `<!-- section -->` markup labels, add per-part
purpose comments, keep the `MODULE:` and numbered section banners. Convert `app.css`'s design-system seams
(`@ds edit: tokens|layout`, `@ds surface/slot/state/variant`, `@ds theme`) to natural notes that keep the
editability meaning as durable WHY, and every `@ds guardrail: do-not-edit` (in any file) to the greppable
"Do not edit — <why>" note. Re-anchor `scripts/naming/scan-comments.mjs` so its guardrail-fence counter
reads the new do-not-edit marker instead of `@ds guardrail:`, keeping the fence-count invariant (≥ the
prior 277). Update `scripts/naming/verify-comment-only.mjs` / any `@ds`-aware scan in lockstep.

**Out of scope:** any non-comment edit (no CSS rule, value, selector, markup, or logic change — every
`@ds` is a comment, so retirement is comment-only); the skill (phases 1 and 3); the historical
changelogs; app behaviour, routing, a11y contracts, and rendered values.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — Every `.svelte` file's non-comment content is byte-identical before and after (comment-span
  strip + hash per file); the change is comment-only.
- **REQ-002** — No `@ds` marker remains in any `.svelte`, `app.css`, or `.ts` source; every file carries
  the natural convention (module header where a module scope exists, markup section labels, per-part
  purpose comments, app.css seams as natural notes), and the numbered section banners are intact.
- **REQ-003** — The frozen-seam safety net is preserved: every `@ds guardrail: do-not-edit` becomes a
  greppable do-not-edit note, and `scan-comments.mjs` counts them so the fence total is preserved at 273 —
  no frozen seam silently dropped.
- **REQ-004** — token-identity resolves 0-diff (65 tokens × 3 themes), `test:web` is green, and no rendered
  value / a11y / routing / security behaviour changes.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. `grep -rl '@ds' app-mobile/src` returns nothing (`.svelte`, `app.css`, and `.ts` all clean); the convention is applied everywhere.
2. Every file passes the non-comment byte-identical check; banners intact.
3. The do-not-edit fence count is preserved at 273 under the re-anchored gate; token-identity 0-diff; `test:web` green.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **A non-comment edit slips in.** A reworded comment that also touches code fails the per-file
  non-comment hash; the file is reverted and redone comment-only. This is the primary gate.
- **The guardrail net is silently dropped.** If the gate is not re-anchored before the `@ds` fences are
  removed, the frozen-seam count falls to 0 unnoticed. Mitigation: re-anchor the gate first, prove the
  count holds, then remove the old markers.
- **The live-follow daemon reverts an uncommitted batch.** Mitigation: each file (or small batch) is
  edited and committed atomically; Claude verifies the committed state before the next batch.
- Depends on phase 1 having landed the written convention.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

None blocking. The exact do-not-edit wording the gate counts is fixed in this phase and phase 1 is updated
to match if it differs.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `../spec.md` — the phase parent.
- `../001-skill-convention/` — the written convention this phase applies.
- `../../006-bem-css/` — the prior comment/CSS pass and its token-identity + test:web gates.
- `app-mobile/src/pages/chat/screen-chat.svelte` — the approved reference file.
<!-- /ANCHOR:cross-refs -->
