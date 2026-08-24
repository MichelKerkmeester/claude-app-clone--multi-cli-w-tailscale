<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Grandchild 7 — Model & effort sheet

## Summary

This grandchild migrates the canonical bottom-sheet that picks the active model and the effort /
reasoning level onto the design system. It moves the sheet's hand-authored rules onto the semantic
and component token layers, applies the `@ds` inline-comment grammar to every editable region and
per-state block, and promotes the existing component-scoped `--model-sheet-*` token set into the
first documented component-token example. It is a value-preserving restyle: no rendered pixel, no
model/effort behaviour, and no mutation path changes.

## Problem & Goal

The model + effort sheet is one of the app's richest surfaces — a swipe-dismissible bottom sheet
with a searchable model list, sectioned grouping, and an effort radio group — yet its look is
authored as bespoke rules plus an ad-hoc `--model-sheet-*` set with no declared editable seams. A
designer cannot retint the sheet, relabel its slots, or restyle its committing / pending states
without reading the sheet's state machine. The goal is to move the sheet onto the token library and
the `@ds` grammar so a low-code designer can adjust its styling, slots, layout, and per-state
presentation safely, while react-aria and the runtime state machine keep owning behaviour.

## Scope

### In scope

- Migrate the model + effort sheet's rules onto the semantic role tokens and formalize the
  component-scoped `--model-sheet-*` set as a documented component-token example (`@ds surface:
  model-effort-sheet`).
- Apply the `@ds` grammar: `@ds edit: tokens` on the `--model-sheet-*` block, `@ds slot:` for the
  sheet's header / search / model-list / effort-group / footer regions, `@ds edit: layout` for the
  sheet's stacking and safe-area layout, and `@ds state:` blocks for each visual state.
- Cover every visual state as its own labelled seam: sheet opened at the `model` section vs the
  `effort` section; committing; terminal-blocked; pending-effort; dragging; snapping; search-shown
  (≥8 models); effort row confirmed (✓) vs requested (spinner "Applying…"); group `aria-busy` while
  pending; and read-only + disabled gating.
- Fence the sheet's runtime/mutation wiring behind `@ds guardrail: do-not-edit`.

### Out of scope

- Any change to a frozen source value or to Inter + Source Serif 4.
- Any change to the model/effort commit path, the one-use ticket, revision checks, or the host
  snapshot reconcile — the migration restyles the sheet, it never touches the mutation boundary.
- The shared overlay/sheet primitive itself (swipe-dismiss, history, focus, safe-area) — that is
  grandchild `012`; this grandchild consumes it.
- The effort radio group's control primitive behaviour — react-aria continues to own it.

## User-facing behavior + states

No behaviour change. Every state renders identically before and after: the sheet opens to the same
section, the same search appears at ≥8 models, the effort rows show the same confirmed / requested
affordances, and the same terminal-blocked and pending gating applies — now driven by tokenized,
comment-labelled `@ds state:` blocks rather than bespoke rules.

## Acceptance criteria

- The model + effort sheet reads its colours from the semantic and `--model-sheet-*` component
  tokens; no raw source value is hard-coded in its rules.
- The sheet declares `@ds surface: model-effort-sheet`, its slots, its layout seam, and one
  `@ds state:` block per visual state listed above; the mutation wiring carries `@ds guardrail`.
- The `--model-sheet-*` set is documented in the token reference as the worked component-token
  example.
- Every state (model/effort open, committing, terminal-blocked, pending-effort, dragging, snapping,
  search-shown, effort confirmed/requested, read-only/disabled) renders identically to its
  pre-migration baseline in light and dark.
- `npm run typecheck`, `npm test`, `npm run test:web`, and `npm run build` pass; the true-390px
  light/dark captures of the sheet are visually unchanged.

## Security & Redaction

Styling-only. The migration touches no model/effort commit path, ticket, revision check, host
snapshot reconcile, redaction, or plan-mode logic; all of that stays behind `@ds guardrail`
comments and unchanged. No new dependency is added. The frozen read-only-by-default posture is
preserved: the sheet can still only request a host-authoritative change, never force one.

## Dependencies & affected areas

- Surface: `apps/pi-remote-web/src/ModelEffortSheet.tsx`, `apps/pi-remote-web/src/EffortRadioGroup.tsx`.
- Logic/strings (read, not restyled): `apps/pi-remote-web/src/effort.ts`,
  `apps/pi-remote-web/src/model-catalog.ts`, `apps/pi-remote-web/src/model-switcher-strings.ts`.
- Styles: the `.model-sheet-overlay` rules and the `--model-sheet-*` token set in
  `apps/pi-remote-web/src/style.css` (and its dark / system-dark variants).
- Consumes: grandchild `012-overlays-sheets-modals` (the overlay/sheet primitive) and the token
  library from `001-tokens-foundation` / `002-theming-light-dark`.
- Tests: `apps/pi-remote-web/tests/ModelEffortSheet.test.tsx`, `effort-sheet-a11y.test.tsx`.
- Baseline evidence: `scripts/design-system-cdp.mjs` with the model-effort-sheet fixture.
