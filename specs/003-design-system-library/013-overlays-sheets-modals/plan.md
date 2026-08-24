# Plan — Overlay, sheet & modal primitives

## Approach

Extract, do not rewrite. Read the overlay chrome and choreography currently repeated across the
consuming components, hoist the common backdrop/panel/popover rules into one `@ds`-labelled overlay
primitive that reads semantic + component tokens, and express the choreography (swipe, drag,
history, focus, safe-area, scroll-lock, exit) as tokenized, comment-fenced blocks with a guardrail on
the dismissal/focus logic. Keep react-aria owning behaviour and state; keep every consumer's content
and dismissal semantics untouched. Prove each overlay is behaviourally and visually identical.

## Steps

1. Inventory the overlay chrome and choreography across `ModelEffortSheet`, `PlanReviewSheet`,
   `LeavePlanSheet`, `ArtifactViewerHost`, the slash/command popovers, `PlanModeMenu`, and the header
   and composer popovers; record the shared rules and the per-overlay deltas.
2. Define one `@ds surface: overlay` primitive in `src/style.css` with `@ds slot:` seams (backdrop,
   panel, grabber, header, body, footer) reading semantic + component tokens only.
3. Add `@ds state:` blocks for `opening`, `open`, `exiting`, `dragging`, and `snapping`, mapping the
   existing `data-exiting` and drag/snap attributes onto labelled, tokenized rules.
4. Tokenize and comment-fence the choreography: swipe-to-dismiss + drag offset, the
   `useArtifactHistory` browser-history pattern, focus capture/restore, safe-area insets, and
   scroll-lock; put a `@ds guardrail: do-not-edit` on the dismissal-authority and focus-trap logic.
5. Point each consuming overlay at the shared primitive's chrome without changing its content,
   controls, copy, or dismissal semantics.
6. Confirm authority-expanding overlays (`LeavePlanSheet`) keep their exact safe-action focus and
   confirmation behaviour.
7. Register the overlay primitive and its five states in the catalog.
8. Capture true-390px light/dark evidence for a representative sheet, modal, and popover in the
   `open` and `exiting` states and diff against the pre-migration baseline.

## Files to change

- `apps/pi-remote-web/src/style.css` (extract the shared overlay primitive + choreography; layer,
  comment, tokenize — no value or dismissal-semantics change)
- `apps/pi-remote-web/src/ModelEffortSheet.tsx`, `PlanReviewSheet.tsx`, `LeavePlanSheet.tsx`,
  `artifacts/ArtifactViewerHost.tsx`, `ComposerCommandAutocomplete.tsx`, `CommandPalette.tsx`,
  `PlanModeMenu.tsx`, `SessionHeader.tsx`, `SessionComposer.tsx` (adopt the primitive's chrome
  classes only; no behaviour change)
- `scripts/design-system-cdp.mjs` (overlay open/exiting capture support, if needed)

## Verification gate

Run from the repository root:

```text
npm run typecheck
npm test
npm run test:web
npm run build
node scripts/design-system-cdp.mjs --surface overlay-primitive --viewport-width 390 --theme light --output <temporary-directory>/overlay-primitive-light.png
node scripts/design-system-cdp.mjs --surface overlay-primitive --viewport-width 390 --theme dark --output <temporary-directory>/overlay-primitive-dark.png
```

The gate passes only when all suites and the build pass, every consuming overlay opens/drags/snaps/
dismisses identically to its pre-migration behaviour, the CDP runner reports exactly 390 CSS pixels
with zero page horizontal overflow, both captures are visually identical to the pre-migration
baseline in each theme, and no frozen source value or dismissal-security semantic is changed.
