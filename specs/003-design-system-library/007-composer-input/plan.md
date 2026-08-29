<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Plan — Composer input

## Approach

Migrate the composer onto tokens and per-state seams without touching its mutation logic or the
viewport-anchor hook. Move the tray, tools trigger, and primary button onto `@ds` seams, add one
state block per button form and composer status, fence the send/steer/stop logic and the
keyboard-anchoring vars, and prove each state renders identically above the keyboard.

## Steps

1. Map `SessionComposer`: the tray, the "+" tools popover trigger, the single circular primary
   button and its four forms, the status props, and their styling in `style.css`; confirm the
   viewport-anchor hook's `--visual-viewport-height` / `--trigger-width` outputs.
2. Migrate the tray and its slots (tools trigger, input, primary action) onto tokens and
   `@ds edit: layout` seams, keeping the visual-viewport vars as the layout inputs.
3. Add one `@ds state:` block per primary-button form (send / steer / stop / sending) and per
   composer status (`idle` / `running` / `interrupted` / `unknown`), plus `awaitingSnapshot`,
   `sendingPrompt`, `stopping`, `promptError`, and `slashSubmitting`.
4. Fence send / steer / stop, snapshot, and prompt-submission logic and the keyboard-anchoring hook
   with `@ds guardrail` (presentation only).
5. Confirm the hosted slash surface and plan control still mount unchanged (owned by their
   grandchildren) and the tools popover consumes the overlay primitive.
6. Capture true-390px light/dark of each button form and status and diff against the pre-migration
   baseline, including the keyboard-anchored layout.

## Files to change

- `apps/pi-remote-web/src/SessionComposer.tsx` (tray, primary button, status seams — token reads,
  presentation only)
- `apps/pi-remote-web/src/style.css` (composer tray / primary-button / tools-popover rules)
- `scripts/design-system-cdp.mjs` (composer fixtures, if needed)

## Verification gate

Run from the repository root:

```text
npm run typecheck
npm test
npm run test:web
npm run build
node scripts/design-system-cdp.mjs --surface composer --viewport-width 390 --theme light --output <temporary-directory>/composer-light.png
node scripts/design-system-cdp.mjs --surface composer --viewport-width 390 --theme dark --output <temporary-directory>/composer-dark.png
```

The gate passes only when all suites and the build pass, the keyboard-anchored layout is unchanged,
the CDP runner reports exactly 390 CSS pixels with zero page horizontal overflow, and the light/dark
captures of every primary-button form and composer status are visually identical to the
pre-migration baseline.
