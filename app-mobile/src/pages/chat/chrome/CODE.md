# `chrome/` — structure & logic

Editor map. For *what/why*, see `README.md`.

## Groups

- **Composer** — `SessionComposer.svelte` (textarea + send + IME handling), `ComposerCommandAutocomplete.svelte` (non-focus-stealing slash autocomplete), `ComposerTools.svelte`.
- **Palette** — `CommandPalette.svelte`, `CommandOption.svelte`.
- **Runtime strip** — `RuntimeStrip.svelte` (3 surfaces: runtime-strip, effort-trigger, build-plan-toggle), `RuntimeModeAnnouncer.svelte` (visually-hidden live region), `ModelEffortSheet.svelte`, `EffortRadioGroup.svelte`.
- **Plan mode** — `PlanModeButton.svelte`, `PlanModeMenu.svelte`, `PlanReadyCard.svelte`, `PlanReviewSheet.svelte`, `LeavePlanSheet.svelte`; presentation logic in `planModePresentation.ts`.
- **Header / todos** — `SessionHeader.svelte`, `TodoPanel.svelte` (Collapsible).

## Do-not (focus & a11y — no gate catches these)

- **The composer autocomplete must not take focus.** It uses virtual focus (`aria-activedescendant`) so the caret stays in the textarea; converting it to a focusable listbox breaks IME + iOS VoiceOver.
- **`LeavePlanSheet` restores focus explicitly on close** (`onOpenAutoFocus` preventDefault + explicit `.focus()`); don't remove that — the leave target must regain focus.
- **Sheets must hide the background from AT.** Opening a sheet/menu over the chat has to keep background controls (e.g. RuntimeStrip radios) out of the accessibility tree; that's what `shared/primitives/ariaHideOutside.svelte.ts` is for.
- **Keep the plan-mode keyboard shortcut pure** (`shared/data/planModeShortcut.ts`) — this folder wires it, doesn't reimplement it.
- These are god-file-sized on purpose (composer, ModelEffortSheet). **Section them, don't split them** — splitting is a redesign that touches focus/rendered values, explicitly out of scope.
