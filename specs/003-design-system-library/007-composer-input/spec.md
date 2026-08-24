<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Grandchild 6 — Composer input

## Summary

This grandchild migrates the bottom-anchored composer — the input tray, the morphing primary
button, and the keyboard-safe viewport anchoring — onto the token library and the `@ds`
inline-comment grammar, with per-state seams for the primary button's send / steer / stop /
sending forms and the composer's status states. It is value-preserving and keeps react-aria and the
viewport-anchor hook owning behaviour.

## Problem & Goal

The composer is one bottom-anchored tray whose single circular primary button morphs across four
forms and whose layout depends on runtime-written CSS vars (`--visual-viewport-height`,
`--trigger-width`). Its per-state styling is hand-authored, so a designer cannot restyle the send,
stop, or error states without reading the composer's status logic and keyboard-anchoring hook. The
goal is a composer whose button forms, status states, and tray layout sit behind `@ds` seams, so a
designer can restyle each state while the send/steer/stop logic and viewport anchoring stay fenced.

## Scope

### In scope

- Migrating `SessionComposer` — the input tray, the "+" tools popover trigger, and the single
  circular primary button — onto tokens and layout seams (`@ds edit: layout`).
- Per-state `@ds state:` blocks for the primary button forms (send / steer / stop / sending) and the
  composer status (`idle` / `running` / `interrupted` / `unknown`), plus `awaitingSnapshot`,
  `sendingPrompt`, `stopping`, `promptError`, and `slashSubmitting`.
- Confirming the keyboard-safe viewport anchoring (`useVisualViewportAnchor` writing
  `--visual-viewport-height` and `--trigger-width`) drives layout unchanged, fenced as a guardrail.

### Out of scope

- The slash-command surface hosted in the composer (grandchild `008`), the plan-mode control
  (grandchild `009`), and the tools-popover overlay primitive (grandchild `012`) — this grandchild
  hosts them but does not own them.
- Any change to send / steer / stop, snapshot, or prompt-submission logic — presentation only.
- Any security, redaction, ticketing, or plan-mode change.

## User-facing behavior + states

Unchanged. The composer shows: the single circular primary button morphing across **send**,
**steer**, **stop**, and **sending**; composer status `idle` / `running` / `interrupted` /
`unknown`; `awaitingSnapshot`, `sendingPrompt`, `stopping`, `promptError`, and `slashSubmitting`
affordances; and the "+" tools popover trigger. The tray stays anchored above the keyboard via the
visual-viewport vars. Each renders identically to today in both themes.

## Acceptance criteria

- `SessionComposer` declares `@ds surface:`, `@ds slot:` (tray, tools trigger, input, primary
  action), `@ds edit: layout`, and one `@ds state:` block per button form and composer status,
  reading from tokens only.
- Every primary-button form and composer status renders identically to today in both themes.
- The keyboard-safe anchoring drives layout unchanged; `--visual-viewport-height` and
  `--trigger-width` remain the layout inputs, fenced with `@ds guardrail`.
- Send / steer / stop, snapshot, and prompt-submission logic are unchanged.
- `npm run typecheck`, `npm test`, `npm run test:web`, and `npm run build` pass; the true-390px
  light/dark captures of the composer states are visually identical to the pre-migration baseline.

## Security & Redaction

Styling-only. No send / steer / stop, snapshot, prompt, redaction, ticket, plan-mode, or host-file
path is touched; the composer's mutation path stays behind its existing one-use ticketed boundary.
No new dependency is added.

## Dependencies & affected areas

- Composer: `apps/pi-remote-web/src/SessionComposer.tsx`.
- Keyboard anchoring (confirmed, not re-architected): `apps/pi-remote-web/src/useVisualViewportAnchor.ts`
  (`--visual-viewport-height`, `--trigger-width`), `apps/pi-remote-web/src/usePlanModeShortcut.ts`.
- Composer styling: `apps/pi-remote-web/src/style.css` (composer tray, primary-button, tools-popover
  rules).
- Inbound: grandchildren `001`–`003` and `012-overlays-sheets-modals` (the tools popover primitive).
  Hosts (not owned): grandchildren `008-slash-command-autocomplete` and `009-plan-mode-controls`.
- Baseline evidence: `scripts/design-system-cdp.mjs` with composer fixtures (each button form and
  status).
