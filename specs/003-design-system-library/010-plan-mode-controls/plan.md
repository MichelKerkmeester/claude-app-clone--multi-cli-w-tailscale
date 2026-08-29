<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Plan — Plan-mode controls

## Approach

Restyle in place, value-preserving and security-preserving. Read the plan-mode components' rules,
map each colour onto the semantic role tokens, wrap every editable region and each presentation kind
in the `@ds` grammar, and leave the runtime authority, execution lease, and mutation boundary
untouched behind guardrail comments. Prove pixel-identity across every state and prove the authority
is unchanged by keeping the plan protocol / lease tests green.

## Steps

1. Inventory the plan-mode rules in `style.css` and record each `ModePresentationKind` and gating
   state's current appearance across the button, menu, ready card, review/leave sheets, strip, and
   announcers.
2. Map each component's colours onto the semantic role tokens (and component tokens where a component
   warrants its own set), resolving to the same values.
3. Label each component's slots (`@ds slot:`) and layout seam (`@ds edit: layout` for stacking and
   safe-area), and add `@ds surface:` per component.
4. Wrap each visual state in a `@ds state:` block: the thirteen `ModePresentationKind` values; the
   plan-ready live/newest/valid vs waiting states; the review-sheet `isExecuting`/dismiss states; the
   leave-sheet `mode`/`plan-ready` variants; the polite/alert announcer states.
5. Fence the runtime state machine, mode authority, execution lease, `set_mode`/`execute_plan`
   protocol, and planToken redaction with `@ds guardrail: do-not-edit`.
6. Run the plan protocol / lease / web tests to prove the authority and mutation boundary are
   unchanged by the restyle.
7. Capture the plan-mode controls at true-390px light/dark across their principal states and diff
   against the pre-migration baseline.

## Files to change

- `apps/pi-remote-web/src/PlanModeButton.tsx`, `PlanModeMenu.tsx`, `PlanReadyCard.tsx`,
  `PlanReviewSheet.tsx`, `LeavePlanSheet.tsx`, `RuntimeStrip.tsx`, `RuntimeModeAnnouncer.tsx`
  (class/slot/state labels; behaviour and authority unchanged)
- `apps/pi-remote-web/src/style.css` (plan-mode rules onto tokens)
- `apps/pi-remote-web/src/design-system/tokens.md` (any new component-token set documented)
- `scripts/design-system-cdp.mjs` (plan-mode capture support, if needed)

## Verification gate

Run from the repository root:

```text
npm run typecheck
npm test
npm run test:web
npm run build
node scripts/design-system-cdp.mjs --surface plan-mode-controls --viewport-width 390 --theme light --output <temporary-directory>/plan-mode-controls-light.png
node scripts/design-system-cdp.mjs --surface plan-mode-controls --viewport-width 390 --theme dark --output <temporary-directory>/plan-mode-controls-dark.png
```

The gate passes only when all suites and the build pass, the plan protocol / lease tests stay green
proving the authority and mutation boundary are unchanged, the CDP runner reports exactly 390 CSS
pixels with zero page horizontal overflow, and every plan-mode state is visually identical to its
pre-migration baseline in both themes with no source value changed and no security boundary touched.
