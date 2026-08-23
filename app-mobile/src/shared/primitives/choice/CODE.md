# `choice/` — structure & logic

Editor map. For *what/why*, see `README.md`.

## Shape

- **`radio-group.svelte`** — wraps `RadioGroup.Root`, exposes bindable `value`, and renders the child snippet.
- **`radio-group-item.svelte`** — wraps `RadioGroup.Item` and forwards the consumer's option snippet and item props.
- **`toggle-group.svelte`** — extracts the single-select `ToggleGroup.Root` props, binds `value`, and supplies a `radiogroup` root snippet.
- **`toggle-group-item.svelte`** — wraps `ToggleGroup.Item` and forwards the consumer's option snippet and item props.

## Do-not

- **Don't render a choice item without its matching group root.** Radio and toggle items depend on their Bits UI group context.
- **Don't turn `toggle-group.svelte` into a multi-select group.** This wrapper deliberately fixes the root to `type="single"` and exposes one bindable string value.
- **Don't duplicate selection or keyboard behavior in consumers.** Pass values and snippets through the wrappers so Bits UI remains the behavior owner.
- **Don't add component CSS here.** The consuming surface owns the option layout and visual states.
