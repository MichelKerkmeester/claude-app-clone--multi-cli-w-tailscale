# Tasks — State vocabulary, interaction & motion

- [ ] Inventory the status families across `apps/pi-remote-web/src/state.ts`, `PlanModeButton.tsx`,
      `artifacts/useArtifactResource.ts` / `artifacts/ArtifactStatus.tsx`, and
      `ComposerCommandAutocomplete.tsx`; collapse them into shared families with their current
      resolved look.
- [ ] Define one `@ds surface: status` vocabulary in `apps/pi-remote-web/src/style.css` with
      `@ds state:` blocks per shared family (idle, loading, stalled, ready, empty, offline, stale,
      denied, expired, missing, error), reading semantic + component tokens.
- [ ] Map each surface's status badges onto the shared vocabulary without changing status text or logic.
- [ ] Formalize the motion tokens (`--duration-fast`, `--duration-state`, `--ease-out`,
      `--ease-out-interface`) as the design-system motion scale under an `@ds edit: tokens` label and
      document which surfaces read them.
- [ ] Fence and document the `:focus-visible`, `prefers-reduced-motion`, `prefers-contrast`, and
      `forced-colors` behaviours as system-wide primitives, unchanged in effect.
- [ ] Add a `@ds guardrail` marking the per-surface state machines and status-text sources as
      off-limits to a designer edit.
- [ ] Register the status vocabulary and the motion/focus/reduced-motion primitives in the catalog.
- [ ] Capture true-390px light/dark evidence of representative status badges and a reduced-motion
      state, diff against baseline, and record results in `checklist.md`.
