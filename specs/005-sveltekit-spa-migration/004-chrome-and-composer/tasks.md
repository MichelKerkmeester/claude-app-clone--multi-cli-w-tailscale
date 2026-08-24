---
title: "Child 004 tasks — chrome and composer"
description: "Task ledger for the parallel chrome ports and the two serial focus-sensitive units."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/004-chrome-and-composer"
    last_updated_at: "2026-08-23T10:20:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed retrospectively."
    next_safe_action: "None; child shipped and superseded by later layers."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 004 tasks — chrome and composer

---

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred or superseded with a stated reason.
Chrome ran as parallel executor dispatches; the composer and `LeavePlanSheet` ran alone. Evidence is
the current on-disk state and the committed test files.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Confirm the L2 barrier green, since the chrome sits above the feature directories.
- [x] **T1.2** Separate the work into a parallel group and a serial group by *focus sensitivity*
      rather than by file conflict — the files are disjoint either way.
- [x] **T1.3** Fix the composer's governing property before implementation: focus never leaves the
      textarea. Everything else about the autocomplete follows from it.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

### Shared chrome — parallel

- [x] **T2.1** `SessionHeader` and `RuntimeStrip`, each composing the 002 primitives.
- [x] **T2.2** `TodoPanel` on the `Collapsible` primitive.
- [x] **T2.3** Plan components — `PlanModeButton`, `PlanModeMenu`, `PlanReadyCard`,
      `PlanReviewSheet`, plus `planModePresentation.ts` holding the pure presentation logic.
- [x] **T2.4** `ModelEffortSheet` with `EffortRadioGroup` on the `RadioGroup` primitive.
- [x] **T2.5** `RuntimeModeAnnouncer` for the live-region announcements.
- [x] **T2.6** `CommandPalette` and `CommandOption`, and `ComposerTools`.
- [x] **T2.7** Each chrome component folds its own `style.css` block into its scoped `<style>`,
      scope-audited on the 003 checklist.

### Focus-sensitive units — serial, one at a time

- [x] **T2.8** `LeavePlanSheet` — `onOpenAutoFocus` prevents the default and places focus explicitly
      on the stay control (`LeavePlanSheet.svelte:85-87`), with a deferred re-focus as a fallback for
      the case where the dialog moves focus after mount (`:103`).
- [x] **T2.9** `SessionComposer` — the hand-rolled textarea hub.
- [x] **T2.10** `ComposerCommandAutocomplete` — options carry `aria-activedescendant` and are never in
      the tab order, so the caret stays in the textarea and IME composition is never interrupted.
- [~] **T2.11** Melt UI `createPopover` was **not** used; Melt UI is not a dependency at all. Once the
      autocomplete is defined as never taking focus, a popover library's main contribution is focus
      management this surface explicitly does not want.
- [x] **T2.12** `deriveSlashTrigger` left pure and unmodified from its 002 port. Slash detection is
      the part most likely to drift subtly under a rewrite, so the safest change was none.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Chrome renders in the catalog, light and dark, without throwing.
- [x] **T3.2** `LeavePlanSheet` focus parity asserted rather than observed — the regression test
      checks `activeElement` is the stay control. Evidence: `LeavePlanSheet.svelte.test.ts`.
- [x] **T3.3** Composer focus retention and slash-trigger parity covered by
      `SessionComposer.svelte.test.ts` and `ComposerCommandAutocomplete.svelte.test.ts`.
- [x] **T3.4** Composer tools accessibility covered by `composer-tools-a11y.svelte.test.ts`.
- [x] **T3.5** `svelte-check` clean; token-identity re-verified independently on the touched
      surfaces — 0 diffs.
- [~] **T3.6** Interact-outside dismissal and the real focus-trap redirect are **not** asserted here;
      jsdom cannot simulate either. Those live in the CDP gate, and the corresponding unit assertions
      were later skipped in 007 with that rationale recorded at the skip.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

All four requirements hold and the barrier passed. 34 files live in `pages/chat/chrome/` today, and
every later layer composes them unchanged.

The one deviation is the dropped Melt UI dependency, recorded above rather than reconciled backwards
into the spec.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` — scope, requirements and the barrier definition.
- `plan.md` — why focus parity must be asserted, and why the library was dropped.
- `checklist.md` — sign-off with evidence.
- `implementation-summary.md` — what shipped and what jsdom cannot reach.
- `../007-verify-and-cutover/a11y-parity-findings.md` — the later audit that touched these surfaces.
- Program goal: `../goal.md`.
<!-- /ANCHOR:cross-refs -->
