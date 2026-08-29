---
title: "Phase D implementation summary — styles into Svelte"
description: "The 66 component .css files folded back into their .svelte scoped <style> blocks by restoring the pre-extraction commit, proven value-identical by token identity 0-diff across three themes, fences 277, and green across the whole gate."
contextType: "implementation"
importance_tier: "normal"
trigger_phrases:
  - "styles into svelte implementation summary"
  - "styles into svelte packet"
  - "implementation summary"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/020-source-structure/004-styles-into-svelte"
    last_updated_at: "2026-08-25T04:09:46.083Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "66 component .css folded back into scoped <style>; whole gate green."
    next_safe_action: "Proceed to 005-comment-brevity."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase D implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `020-source-structure` |
| Level | 2 |
| Status | Complete |
| Requirements shipped | REQ-001 … REQ-005 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Every component's CSS folded back into its `.svelte` scoped `<style>` block — 67 `.svelte` with a
`<style>`, `0` component `.css` left. Each component is one file again: markup, its own Svelte-scoped
CSS, and logic together, the migration's original north star, with the compiler-enforced scoping the
separate global `.css` files had given up. `app.css` stays the global layer, unchanged.

This reverses Phase C. The `.svelte` files were touched by nothing but the extraction, so restoring their
pre-extraction `<style>` blocks is value-identical — token identity holds at 0 CHANGED / 0 VANISHED / 0
ADDED across light, dark and system.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

A git restore did the relocation: `git checkout` the 66 component `.svelte` from the pre-extraction
commit (bringing back the `<style>` blocks with correct `:global()` placement) and `git rm` the 66
`.css`. The CSS-corpus test reader was restored to read `<style>`, and the four tests that read a
component's styles were flipped from `.css` back to `<style>`.

One fix: the first `.css`->`.svelte` flip was too greedy and caught the `app.css` read (`app.css` stays
the global file, not a component), breaking two tests with `app.svelte` ENOENT. Reverting the `app.css`
and `style.css` reads fixed them — those two files then passed their 72 tests, and the full suite was
green.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Restore, do not re-author.** Because the `.svelte` files were untouched since the extraction, a git
restore of the pre-extraction `<style>` blocks is exact — it preserves the original `:global()` placement
on prop-classes without judgement, which re-authoring could not guarantee. Token identity is the proof.

**The flip is component-scoped.** `app.css` is the global foundation and stays a `.css` file; only
component `.css` reads flip to `.svelte`. A flip that catches `app.css` breaks the corpus tests.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Token identity | 0 changed / 0 vanished / 0 added across light, dark, system |
| `@ds guardrail` fences | 277, preserved |
| Build | RC 0 |
| Typecheck | 1124 files, 0 errors |
| `npm run test:web` | 68 files / 545 passed + 3 skipped and 17 files / 189 passed, RC 0 |
| Catalog smoke | 267 stories × 2 themes = 534 frames, 0 throws |
| `validate.sh --strict` | exit 0 through its realpath |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

**CSS is no longer browsable as standalone files.** That is the accepted trade of one-file-per-component:
the styles live inside each `.svelte` again, Svelte-scoped, rather than as separate `.css` files. The
anobel-style file-header/section banners that Phase C added to the `.css` files did not carry — the
restored `<style>` blocks keep their `@ds` seam comments.
<!-- /ANCHOR:limitations -->
