---
title: "Child 003 tasks — feature directories"
description: "Task ledger for the four parallel feature-directory ports and their folded-in CSS decomposition."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/003-feature-dirs"
    last_updated_at: "2026-08-23T10:10:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed retrospectively."
    next_safe_action: "None; child shipped and superseded by later layers."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 003 tasks — feature directories

---

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred or superseded with a stated reason.
Four parallel executor dispatches, one per directory; Claude verified each independently before the
barrier. File counts are the current on-disk state.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Confirm the L1 barrier green, since these directories compose the primitives and import
      the ports that layer produced.
- [x] **T1.2** Confirm the four directories are genuinely disjoint before dispatching in parallel —
      the safety property, not an optimisation.
- [x] **T1.3** Establish the scope-audit checklist each dispatch must satisfy: child-rendered
      elements, `[data-theme]` / `[aria-*]` / `[dir]` context selectors, and shared `@keyframes`.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** `rich-content/` — markdown and code rendering, composing the already-ported
      `highlight.worker.ts`. 21 files, 8 `@ds surface:` markers.
- [x] **T2.2** `artifacts/` — the artifact cards and viewer, the largest area at 46 files and 37
      surface markers. `pdfjs-dist` stays in `optimizeDeps.exclude`.
- [x] **T2.3** `attachments/` — tiles and upload, composing the already-ported
      `attachment-hash.worker.ts`. 13 files, 5 surface markers.
- [x] **T2.4** `features/ask-question/` — 21 files: seven components plus three runes factories
      (`useAskQuestionState`, `useAskQuestionMutation`, `useAskQuestionKeyboardNavigation`), the
      ephemeral store and the shared types.
- [x] **T2.5** React Context converted to `setContext` / `getContext` runes stores throughout; hooks
      converted to `*.svelte.ts` factories on the 002 pattern.
- [x] **T2.6** CSS decomposition folded into each dispatch — each surface's `@ds surface:` block moved
      from `style.css` into its component's scoped `<style>`, values preserved byte-for-byte.
- [x] **T2.7** Cross-boundary selectors wrapped in `:global(...)` where a rule must reach a
      child-rendered element or a context selector. 73 such wraps across the three chat feature
      directories.
- [x] **T2.8** All `@ds guardrail:` fences preserved through the moves.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Each of the four directories renders in the catalog, light and dark, without throwing.
- [x] **T3.2** `svelte-check` clean across all four.
- [x] **T3.3** token-identity re-verified independently by Claude on the four touched surfaces —
      0 diffs. Verified by CSS resolution rather than screenshot, because under CSP the app renders
      unstyled headless and a visual diff would compare two broken pages.
- [x] **T3.4** Every moved block scope-audited before its dispatch was accepted.
- [~] **T3.5** A `:global()` that reaches *too far* is invisible to both gates — it styles something it
      should not while the catalog and the resolver stay green. The per-block audit is the only
      defence, which is why it is a gate rather than a guideline.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

All four directories shipped, the barrier passed, and every later layer composes them unchanged.

One requirement was superseded rather than met as written. REQ-004 says the `@ds surface:` marker
"collapses to once-per-file". The 007 census showed that is wrong for multi-surface files — collapsing
once-per-file would erase genuinely distinct surfaces — so the rule became once-per-*surface*-per-file.
`artifacts/` carries 37 markers today under that corrected rule.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` — scope, requirements and the barrier definition.
- `plan.md` — why CSS decomposition is folded in, and the scoping hazard it creates.
- `checklist.md` — sign-off with evidence.
- `implementation-summary.md` — what shipped and what the gates cannot see.
- `../007-verify-and-cutover/phase-0-census.md` — the measurement that corrected REQ-004.
- Program goal: `../goal.md`.
<!-- /ANCHOR:cross-refs -->
