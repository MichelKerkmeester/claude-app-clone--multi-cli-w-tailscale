# `chrome/` — structure & logic

Editor map. For *what/why*, see `README.md`.

## Groups

- **Composer** — `session-composer.svelte` (textarea + send + IME handling), `composer-command-autocomplete.svelte` (non-focus-stealing slash autocomplete), `composer-tools.svelte`.
- **Palette** — `command-palette.svelte`, `command-option.svelte`.
- **Runtime strip** — `runtime-strip.svelte` (3 surfaces: runtime-strip, effort-trigger, build-plan-toggle), `runtime-mode-announcer.svelte` (visually-hidden live region), `sheet-model-effort.svelte`, `radio-effort.svelte`.
- **Plan mode** — `button-plan-mode.svelte`, `menu-plan-mode.svelte`, `card-plan-ready.svelte`, `sheet-plan-review.svelte`, `sheet-leave-plan.svelte`; presentation logic in `plan-mode-presentation.ts`.
- **Header / todos** — `session-header.svelte`, `todo-panel.svelte` (Collapsible).

## Do-not (focus & a11y — no gate catches these)

- **The composer autocomplete must not take focus.** It uses virtual focus (`aria-activedescendant`) so the caret stays in the textarea; converting it to a focusable listbox breaks IME + iOS VoiceOver.
- **`LeavePlanSheet` restores focus explicitly on close** (`onOpenAutoFocus` preventDefault + explicit `.focus()`); don't remove that — the leave target must regain focus.
- **Sheets must hide the background from AT.** Opening a sheet/menu over the chat has to keep background controls (e.g. RuntimeStrip radios) out of the accessibility tree; that's what `shared/primitives/a11y/aria-hide-outside.svelte.ts` is for.
- **Keep the plan-mode keyboard shortcut pure** (`shared/commands/plan-mode-shortcut.ts`) — this folder wires it, doesn't reimplement it.
- These are god-file-sized on purpose (composer, ModelEffortSheet). **Section them, don't split them** — splitting is a redesign that touches focus/rendered values, explicitly out of scope.
