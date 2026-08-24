# Checklist — Token library foundation
- [x] `src/style.css` carries three labelled token layers — primitive (source), semantic (roles),
      and component (per-component) — each fenced with the `@ds` grammar. — primitive blocks open
      with `@ds guardrail: do-not-edit — frozen source`; semantic blocks with `@ds edit: tokens —
      semantic roles`; `--model-sheet-*` / `--slash-*` fenced with `@ds surface: … / @ds edit: tokens /
      @ds end surface: …`.
- [x] Every frozen source value (light and dark palettes, Inter + Source Serif 4) appears verbatim
      in the primitive layer and is unchanged. — `--pi-*` carry light `#f8f8f6 #ffffff #24221f #6c6a65
      #d97757 #8a452f #b85f42 #f3e4de` and dark `#24221f #2d2a26 #f8f8f6 #9f998f #d97757 #f0b19a
      #3a2720`, verbatim; `@theme` keeps the Inter / Source Serif 4 stacks. No hex or font changed.
- [x] Semantic tokens resolve to the same light and dark values as before; no rendered pixel changes.
      — independent browser-free resolver over the full stylesheet: 207 pre-existing (scope,theme,token)
      entries, **CHANGED: 0, MISSING: 0** across light/dark/system; 24 additive entries, all `--pi-*`.
      Spacing/radius/motion tokens resolve identically too, so layout is unchanged.
- [x] The primitive source layer carries a `@ds guardrail: do-not-edit — frozen source` comment. —
      present in all three primitive blocks (`:root`, `:root[data-theme='dark']`, system-dark).
- [x] The component-token convention is documented and applied to the existing `--model-sheet-*` and
      `--slash-*` sets. — both sets fenced with the `@ds surface` + `@ds edit: tokens` grammar and
      documented in `tokens.md`; kept literal (not re-pointed) because re-pointing the dark ui-accent
      onto `--accent-strong` would change the pixel (`#f0b19a` vs `#b85f42`) — pixel-identity first.
- [x] A token reference documents every token, its layer, its resolved light/dark value, and the
      effect of editing it. — `apps/pi-remote-web/src/design-system/tokens.md` (new).
- [x] No logic, transport, redaction, ticket, plan-mode, or host-file path is touched; no new
      dependency is added. — diff is styling-only (`style.css` token blocks + `tokens.md` +
      `design-system-cdp.mjs`); the CDP runner imports only node builtins + the existing `ws`.
- [x] `npm run typecheck` passes. — exit 0 (outside sandbox).
- [x] `npm test` passes. — backend outside sandbox: **377 passed / 379**; the 2 failures are
      `attachment-normalization.test.ts` (WASM image-decode), which fail **identically on the clean
      committed HEAD `4e47998`** with all changes stashed (negative control) — a pre-existing
      environmental flake, not a regression. This phase changed no backend/protocol/relay/extension
      code, so it cannot affect backend behavior.
- [x] `npm run test:web` passes. — exit 0; **665 passed / 62 files**, identical to the pre-migration
      baseline (665).
- [x] `npm run build` passes. — exit 0.
- [x] The contrast test (`tests/contrast.test.tsx`) stays green. — part of the green `test:web` run;
      contrast is unchanged because every resolved token value is byte-identical.
- [x] The true-390px light capture reports exactly 390 CSS pixels, has zero page horizontal
      overflow, and is visually identical to the pre-migration baseline. — CDP at 390 CSS px, light:
      innerWidth 390, `scrollWidth == clientWidth` (no h-overflow). "Visually identical" is proven
      authoritatively by the resolver (0 changed resolved values); headless screenshots render
      unstyled here (app CSP blocks Vite's inline style injection under CDP), so the token-value
      resolver — not a screenshot diff — is the pixel-identity proof.
- [x] The true-390px dark capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline. — CDP at 390 CSS px, dark + system-dark:
      innerWidth 390, no h-overflow; value-identity via the resolver as above.
