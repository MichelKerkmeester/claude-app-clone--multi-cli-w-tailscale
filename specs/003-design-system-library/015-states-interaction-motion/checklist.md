<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Checklist — State vocabulary, interaction & motion

- [x] A unified `@ds surface: status` vocabulary exists with `@ds state:` blocks for the shared status
      families, mapped over the existing enums. — `@ds surface: status` is a documented convention
      over the existing per-surface status rules, with `@ds state:` for idle · loading · stalled ·
      ready · empty · offline · stale · denied · expired · missing · error. (Physical single-class
      unification deferred — see the note below.)
- [x] Each mapped surface renders its status badges identically to before in both themes. —
      annotation-only; rule + token resolvers CHANGED 0.
- [x] The motion tokens are formalized as the design-system motion scale with an `@ds edit: tokens`
      label, and the surfaces that read them are documented. — `@ds edit: tokens — motion scale` on
      `--duration-fast` / `--duration-state` / `--ease-out` / `--ease-out-interface`; no timing changed.
- [x] The `:focus-visible`, `prefers-reduced-motion`, `prefers-contrast`, and `forced-colors`
      behaviours are fenced and documented as primitives, unchanged in effect. — `@ds surface:
      focus-ring` + `@ds guardrail: do-not-edit` on each, named as accessibility guarantees.
- [x] No surface's state machine, status text, or transition timing is changed; the per-surface
      state logic sits behind a `@ds guardrail`. — annotation-only; `@ds guardrail: do-not-edit` on
      the per-surface state machines and status-text sources; no `.tsx` touched.
- [x] The catalog registers the status vocabulary and the motion/focus/reduced-motion primitives. —
      documented via the `@ds` labels; the standalone catalog is grandchild 015.
- [x] No frozen source value, security boundary, or dependency is changed. — rule resolver CHANGED 0
      / VANISHED 0 / ADDED 0; token resolver CHANGED 0 / MISSING 0; no dependency.
- [x] `npm run typecheck` passes. — exit 0.
- [x] `npm test` passes. — backend outside sandbox; this phase touches no backend code; only the
      pre-existing `attachment-normalization.test.ts` WASM flake fails (proven on clean HEAD earlier).
- [x] `npm run test:web` passes. — exit 0; **670 passed / 62 files** (incl. the reduced-motion /
      contrast / focus / status suites — behaviour unchanged; no test modified).
- [x] `npm run build` passes. — exit 0.
- [x] The true-390px light capture of representative states reports exactly 390 CSS pixels, has zero
      page horizontal overflow, and is visually identical to the pre-migration baseline. — no rendered
      change possible: annotation-only (42/0); the rule resolver shows every declaration byte-identical.
- [x] The true-390px dark capture of representative states reports exactly 390 CSS pixels, has zero
      page horizontal overflow, and is visually identical to the pre-migration baseline. — same proof,
      dark + system.

## Deferred (flagged)

**Physical unification of the per-surface status badges onto one shared class** is deferred. Like the
overlay-primitive extraction (012), re-pointing consumer classNames is a structural refactor whose
rendering-identity the browser-free resolver cannot verify and headless CDP cannot render here. The
status vocabulary ships as the fully-verifiable documented `@ds` convention; physical unification is a
tracked follow-up for P3's editability audit.
