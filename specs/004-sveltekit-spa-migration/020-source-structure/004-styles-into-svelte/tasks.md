---
title: "Phase D tasks — restore, tooling, gate"
description: "Fold component CSS back into scoped <style>: restore the pre-extraction blocks, repoint the readers, prove the whole gate green from the final state."
contextType: "implementation"
importance_tier: "normal"
trigger_phrases:
  - "styles into svelte task ledger"
  - "styles into svelte packet"
  - "task ledger"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/020-source-structure/004-styles-into-svelte"
    last_updated_at: "2026-08-25T04:09:46.083Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "All tasks complete; every gate green from the final state."
    next_safe_action: "Proceed to 005-comment-brevity."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase D tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Each task carries its evidence inline.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Confirm the `.svelte` files were untouched since the extraction, so a git restore is value-identical. [evidence: `git log <extraction>..HEAD -- app-mobile/src/**/*.svelte` empty — only the extraction touched them]
- [x] **T1.2** Capture the token-identity baseline before the fold-back, so the delta is provable. [evidence: `token-identity.mjs` baseline 0-diff over `app.css` plus `<style>`]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** Restore the 66 component `.svelte` `<style>` blocks from the pre-extraction commit; remove the 66 `.css`. [evidence: `66` `.svelte` restored, `0` component `.css` left, `0` `.svelte` still importing a `.css`]
- [x] **T2.2** Restore `css-corpus.ts` to read `<style>`; flip the four tests' component reads `.css`->`.svelte`. [evidence: `css-corpus.ts` reads `<style>`; four tests repointed; `0` tests reading a component `.css`]
- [x] **T2.3** Keep the `app.css` reads as `.css` — the over-greedy flip that caught `app.css` was reverted. [evidence: `app.svelte`/`style.svelte` reads reverted to `.css`; the two affected tests pass `72` tests]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Token identity 0-diff across three themes, whole from the final state. [evidence: `token-identity.mjs diff` 0 CHANGED / 0 VANISHED / 0 ADDED across light, dark, system]
- [x] **T3.2** Fences 277; build and typecheck green. [evidence: `scan-comments.mjs` fences 277; build RC 0; typecheck 1124 files `0` errors]
- [x] **T3.3** `test:web` and catalog smoke green from the final state. [evidence: `test:web` 545 + 189 passed RC 0; `catalog-smoke-cdp.mjs` 534 frames 0 throws]
- [x] **T3.4** No component `.css` remains; every component carries its scoped `<style>`. [evidence: `67` `.svelte` with `<style>`, `0` component `.css`]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

Every component's styles live in its scoped `<style>` again, no component `.css` remains, token identity
holds at zero diffs, and the whole gate is green from the final state.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the three-phase map.
- `checklist.md` — barrier sign-off.
<!-- /ANCHOR:cross-refs -->
