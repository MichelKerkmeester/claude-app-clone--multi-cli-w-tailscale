# `a11y/` — structure & logic

Editor map. For *what/why*, see `README.md`.

## Shape

- **`aria-hide-outside.svelte.ts`** — exports `hideOutside`, `setSheetContext`, and `getSheetContext`; tracks active sessions, observes body mutations, exempts target subtrees and live regions, and restores prior `aria-hidden` values.
- **`interactions.ts`** — exports `hover`, `press`, `focusVisible`, and `focused`; each action adds and removes one interaction-state attribute and cleans up its listeners.

## Do-not

- **Don't hide the overlay target itself.** `hideOutside` must exempt each target, its descendants, and its ancestors while hiding unrelated body content.
- **Don't discard existing `aria-hidden` values.** The helper restores attributes it owns and leaves pre-existing hidden values intact.
- **Don't replace the interaction actions with CSS-only state.** Touch hover, pointer release, keyboard press, and focus-visible state need the event-aware actions.
- **Don't add feature-specific accessibility state here.** Keep these helpers reusable and let each primitive decide which shared behavior it needs.
