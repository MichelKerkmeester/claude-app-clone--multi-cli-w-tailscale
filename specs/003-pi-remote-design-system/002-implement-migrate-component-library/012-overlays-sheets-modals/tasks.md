# Tasks — Overlay, sheet & modal primitives

- [ ] Inventory the overlay chrome and choreography across `ModelEffortSheet`, `PlanReviewSheet`,
      `LeavePlanSheet`, `artifacts/ArtifactViewerHost.tsx`, `ComposerCommandAutocomplete.tsx`,
      `CommandPalette.tsx`, `PlanModeMenu.tsx`, `SessionHeader.tsx`, and `SessionComposer.tsx`;
      record the shared rules and the per-overlay deltas.
- [ ] Define one `@ds surface: overlay` primitive in `apps/pi-remote-web/src/style.css` with
      `@ds slot:` seams (backdrop, panel, grabber, header, body, footer) reading semantic + component
      tokens only.
- [ ] Add `@ds state:` blocks for `opening`, `open`, `exiting`, `dragging`, and `snapping`, mapping
      the existing `data-exiting` and drag/snap attributes onto labelled, tokenized rules.
- [ ] Tokenize and comment-fence the choreography (swipe-to-dismiss + drag offset, the
      `useArtifactHistory` history pattern, focus capture/restore, safe-area insets, scroll-lock) and
      put a `@ds guardrail: do-not-edit` on the dismissal-authority and focus-trap logic.
- [ ] Point each consuming overlay at the shared primitive's chrome without changing its content,
      controls, copy, or dismissal semantics.
- [ ] Confirm authority-expanding overlays (`LeavePlanSheet`) keep their exact safe-action focus and
      confirmation behaviour.
- [ ] Register the overlay primitive and its five states in the catalog.
- [ ] Capture true-390px light/dark evidence for a representative sheet, modal, and popover in the
      `open` and `exiting` states, diff against baseline, and record results in `checklist.md`.
