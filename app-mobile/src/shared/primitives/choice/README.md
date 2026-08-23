# Choice

Radio groups and toggle groups: the two exclusive-selection controls. The group roots expose a bindable string value, while Bits UI owns the selection semantics and the consumers own how each option looks.

## What lives here

- **`radio-group.svelte`** — the bindable `RadioGroup.Root` wrapper.
- **`radio-group-item.svelte`** — the `RadioGroup.Item` adapter for one radio option.
- **`toggle-group.svelte`** — the bindable single-select `ToggleGroup.Root` wrapper, rendered with a `radiogroup` role.
- **`toggle-group-item.svelte`** — the `ToggleGroup.Item` adapter for one toggle option.

## Why it's shaped this way

- **Selection stays exclusive.** Radio and toggle groups provide the two shared patterns for choosing one value from a set.
- **Roots and items stay compositional.** Items need their matching group root; the wrappers do not create a separate selection model.
- **Consumers own presentation.** Each adapter passes the option snippet and Bits UI props through without embedding a visual treatment.

Structure and do-nots are in `CODE.md`.
