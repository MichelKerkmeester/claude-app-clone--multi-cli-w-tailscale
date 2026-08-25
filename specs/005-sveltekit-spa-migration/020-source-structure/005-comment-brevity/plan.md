---
title: "Phase E plan — web-client comment brevity, proven comment-only"
description: "How the verbose inline comments in the app-mobile source are trimmed and how the comment-only claim is proven: batched CLI executor passes, then an AST re-print for scripts, a region check for .svelte, token identity 0-diff, fences, test:web and catalog smoke."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/020-source-structure/005-comment-brevity"
    last_updated_at: "2026-08-25T04:09:46.405Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Plan executed; web-client comments trimmed and proven comment-only."
    next_safe_action: "Proceed to 006-bem-css."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase E plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Shorten over-long inline comment descriptions across the app-mobile source to a concise durable-WHY
style. CLI executor passes do the trimming in batches; the orchestrator proves each file changed no code,
markup or CSS value with an AST re-print, a `.svelte` region check, and the token-identity value oracle.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

Per file: a `.ts` AST re-print with comments removed is identical, and a `.svelte` file's `<script>` AST,
comment-stripped `<style>` and comment-stripped markup are each unchanged. Whole from the final state:
token identity 0-diff across three themes, fence count 277, `test:web` green, catalog smoke green.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

A `.svelte` file mixes three comment forms — `//` and `/* */` in the `<script>`, `<!-- -->` in the
markup, `/* */` in the `<style>` — so a single line filter is not a safe proof. The check splits each
file: the `<script>` blocks are AST re-printed with comments removed (template-safe, unlike the raw
scanner); the `<style>` bodies have their CSS comments stripped and whitespace collapsed; the markup has
its HTML comments stripped and whitespace collapsed. A comment-only edit leaves all three hashes
unchanged. Token identity is the independent value oracle over the CSS, and catalog smoke re-renders
every component, so a CSS or markup change that somehow slipped the region check still fails a gate.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · baseline
Capture the token-identity baseline over `app.css` plus every `.svelte` `<style>`, and self-test the
region checker against the unchanged tree (0 changed).

### Phase 2 · trim in batches
Dispatch cli-cursor (composer-2.5) over the app-mobile source in batches, trimming only comments.

### Phase 3 · verification
Region-check every touched file comment-only; diff token identity against the baseline; confirm the fence
count and run `test:web` and catalog smoke from the final state.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

No new tests — a comment trim keeps behaviour. The AST and region checks are the oracle for "no code,
markup or CSS changed"; token identity confirms every resolved value is unchanged; `test:web` and catalog
smoke confirm behaviour and rendering. All run from the final state before the phase closes.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The app-mobile source file list (`.svelte`, `.ts`, `.svelte.ts`).
- The `.svelte`-aware comment-only region checker over the TypeScript compiler API.
- The `007-verify-and-cutover` token-identity baseline and `scripts/token-identity.mjs`.
- cli-cursor at composer-2.5 — the live executor route.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

The pass is comment-only and isolated to the app-mobile source. `git checkout -- <files>` restores them;
nothing else depends on the change, and there is no migration or irreversible step.
<!-- /ANCHOR:rollback -->
