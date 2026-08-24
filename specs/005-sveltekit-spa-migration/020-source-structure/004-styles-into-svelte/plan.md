---
title: "Phase D plan — git-restore the pre-extraction <style>, token identity as the oracle"
description: "Fold the 66 component .css back into their .svelte <style> blocks by restoring the pre-extraction commit (value-identical, correct :global), remove the .css and imports, repoint the CSS-corpus reader and four tests, proven by token identity."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/020-source-structure/004-styles-into-svelte"
    last_updated_at: "2026-08-24T18:30:39Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Fold-back landed; every gate green."
    next_safe_action: "None — the source-structure group is complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase D plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Restore each component's `<style>` block from the pre-extraction commit, remove its co-located `.css`
and the import, and repoint the CSS-corpus reader and four tests from `.css` back to `<style>`. Because
the `.svelte` files were touched by nothing but the extraction, a git restore is value-identical.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

Token identity 0-diff across three themes over `app.css` plus every scoped `<style>`; fences 277; build;
typecheck; `test:web`; catalog smoke. All run whole from the final state before the phase closes.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

The pre-extraction `<style>` blocks carry the correct `:global()` placement, so a git restore returns
prop-classes to `:global()` and markup-owned classes to scoped rules without judgement. Token identity
resolves `app.css` plus every `<style>` per theme; a value-identical restore reads as zero diffs.

The one non-mechanical care: the CSS-corpus reader and the four `<style>`-reading tests must flip from
`.css` back to `<style>`, and the flip must NOT touch the `app.css` read — `app.css` stays the global
file. A too-greedy `.css`→`.svelte` rewrite that catches `app.css` breaks those tests; the flip is
scoped to component paths only.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · restore
`git checkout` the 66 component `.svelte` from the pre-extraction commit; `git rm` the 66 `.css`.

### Phase 2 · tooling
Restore `css-corpus.ts` to read `<style>`; flip the four tests' component reads `.css`→`.svelte`
(never `app.css`).

### Phase 3 · gate
Run token identity, fences, build, typecheck, `test:web`, catalog smoke from the final state.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

No new tests — this is a relocation, and token identity plus the existing suite is the oracle. The
CSS-corpus reader assembles `app.css` plus every `<style>` again; the four tests read `<style>` via their
`normalizeSvelteCss` helper.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The pre-extraction commit as the value-identical restore source.
- The `007-verify-and-cutover` token-identity baseline.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

The change is one commit. Reverting it re-extracts the `.css` files and repoints the tooling back;
nothing else depends on it. No data, no irreversible step — a pure source relocation.
<!-- /ANCHOR:rollback -->
