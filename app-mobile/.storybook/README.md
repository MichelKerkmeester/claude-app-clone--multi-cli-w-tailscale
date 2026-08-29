# .storybook/: the component catalog and its design tooling

---

## 1. OVERVIEW

This folder configures the Svelte component catalog and holds the tooling that
edits the design system rather than demonstrating a surface. Component stories
live beside their component under `src/`; only catalog tooling lives here, so it
never reaches the app bundle.

| File | Role |
|------|------|
| `main.ts` | Framework, addons, and the two story globs (`src/**` and this folder) |
| `preview.ts` | Loads `app.css`, drives `data-theme` via addon-themes, re-applies token overrides |
| `token-playground.svelte` | The designer surface for retuning the design system |
| `token-overrides.ts` | Discovery, persistence and export shared by the playground and the preview |

---

## 2. TOKEN PLAYGROUND

Open **Design → Token playground**. Every custom property the stylesheets
declare on `:root` is listed, grouped, and editable. Change one and the whole
catalog re-renders against it — navigate to any other story and the retune is
still applied.

- **Palette primitives first.** The eight `--pi-*` values feed most semantic
  roles, so retuning one moves the entire surface at once.
- **`flips`** marks a token whose light and dark values differ. Overriding it
  pins both themes to one value. That badge is worth reading before you change
  anything: pairing a surface that does not flip with an ink that does is what
  once made an entire theme render text in its own background colour.
- **Copy CSS** yields only the tokens you changed, as a `:root` block to paste
  into `app-mobile/src/app.css`.
- **Reset all** clears the retune. Overrides live in this browser only.

Nothing here writes a stylesheet. `scripts/token-identity.mjs` remains the one
authority on what a token actually is, so a retune becomes real only when the
pasted block passes that gate.

---

## 3. WHY OVERRIDES BEHAVE THIS WAY

An override is set as an inline custom property on the document element. That
outranks every stylesheet rule, including the per-theme blocks — which is what
makes the change visible instantly, and also why an overridden token stops
flipping. The playground labels that rather than leaving it to be discovered.

`preview.ts` re-applies the stored set before each story renders. With nothing
stored it removes nothing, which is why it runs unconditionally instead of
hiding behind a flag someone has to find.

---

## 4. RELATED

- `scripts/story-coverage.mjs` — requires a story for every renderable component
  under `src/`; this folder is outside that scan.
- `scripts/ui-audit.mjs` — audits the product's surfaces and skips `design-*`
  tooling by default; name the story to audit it anyway.
- `scripts/capture-screenshots.mjs` — captures every story, this page included.
