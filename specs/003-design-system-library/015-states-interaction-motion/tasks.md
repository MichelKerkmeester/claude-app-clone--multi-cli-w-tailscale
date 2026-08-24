# Tasks — State vocabulary, interaction & motion

- [x] Inventory the status families across `apps/pi-remote-web/src/state.ts`, `PlanModeButton.tsx`,
      `artifacts/useArtifactResource.ts` / `artifacts/ArtifactStatus.tsx`, and
      `ComposerCommandAutocomplete.tsx`; collapse them into shared families with their current
      resolved look. — inventoried; the shared families (idle · loading · stalled · ready · empty ·
      offline · stale · denied · expired · missing · error) map over the connection status-pill, the
      runtime/mode glyphs, the artifact resource-status, the slash-panel states, and the file-preview
      availability. All status rules are already tokenized.
- [x] Define one `@ds surface: status` vocabulary in `apps/pi-remote-web/src/style.css` with
      `@ds state:` blocks per shared family, reading semantic + component tokens. — `@ds surface:
      status` is formalized as a documented convention over the existing per-surface status rules,
      with `@ds state:` for the shared families.
- [~] Map each surface's status badges onto the shared vocabulary without changing status text or
      logic. — **DEFERRED (physical unification).** Re-pointing per-surface badge classNames onto one
      shared class is a structural refactor whose rendering-identity the browser-free resolver cannot
      verify (and headless CDP renders unstyled here). The vocabulary ships as the documented `@ds`
      convention; physical unification is a follow-up (P3).
- [x] Formalize the motion tokens (`--duration-fast`, `--duration-state`, `--ease-out`,
      `--ease-out-interface`) as the design-system motion scale under an `@ds edit: tokens` label and
      document which surfaces read them. — `@ds edit: tokens — motion scale` labels the token block
      (fast = quick affordance feedback; state = state transitions; the two expo-out easings), naming
      the reader surfaces. No ms or bezier changed.
- [x] Fence and document the `:focus-visible`, `prefers-reduced-motion`, `prefers-contrast`, and
      `forced-colors` behaviours as system-wide primitives, unchanged in effect. — `@ds surface:
      focus-ring` on the shared focus ring; `@ds guardrail: do-not-edit` on the reduced-motion
      zeroing, the high-contrast re-render, the forced-colors yield, and the focus ring — each named
      an accessibility guarantee a designer may retune but never remove.
- [x] Add a `@ds guardrail` marking the per-surface state machines and status-text sources as
      off-limits to a designer edit. — `@ds guardrail: do-not-edit` marks the per-surface state
      machines and status-text sources.
- [x] Register the status vocabulary and the motion/focus/reduced-motion primitives in the catalog. —
      documented via the `@ds` labels; the standalone catalog page lands in grandchild 015.
- [x] Capture true-390px light/dark evidence of representative status badges and a reduced-motion
      state, diff against baseline, and record results in `checklist.md`. — token + rule resolvers
      CHANGED 0 across light/dark/system; annotation-only (42/0), so no rendered change is possible.
