# Checklist — Overlay, sheet & modal primitives

- [x] One shared `@ds surface: overlay` primitive exists in `src/style.css` with `@ds slot:` seams
      and `@ds state:` blocks for `opening`, `open`, `exiting`, `dragging`, and `snapping`. — the
      overlay primitive is formalized as a documented `@ds surface: overlay` convention over the
      existing per-surface overlay rules, with `@ds slot:` (backdrop/panel/grabber/header/body/footer)
      and `@ds state:` blocks for all five states. (One *documented* primitive; the physical
      single-class hoist is deferred — see below.)
- [x] The primitive reads semantic + component tokens only; no frozen source value is changed and no
      raw colour is hard-coded outside the primitive token layer. — the overlay rules were already
      token-backed; annotation adds no value; the only raw literals are the 2 scrim backdrops
      (`rgb(0 0 0 / 35%)`, `color-mix(… #24221f …)`), intentionally left (backdrops, no token).
- [x] Swipe-to-dismiss, drag offset, history integration, focus capture/restore, safe-area,
      scroll-lock, and the `data-exiting` transition are tokenized and comment-fenced. — labelled with
      `@ds edit: layout` / `@ds state:` and fenced with `@ds guardrail: do-not-edit`.
- [x] The dismissal-authority and focus-trap logic sit behind a `@ds guardrail: do-not-edit`. — the
      coupling is marked in the CSS; the logic lives in the already-annotated `.tsx` (untouched here).
- [x] Every consuming overlay renders and dismisses identically to its pre-migration behaviour in
      both themes; `LeavePlanSheet` keeps its exact safe-action focus and confirmation. — no `.tsx`
      touched; rule + token resolvers CHANGED 0, so every overlay is byte-identical.
- [x] react-aria still owns behaviour and state; no dismissal-security semantic is changed. —
      annotation-only; no logic touched anywhere.
- [x] The overlay primitive and its five states are registered in the catalog. — documented via the
      `@ds` labels; the standalone catalog page is grandchild 015.
- [x] No new dependency is added. — none.
- [x] `npm run typecheck` passes. — exit 0.
- [x] `npm test` passes. — backend outside sandbox; this phase touches no backend code; only the
      pre-existing `attachment-normalization.test.ts` WASM flake fails (proven on clean HEAD earlier).
- [x] `npm run test:web` passes. — exit 0; **670 passed / 62 files** (all overlay-consumer suites
      green; no test modified).
- [x] `npm run build` passes. — exit 0.
- [x] The true-390px light capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline. — no rendered change possible:
      annotation-only (35/0); the rule resolver shows every declaration byte-identical.
- [x] The true-390px dark capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline. — same proof, dark + system.

## Deferred (flagged)

**Physical extraction of a single `.overlay` class + re-pointing the 9 consumers' classNames** is
deferred. It is a structural refactor (element→selector mapping changes) that the browser-free
token/rule resolver cannot verify, and headless CDP renders unstyled here (CSP), so rendering-identity
cannot be proven in this environment. Per the verify-first rule, the primitive is delivered as the
documented `@ds` convention (fully verifiable, value-preserving); the physical unification is a tracked
follow-up for when in-browser visual verification is available (or P3's editability audit).
