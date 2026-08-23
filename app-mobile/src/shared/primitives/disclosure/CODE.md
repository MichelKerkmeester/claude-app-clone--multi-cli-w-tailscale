# `disclosure/` — structure & logic

Editor map. For *what/why*, see `README.md`.

## Shape

- **`collapsible.svelte`** — wraps `Collapsible.Root`, binds `open`, places the trigger snippet inside an `h3`, and renders the body through `Collapsible.Content`.
- **`collapsible.stories.ts`** — builds inline trigger and paragraph snippets and covers collapsed and expanded states.

## Do-not

- **Don't render the trigger or content outside `collapsible.svelte`.** The two parts rely on the same Bits UI collapsible root.
- **Don't remove the heading wrapper.** The primitive's `h3` gives repeated disclosure sections a stable document structure.
- **Don't reimplement open-state, keyboard, or visibility behavior in a consumer.** Bind `open` and provide snippets instead.
- **Don't add component CSS here.** The consuming surface owns spacing, animation, and visual styling.
