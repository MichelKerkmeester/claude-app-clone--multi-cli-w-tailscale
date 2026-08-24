<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Grandchild 9 — Plan-mode controls

## Summary

This grandchild migrates the plan-mode control surface — the mode button, the Build/Plan menu, the
plan-ready card, the review and leave sheets, the runtime strip, and the mode announcers — onto the
design system. It moves their rules onto the token layers, applies the `@ds` grammar to every
editable region and each `ModePresentationKind`, and keeps the host/extension-enforced plan-mode
authority and the mutation boundary entirely untouched. It is a value-preserving, security-preserving
restyle.

## Problem & Goal

Plan mode is the app's most security-sensitive control cluster: a persistent Build/Plan control, a
plan-ready card, a review sheet with an atomic execute action, a leave-plan confirmation, and dual
live regions, all gated by a non-optimistic runtime state machine. Their look is authored as bespoke
rules with no labelled seams for the many presentation kinds and gating states. A designer cannot
restyle these controls without brushing against authority logic. The goal is to move the surface onto
the token library and the `@ds` grammar so a low-code designer can adjust styling, slots, layout, and
each presentation state safely, while the runtime authority and mutation boundary stay fenced and
unchanged.

## Scope

### In scope

- Migrate the plan-mode control, menu, ready card, review sheet, leave sheet, runtime strip, and
  announcers onto the semantic and component token layers.
- Apply the `@ds` grammar: `@ds surface:` per component, `@ds slot:` for their regions, `@ds edit:
  layout` for stacking and safe-area, and one `@ds state:` block per visual state.
- Cover every visual state as its own labelled seam: the `ModePresentationKind` set (`checking`,
  `build`, `plan`, `executing`, `applying`, `running`, `stale`, `offline`, `forbidden`,
  `unsupported`, `extension-error`, `delivery-unknown`, `unavailable`); the plan-ready card's live /
  newest / valid vs waiting-for-live-confirmation states; the review sheet's `isExecuting` and
  swipe-dismiss states; the leave sheet's `mode` / `plan-ready` variants; and the dual polite / alert
  announcer states.
- Fence the runtime state machine, mode authority, execute-plan atomicity, and the mutation boundary
  behind `@ds guardrail: do-not-edit`.

### Out of scope

- Any change to a frozen source value or to Inter + Source Serif 4.
- **Any change to the host/extension-enforced plan-mode authority, the default-deny enforcement, the
  fail-closed execution lease, the `set_mode`/`execute_plan` protocol, planToken redaction, or the
  mutation boundary.** The migration restyles the controls; it never touches how plan mode is
  enforced or how a plan is executed.
- The shared overlay/sheet primitive — that is grandchild `012`; this grandchild consumes it.

## User-facing behavior + states

No behaviour change. Every mode presentation and gating state renders identically before and after:
the same disabled/rows-disabled gating derived from runtime + connection, the same waiting-for-live
plan-ready affordance, the same execute confirmation flow, and the same polite/alert announcements —
now driven by tokenized, comment-labelled `@ds state:` blocks.

## Acceptance criteria

- Every plan-mode component reads its colours from the semantic and component tokens; no raw source
  value is hard-coded in its rules.
- Each component declares `@ds surface:`, its slots, its layout seam, and one `@ds state:` block per
  `ModePresentationKind` and per gating state listed above; the authority/mutation wiring carries
  `@ds guardrail`.
- Every state renders identically to its pre-migration baseline in light and dark, including the
  plan badge, the waiting-for-live-confirmation card, and the execute/leave flows.
- The host/extension-enforced authority and mutation boundary are provably unchanged (the plan
  protocol and lease tests stay green).
- `npm run typecheck`, `npm test`, `npm run test:web`, and `npm run build` pass; the true-390px
  light/dark captures of the plan-mode controls are visually unchanged.

## Security & Redaction

Styling-only, over the app's most security-sensitive surface. The migration touches no plan-mode
authority, default-deny enforcement, execution lease, `set_mode`/`execute_plan` protocol, planToken
redaction, or mutation boundary; all of that stays behind `@ds guardrail` comments and unchanged. No
new dependency is added. The frozen posture — host/extension-enforced plan mode, content-free push —
is preserved verbatim.

## Dependencies & affected areas

- Surface: `apps/pi-remote-web/src/PlanModeButton.tsx`, `apps/pi-remote-web/src/PlanModeMenu.tsx`,
  `apps/pi-remote-web/src/PlanReadyCard.tsx`, `apps/pi-remote-web/src/PlanReviewSheet.tsx`,
  `apps/pi-remote-web/src/LeavePlanSheet.tsx`, `apps/pi-remote-web/src/RuntimeStrip.tsx`,
  `apps/pi-remote-web/src/RuntimeModeAnnouncer.tsx`.
- Logic (read, not restyled): `apps/pi-remote-web/src/runtime.ts`,
  `apps/pi-remote-web/src/runtime-issues.ts`, `apps/pi-remote-web/src/usePlanModeShortcut.ts`.
- Styles: the plan-mode rules in `apps/pi-remote-web/src/style.css`.
- Consumes: grandchild `012-overlays-sheets-modals` (the sheet primitive) and the token library.
- Tests: the plan-mode protocol, lease, and web tests under `apps/pi-remote-web/tests/` and the relay/
  extension suites (green, unchanged).
- Baseline evidence: `scripts/design-system-cdp.mjs` with the plan-mode fixtures.
