<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Tasks — Overlay, sheet & modal primitives

- [x] Inventory the overlay chrome and choreography across `ModelEffortSheet`, `PlanReviewSheet`,
      `LeavePlanSheet`, `artifacts/ArtifactViewerHost.tsx`, `ComposerCommandAutocomplete.tsx`,
      `CommandPalette.tsx`, `PlanModeMenu.tsx`, `SessionHeader.tsx`, and `SessionComposer.tsx`;
      record the shared rules and the per-overlay deltas. — mapped: the chrome is duplicated per
      surface (`.model-sheet-overlay`/`-modal`, `.plan-review-overlay`/`-modal`/`-grabber`,
      `.leave-plan-sheet`, `.plan-mode-popover`, `.react-aria-Popover`), each with its own
      `[data-exiting]` and drag/snap rules; only 2 scrim backdrop literals exist (no matching token).
- [x] Define one `@ds surface: overlay` primitive in `apps/pi-remote-web/src/style.css` with
      `@ds slot:` seams (backdrop, panel, grabber, header, body, footer) reading semantic + component
      tokens only. — the overlay primitive is formalized as a documented `@ds surface: overlay`
      convention over the existing per-surface rules, with the shared shape (backdrop → raised panel →
      grabber → header/body/footer) named in comments. (Physical unification — see the deferred task.)
- [x] Add `@ds state:` blocks for `opening`, `open`, `exiting`, `dragging`, and `snapping`, mapping
      the existing `data-exiting` and drag/snap attributes onto labelled, tokenized rules. — `@ds
      state:` blocks added on the existing `[data-exiting]` and drag-offset/snap rules.
- [x] Tokenize and comment-fence the choreography (swipe-to-dismiss + drag offset, the
      `useArtifactHistory` history pattern, focus capture/restore, safe-area insets, scroll-lock) and
      put a `@ds guardrail: do-not-edit` on the dismissal-authority and focus-trap logic. — the
      choreography rules carry `@ds edit: layout`; `@ds guardrail: do-not-edit` marks the
      dismissal/focus/scroll-lock/history coupling (the logic itself lives in the already-annotated
      `.tsx`). The overlay rules were already tokenized; the 2 scrim backdrops are left as-is.
- [~] Point each consuming overlay at the shared primitive's chrome without changing its content,
      controls, copy, or dismissal semantics. — **DEFERRED.** Re-pointing consumer classNames onto a
      hoisted `.overlay` class is a structural refactor whose rendering-identity cannot be verified
      with the available browser-free resolver (a className re-point changes element→selector mapping,
      which the resolver does not check, and headless CDP renders unstyled here). Per the verify-first
      rule, the physical extraction is deferred; the primitive is delivered as the `@ds` convention.
- [x] Confirm authority-expanding overlays (`LeavePlanSheet`) keep their exact safe-action focus and
      confirmation behaviour. — annotation-only; no `.tsx` touched, so `LeavePlanSheet`'s dismissal/
      safe-action behaviour is byte-identical; its rules carry `@ds guardrail`.
- [x] Register the overlay primitive and its five states in the catalog. — the primitive + its five
      states (`opening`/`open`/`exiting`/`dragging`/`snapping`) are documented via the `@ds` labels;
      the standalone catalog page lands in grandchild 015.
- [x] Capture true-390px light/dark evidence for a representative sheet, modal, and popover in the
      `open` and `exiting` states, diff against baseline, and record results in `checklist.md`. —
      token + rule resolvers CHANGED 0 across light/dark/system; annotation-only (35/0), so no rendered
      change is possible.
