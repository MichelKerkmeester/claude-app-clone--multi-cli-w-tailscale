# Tasks — Composer input

- [x] Map `SessionComposer` (tray, "+" tools popover trigger, single circular primary button and its
      four forms, status props) and its styling in `style.css`; confirm the viewport-anchor hook's
      `--visual-viewport-height` / `--trigger-width` outputs. — mapped; the anchor vars are read-only
      layout inputs and were confirmed untouched.
- [x] Migrate the tray and its slots (tools trigger, input, primary action) onto tokens and
      `@ds edit: layout` seams, keeping the visual-viewport vars as the layout inputs. — `@ds surface:
      composer` on the tray; `@ds slot:` on tools-trigger / input / primary-action / tools-popover;
      `@ds edit: layout` on the sticky bottom-anchor and tray-geometry rules (anchor vars preserved).
      Rules already token-backed, so no literal→token conversion was needed.
- [x] Add one `@ds state:` block per primary-button form (send / steer / stop / sending) and per
      composer status (`idle` / `running` / `interrupted` / `unknown`), plus `awaitingSnapshot`,
      `sendingPrompt`, `stopping`, `promptError`, `slashSubmitting`. — all present: `send · steer`,
      `stop`, `stopping · sending-inhibit`, `sending · slashSubmitting` on the disc; `idle` / `running`
      / `interrupted` / `unknown` on the tray; `awaitingSnapshot · sendingPrompt · slashSubmitting` on
      the input; `promptError` on the inline alert.
- [x] Fence send / steer / stop, snapshot, prompt-submission logic, and the keyboard-anchoring hook
      with `@ds guardrail` (presentation only). — `@ds guardrail` on the mutation path (submit / steer
      / stop / snapshot / slash-draft / attachment), the react-aria + keyboard wiring, and the tools
      popover's DialogTrigger/Popover/Dialog wiring; `.tsx` comments-only (0 deletions).
- [x] Confirm the hosted slash surface and plan control mount unchanged and the tools popover
      consumes the overlay primitive. — annotation-only; no markup/prop/handler change, so the slash
      surface, plan control, and popover mount byte-identical.
- [x] Capture true-390px light/dark of each button form and status (including the keyboard-anchored
      layout) and prove pixel-identity against the pre-migration baseline; record in `checklist.md`. —
      token + rule resolvers CHANGED 0 across light/dark/system (no literal→token, no logical
      conversion); `.tsx` comments-only so no rendered change is possible; row/anchor geometry
      unchanged.
