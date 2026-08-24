<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Grandchild 12 — Overlay, sheet & modal primitives

## Summary

This grandchild formalizes the single shared overlay primitive — the surface chrome and the
choreography that every bottom sheet, modal, and popover in the app consumes — onto the token
library and the `@ds` inline-comment grammar. It is distinct from grandchild 3 (control
primitives): grandchild 3 owns buttons, toggles, and fields; this one owns the react-aria
`Modal` / `ModalOverlay` / `Dialog` / `Popover` shell plus its open, drag, and dismissal
choreography. It changes no surface's content and no dismissal security semantics; it extracts one
documented primitive from patterns currently repeated across many components.

## Problem & Goal

Every overlay in the app — `ModelEffortSheet`, `PlanReviewSheet`, `LeavePlanSheet`,
`ArtifactViewerHost`, the slash and command popovers, `PlanModeMenu`, and the header and composer
popovers — reimplements the same chrome and choreography (backdrop, raised panel, swipe-to-dismiss
with drag offset, browser-history integration, focus capture and restore, safe-area insets,
scroll-lock, and the `data-exiting` exit transition) with ad-hoc CSS. A designer cannot adjust how
"a sheet" looks or animates in one place, and a new overlay has no canonical shell to adopt. The
goal is one token-driven, comment-labelled overlay primitive with per-state seams, consumed by
every sheet and modal, so its look and motion are edited once and its behaviour stays owned by
react-aria.

## Scope

### In scope

- One shared overlay primitive: the backdrop (`ModalOverlay`), the raised panel (`Modal`/`Dialog`),
  and the non-modal `Popover` chrome, all reading semantic + component tokens.
- The `@ds surface:` label plus `@ds slot:` seams (backdrop, panel, grabber, header, body, footer)
  and `@ds state:` blocks for `opening`, `open`, `exiting`, `dragging`, and `snapping`.
- The choreography formalized as tokenized, comment-fenced blocks: swipe-to-dismiss + drag offset,
  browser-history integration (the `artifacts/useArtifactHistory.ts` pattern), focus capture/restore,
  safe-area insets, scroll-lock, and the `data-exiting` exit transition.
- A `@ds guardrail` fencing the dismissal-authority and focus-trap logic so a designer edits look
  and motion but never the dismissal semantics.

### Out of scope

- Any change to a consuming surface's content, controls, or copy — `ModelEffortSheet`,
  `PlanReviewSheet`, `LeavePlanSheet`, `ArtifactViewerHost`, and the popovers keep their behaviour;
  later grandchildren migrate their content onto this primitive.
- Any change to dismissal security semantics (e.g. which action is safe, backdrop-dismiss policy,
  authority-expanding confirmations).
- Grandchild 3's control primitives, and grandchild 14's motion-token definitions (consumed here,
  defined there).
- Any security, redaction, ticketing, or plan-mode change.

## User-facing behavior + states

No behaviour change. Every overlay opens, drags, snaps, and dismisses exactly as before, in light
and dark. The observable change is authoring: the overlay chrome and choreography now live in one
token-driven, `@ds`-labelled primitive with explicit `opening` / `open` / `exiting` / `dragging` /
`snapping` state blocks a designer can edit.

## Acceptance criteria

- One shared overlay primitive exists in `src/style.css`, `@ds surface:`-labelled, with `@ds slot:`
  seams and `@ds state:` blocks for `opening`, `open`, `exiting`, `dragging`, and `snapping`.
- The primitive reads semantic + component tokens only; no frozen source value is changed and no raw
  colour is hard-coded outside the primitive token layer.
- Swipe-to-dismiss, drag offset, history integration, focus capture/restore, safe-area, scroll-lock,
  and the `data-exiting` transition are tokenized and comment-fenced, with a `@ds guardrail` on the
  dismissal/focus logic.
- Every consuming overlay renders and dismisses identically to its pre-migration behaviour in both
  themes at true 390px.
- `npm run typecheck`, `npm test`, `npm run test:web`, and `npm run build` pass; the overlay primitive
  is registered in the catalog with its states.

## Security & Redaction

Styling and choreography only. This grandchild touches no logic that decides dismissal authority,
no transport, redaction, ticket, plan-mode, or host-file path; the dismissal-authority and
focus-trap logic stay behind a `@ds guardrail`. Overlays that gate authority-expanding actions
(e.g. `LeavePlanSheet`) keep their exact safe-action focus and confirmation behaviour. No new
dependency is added.

## Dependencies & affected areas

- Overlay chrome + choreography source: `apps/pi-remote-web/src/style.css` (the shared
  `ModalOverlay` / `Modal` / `Dialog` / `Popover` rules, the `data-exiting` and drag/snap rules,
  and the safe-area blocks).
- Consumers (behaviour unchanged; they adopt the primitive's chrome): `apps/pi-remote-web/src/ModelEffortSheet.tsx`,
  `PlanReviewSheet.tsx`, `LeavePlanSheet.tsx`, `artifacts/ArtifactViewerHost.tsx`,
  `ComposerCommandAutocomplete.tsx`, `CommandPalette.tsx`, `PlanModeMenu.tsx`,
  `SessionHeader.tsx` (overflow popover), and `SessionComposer.tsx` ("+" tools popover).
- Choreography reference: `apps/pi-remote-web/src/artifacts/useArtifactHistory.ts` (history pattern)
  and `apps/pi-remote-web/src/artifacts/ArtifactViewerProvider.tsx` (focus/scroll capture pattern).
- Motion tokens (consumed, defined in grandchild 14): `--duration-state`, `--ease-out-interface`.
- Baseline evidence: `scripts/design-system-cdp.mjs` capturing a representative sheet, modal, and
  popover open/exiting state.
