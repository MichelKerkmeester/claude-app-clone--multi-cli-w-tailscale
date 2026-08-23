# `button/` — structure & logic

Editor map. For *what/why*, see `README.md`.

## Shape

- **`button.svelte`** — the native button surface; forwards `class`, `type`, `disabled`, `onclick`, and the remaining HTML button attributes, then renders its `children` snippet.
- **`button.svelte`** — applies `hover`, `press`, `focusVisible`, and `focused` from `app-mobile/src/shared/primitives/a11y/interactions.ts`, plus `data-disabled` when disabled.
- **`button.stories.ts`** — builds inline snippets with `createRawSnippet` and exercises default, disabled, and submit behavior.

## Do-not

- **Don't replace the interaction actions with CSS `:hover` or `:focus`.** Touch input can leave CSS hover state stuck; the pointer-aware actions prevent that.
- **Don't add component CSS here.** Consumers style `data-hovered`, `data-pressed`, `data-focus-visible`, `data-focused`, and `data-disabled` from their own surface styles.
- **Don't change the native button contract casually.** Keep `type`, `disabled`, click handling, and the remaining HTML attributes pass-through.
