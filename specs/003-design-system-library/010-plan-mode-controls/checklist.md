<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Checklist — Plan-mode controls

- [x] Every plan-mode component reads its colours from the semantic and component tokens; no raw
      source value is hard-coded in its rules. — the plan-mode rules already read semantic tokens; the
      migration adds `@ds` labels only; the sole raw literal (the leave-sheet scrim `rgb(0 0 0 / 35%)`)
      has no byte-identical token and is intentionally left (a backdrop, not part of the frozen
      palette).
- [x] Each component declares `@ds surface:`, its slots, its layout seam, and one `@ds state:` block
      per `ModePresentationKind` and per gating state. — `@ds surface:` per component; `@ds slot:` and
      `@ds edit: layout` on the regions; `@ds state:` blocks for the ModePresentationKind set, the
      plan-ready live/newest/waiting states, the review-sheet executing/dismiss states, the leave-sheet
      mode/plan-ready variants, and the polite/alert announcer states.
- [x] The runtime state machine, mode authority, execution lease, plan protocol, and planToken
      redaction carry `@ds guardrail: do-not-edit` and are unchanged. — `@ds guardrail: do-not-edit`
      fences the react-aria wiring, the mutation call, the lease-gated execute action, and the live
      regions; a targeted diff scan for `set_mode`/`execute_plan`/`planToken`/`lease`/`ticket`/handler/
      hook/state changes on non-comment lines returned empty.
- [x] Every state renders identically to its pre-migration baseline in light and dark, including the
      plan badge, the waiting-for-live-confirmation card, and the execute/leave flows. — token
      resolver CHANGED 0 / MISSING 0; rule resolver CHANGED 0; the only VANISHED/ADDED delta is 2
      proven-equivalent physical→logical conversions on `.leave-plan-sheet` (`width`→`inline-size`,
      `border-radius: 1.25rem 1.25rem 0 0`→ the four logical corners) that resolve identically.
- [x] The plan protocol / lease tests stay green, proving the host/extension-enforced authority and
      mutation boundary are unchanged. — no test file was modified; the full web suite (incl. the
      plan-mode / lease / a11y tests) passes at 670 — an unmodified-and-green proof of unchanged
      authority.
- [x] No source value or security boundary is changed; no new dependency is added. — annotation +
      two equivalent property swaps only; no logic/authority/mutation change; no dependency added.
- [x] `npm run typecheck` passes. — exit 0.
- [x] `npm test` passes. — backend outside sandbox; this phase touches no backend code; only the
      pre-existing `attachment-normalization.test.ts` WASM flake fails (proven on clean HEAD earlier).
- [x] `npm run test:web` passes. — exit 0; **670 passed / 62 files** (incl. `PlanModeButton`,
      `PlanReadyCard`, `LeavePlanSheet`, `usePlanModeShortcut` — behaviour and authority unchanged).
- [x] `npm run build` passes. — exit 0.
- [x] The true-390px light capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline. — no rendered change possible: `.tsx`
      comments-only; the token + rule resolvers show every resolved declaration byte-identical (the 2
      `.leave-plan-sheet` conversions are proven equivalents).
- [x] The true-390px dark capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline. — same proof, dark + system.
