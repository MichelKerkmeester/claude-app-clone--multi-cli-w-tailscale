# The Pi Remote component catalog (Storybook)

Storybook is a live catalog of every visual piece of the Pi Remote phone app — each
button, card, sheet, and screen — shown on its own so you can look at it, theme it,
and read its documentation without running the whole app.

## See it (one command)

From the project root:

```bash
npm install       # first time only
npm run storybook
```

Your browser opens automatically at the catalog. No other setup.

## What you'll see

- **A sidebar** grouping every component (Views, Artifacts, Chrome, …). Click one to see it live.
- **A theme switch** (top toolbar, "Theme") — flip between **system / light / dark** and every
  surface re-inks through the real design tokens. The look is identical to the shipped app.
- **A Docs tab** per component — an auto-generated page describing it and its options.
- **An Accessibility panel** — automatic contrast / a11y checks on the component you're viewing.

Nothing here changes the app; it's a read-only catalog for looking and reviewing.

---

## For developers

### Add a story when you add a component

Every renderable `*.svelte` component has a co-located `*.stories.ts` next to it. Scaffold one:

```bash
npm run story:new app-mobile/src/<path>/<Component>.svelte
```

That writes a correct CSF3 stub (meta + `autodocs` tag + a `Default` story). Then fill its `args`
from **real demo fixtures** (`$shared/data/demo`) — one story per meaningful state — and, if the
component reads context, add a provider `decorators` entry. Copy the shape from any sibling
`*.stories.ts`; never invent values (the catalog must show what the app actually renders).

### The coverage gate keeps it complete

```bash
npm run story:coverage
```

Fails if any renderable component has no story. Genuinely non-renderable files (route wrappers,
context providers, compositional primitive sub-parts) are exempted in
`scripts/story-coverage-allowlist.json` — each with a written reason, and the gate prunes stale
entries. This is what keeps the catalog self-maintaining as the app grows.

### Verify a change didn't break rendering

```bash
npm run build-storybook -w @pi-remote/web   # the catalog compiles
node scripts/catalog-smoke-cdp.mjs          # every story renders, light + dark, zero throws
```

### The addons

Active today: **a11y** (automatic accessibility checks, in `main.ts`), **autodocs** (per-component
docs pages, via each story's `autodocs` tag), and the **system/light/dark** toolbar (a `preview.ts`
decorator driving `data-theme`). Planned per the 009 spec: the **themes** addon (replacing the
hand-rolled toolbar), the **designs** addon (a Figma frame beside each surface), and the **test**
addon (running the stories as interaction tests). Visual-regression via Chromatic is intentionally
not adopted (hosted/paid) — the local `catalog-smoke-cdp.mjs` render gate is the visual check.
