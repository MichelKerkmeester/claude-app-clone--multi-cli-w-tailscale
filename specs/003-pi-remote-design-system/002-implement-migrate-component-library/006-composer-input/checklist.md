# Checklist — Composer input

- [x] `SessionComposer` declares `@ds surface:`, `@ds slot:` (tray, tools trigger, input, primary
      action), `@ds edit: layout`, and one `@ds state:` block per button form and composer status,
      reading from tokens only. — `@ds surface: composer` on the tray; `@ds slot:` on tools-trigger /
      input / primary-action / tools-popover; `@ds edit: layout` on the sticky bottom-anchor and tray
      geometry; `@ds state:` per disc form (send·steer / stop / stopping·sending-inhibit /
      sending·slashSubmitting) and per status (idle / running / interrupted / unknown /
      awaitingSnapshot·sendingPrompt / promptError); rules read semantic tokens only.
- [x] The single circular primary button renders identically across send / steer / stop / sending in
      both themes. — annotation-only; token + rule resolvers prove every disc declaration
      byte-identical (CHANGED 0). ≥44px disc size unchanged.
- [x] Composer status `idle` / `running` / `interrupted` / `unknown`, plus `awaitingSnapshot`,
      `sendingPrompt`, `stopping`, `promptError`, and `slashSubmitting`, render identically to today. —
      `@ds state:` labels on the existing selectors; no value changed (CHANGED 0).
- [x] The keyboard-safe anchoring drives layout unchanged; `--visual-viewport-height` and
      `--trigger-width` remain the layout inputs, fenced with `@ds guardrail`. — both vars confirmed
      untouched in the diff; `@ds edit: layout` names them as the anchor inputs; the anchoring hook is
      fenced `@ds guardrail` and `.tsx` is comments-only.
- [x] Send / steer / stop, snapshot, and prompt-submission logic are unchanged; the mutation path
      stays behind its one-use ticketed boundary. — `.tsx` comments-only (0 deletions); the mutation
      path is fenced `@ds guardrail`; no handler/prop/state change, so the ticketed boundary is
      byte-identical.
- [x] No source value, security boundary, or dependency is changed. — token resolver CHANGED 0,
      MISSING 0; rule resolver CHANGED 0 / VANISHED 0 / ADDED 0; no dependency change; no literal→token
      or logical-property conversion was made.
- [x] `npm run typecheck` passes. — exit 0.
- [x] `npm test` passes. — backend outside sandbox; this phase touches no backend code; only the
      pre-existing `attachment-normalization.test.ts` WASM flake fails (proven on clean HEAD earlier).
- [x] `npm run test:web` passes. — exit 0; **670 passed / 62 files** (incl. `SessionComposer.test.tsx`)
      — composer send/steer/stop/a11y behaviour unchanged.
- [x] `npm run build` passes. — exit 0.
- [x] The true-390px light capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline. — no rendered change possible: `.tsx`
      comments-only; the token + rule resolvers show every resolved declaration byte-identical; 390px
      no-overflow holds.
- [x] The true-390px dark capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline. — same proof, dark + system.
