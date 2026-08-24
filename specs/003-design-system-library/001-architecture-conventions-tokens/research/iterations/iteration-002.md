# Iteration 002 — Lens: shadcn/ui CSS-variable semantic tokens

**Pass goal:** extract shadcn/ui's theming mechanism and judge what it validates/rejects in the
app's existing `:root` role tokens.

## Findings

- **"We use and recommend CSS variables for theming… Override those tokens in your CSS to change
  the look of your app without rewriting component classes."** The theme is a set of **semantic
  pairs** — `background`/`foreground`, `card`/`card-foreground`, `popover`/`popover-foreground`,
  `primary`/`primary-foreground`, `muted`/`muted-foreground`, `accent`/`accent-foreground`,
  `destructive`, `border`, `input`, `ring` — defined under `:root` and re-overridden verbatim under
  **`.dark`**. Components reference only these variables ([C1]).
- Dark mode = overriding the **same** tokens in `.dark`, not restyling components. Because tokens
  are referenced by components, theme remap is a write-once point per variable.
- shadcn/ui ships **no runtime** theme engine — pure CSS variables + a class toggle.

## Grounding in the real stylesheet

- The app already follows the shadcn pattern by coincidence: `:root` (style.css:29-92) defines
  surface/ink/accent roles (`--canvas`, `--surface-raised`, `--ink`, `--ink-muted`,
  `--accent-strong`, `--accent-ink`…), and both `:root[data-theme='dark']` (94-130) and the system
  block re-declare them. That is a correct, extendable shape.
- **The gap vs shadcn:** component-scoped sets (`--model-sheet-*`, `--slash-*`) re-declare raw
  colours three times (light/dark/system; style.css:4076-4116, 6343-6382) instead of resolving to
  the semantic layer. This is exactly what a semantic completion removes (Decision 3, Layer 3).

## Implication for Pi Remote

- Keep the semantic-pair model; add an explicit **primitive** layer below it so the "frozen
  palette" is a named source rather than a raw hex embedded in roles (Decision 3, Layer 1).
- Derive component tokens from semantic tokens so the theme remap is write-once — matching
  shadcn's "override tokens, not components".

## Rejected alternative

**`--no-css-variables` inline-utility theming** (each element carries `dark:bg-white
dark:text-zinc-950`). Rejected: moves the theme into dozens of JSX class strings, breaks the
single-stylesheet seam, and defeats the token-layer contrast manifest.

## Confirmed by
- <https://ui.shadcn.com/docs/theming> (fetched): token pairs, `.dark` override, no-runtime model.
- Repo: `src/style.css` `:root` role block + `:root[data-theme='dark']` + component triples.