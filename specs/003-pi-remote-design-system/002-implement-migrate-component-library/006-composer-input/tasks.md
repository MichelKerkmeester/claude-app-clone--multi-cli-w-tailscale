# Tasks — Composer input

- [ ] Map `SessionComposer` (tray, "+" tools popover trigger, single circular primary button and its
      four forms, status props) and its styling in `style.css`; confirm the viewport-anchor hook's
      `--visual-viewport-height` / `--trigger-width` outputs.
- [ ] Migrate the tray and its slots (tools trigger, input, primary action) onto tokens and
      `@ds edit: layout` seams, keeping the visual-viewport vars as the layout inputs.
- [ ] Add one `@ds state:` block per primary-button form (send / steer / stop / sending) and per
      composer status (`idle` / `running` / `interrupted` / `unknown`), plus `awaitingSnapshot`,
      `sendingPrompt`, `stopping`, `promptError`, `slashSubmitting`.
- [ ] Fence send / steer / stop, snapshot, prompt-submission logic, and the keyboard-anchoring hook
      with `@ds guardrail` (presentation only).
- [ ] Confirm the hosted slash surface and plan control mount unchanged and the tools popover
      consumes the overlay primitive.
- [ ] Capture true-390px light/dark of each button form and status (including the keyboard-anchored
      layout) and prove pixel-identity against the pre-migration baseline; record in `checklist.md`.
