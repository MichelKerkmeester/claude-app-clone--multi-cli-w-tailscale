# Checklist — Plan-mode controls

- [ ] Every plan-mode component reads its colours from the semantic and component tokens; no raw
      source value is hard-coded in its rules.
- [ ] Each component declares `@ds surface:`, its slots, its layout seam, and one `@ds state:` block
      per `ModePresentationKind` and per gating state.
- [ ] The runtime state machine, mode authority, execution lease, plan protocol, and planToken
      redaction carry `@ds guardrail: do-not-edit` and are unchanged.
- [ ] Every state renders identically to its pre-migration baseline in light and dark, including the
      plan badge, the waiting-for-live-confirmation card, and the execute/leave flows.
- [ ] The plan protocol / lease tests stay green, proving the host/extension-enforced authority and
      mutation boundary are unchanged.
- [ ] No source value or security boundary is changed; no new dependency is added.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run test:web` passes.
- [ ] `npm run build` passes.
- [ ] The true-390px light capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline.
- [ ] The true-390px dark capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline.
