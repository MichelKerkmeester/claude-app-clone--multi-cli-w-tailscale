# Disclosure

The collapsible primitive for content that should move out of the primary reading flow until a user asks for it. It combines a semantic heading, a trigger, and the collapsible content in one Bits-backed root.

## What lives here

- **`collapsible.svelte`** — the bindable `Collapsible.Root` wrapper with trigger and content snippets.
- **`collapsible.stories.ts`** — Storybook coverage for collapsed and expanded content.

## Why it's shaped this way

- **Open state is explicit.** Consumers can bind `open` while Bits UI owns visibility and keyboard behavior.
- **The trigger has a heading boundary.** The primitive keeps the trigger inside an `h3` so a disclosure has a predictable document structure.
- **Content stays compositional.** Consumers supply the trigger and body snippets; the primitive supplies the disclosure behavior without styling the surface.

Structure and do-nots are in `CODE.md`.
