---
title: "Phase C tasks — pilot, fan-out, tooling, gate"
description: "Extract component styles to co-located .css files: pilot one, fan out to the rest, repoint the readers, and prove the whole gate green from the final state."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/020-source-structure/003-css-files"
    last_updated_at: "2026-08-24T18:40:12.122Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "All tasks complete; every gate green from the final state."
    next_safe_action: "Proceed to the test-conventions phase."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase C tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Each task carries its evidence inline.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Capture the token-identity baseline and confirm `scan-comments.mjs` already counts fences in `.css`. [evidence: `token-identity.mjs` baseline captured; `scan-comments.mjs` fence walk uses `walkAll` (all files), so `.css` fences count]
- [x] **T1.2** Pilot `card-code`: extract to `.css`, import it, prove value-identical. [evidence: `card-code.css` created; `token-identity.mjs` 0-diff; build RC 0; `CodeCard.svelte.test.ts` 1 passed]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** Run the transformer over the remaining components; every `<style>` becomes a co-located `.css`. [evidence: 65 components extracted; 67 `.css` files total; `0` remaining `<style>` blocks]
- [x] **T2.2** Fix the comment-mislocation trap: blank HTML comments before locating `<style>`. [evidence: `rich-block-frame.svelte` mentions `<style>` in a comment; re-extracted after the fix; typecheck `0` errors]
- [x] **T2.3** Repoint the CSS-corpus reader and the four `<style>`-reading tests to the `.css` files. [evidence: `css-corpus.ts` reads component `.css`; `AttachmentRail` / `ComposerCommandAutocomplete` / `ModelSwitcherSheet` / `effort-sheet-a11y` repointed]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Token identity 0-diff across three themes, whole from the final state. [evidence: `token-identity.mjs diff` 0 CHANGED / 0 VANISHED / 0 ADDED across light, dark, system]
- [x] **T3.2** Fences 277; build and typecheck green. [evidence: `scan-comments.mjs` fences 277; build RC 0; typecheck 1124 files `0` errors]
- [x] **T3.3** `test:web`, catalog smoke and CDP green from the final state. [evidence: `test:web` 545 + 189 passed RC 0; `catalog-smoke-cdp.mjs` 534 frames 0 throws; `runtime-smoke-cdp.mjs` 4/4 surfaces]
- [x] **T3.4** The stale "scoped block" comment prose is corrected to current state. [evidence: 57 files updated `scoped block` -> `co-located CSS file`; fences 277 unchanged]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

Every component's styles live in a co-located `.css`, no `<style>` blocks remain, token identity holds
at zero diffs, and the whole gate is green from the final state.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the four-phase map.
- `checklist.md` — barrier sign-off.
<!-- /ANCHOR:cross-refs -->
