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
- **A Design section** — a token playground and an editable-seams reference (see below).

Nothing here writes to the app. The playground changes what *you* see in *your* browser; the app's
stylesheet is never touched.

---

## For designers

Three surfaces under **Design** let you change things instead of only looking at them.

### Token playground

Every custom property the stylesheets declare, grouped and editable. Change one and **every story
moves**, not just the page you are on, and it stays changed for your browser until you clear it.

**Copy CSS** gives you back only what you changed, as a `:root` block to paste. The catalog
deliberately writes no stylesheet — `scripts/token-identity.mjs` stays the one authority on what a
token is, so a retune reaches the app only when someone applies that block and the gate accepts it.

### The `flips` badge

Marks a token whose light and dark values differ. **Overriding one pins it flat across both themes.**
Worth reading before you change anything: pairing a surface that does not flip with an ink that does
is exactly what once made a whole theme render text in its own background colour.

### State controls

Page views expose plain controls — roster and queue state, counts, streaming state, attachments,
capability flags — that the story maps onto the real props. Reach a screen's states from a dropdown
instead of editing an object literal. A control that changes nothing is treated as a defect here, and
`scripts/catalog-state-visibility.mjs` fails the build over it.

### Editable seams

A page listing what the design system invites you to change and what is frozen, read out of the
component source and `app.css` at build time — so it cannot drift from the code it describes.

---

## The screenshot archive

`screenshots/` holds one image per story, tracked in git, with `MANIFEST.json` recording every story
including the ones that render nothing visible. Re-capture with `npm run story:shots` after any
rendering change and commit the shots alongside it.

Two things to know before you read a diff:

- **The archive is not byte-stable.** A few stories flake under concurrent capture — measured at five
  differing runs out of five, on both the current capture and a pre-change one. A moved shot is a
  flake only after a re-capture puts it back; if it stays changed, it is a real change and needs a
  reason.
- **It is captured in one theme.** `node scripts/ui-audit.mjs` renders every story in light *and*
  dark and is the only gate that sees the other one. An entire defect class once existed only in dark.

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

Run these in order after any rendering change. Each catches something the others cannot.

```bash
npm run build-storybook -w @pi-remote/web    # the catalog compiles
node scripts/catalog-smoke-cdp.mjs           # every story renders, light + dark, zero throws
node scripts/catalog-state-visibility.mjs    # no invisible state, no inert control, no impossible age
node scripts/token-override-check.mjs        # the playground still retunes other stories
node scripts/ui-audit.mjs                    # contrast, clipping, collision, touch targets — both themes
npm run story:shots                          # re-capture the archive
```

`catalog-state-visibility.mjs` deserves a word, because it exists for defects that passed every other
gate: a check summary published its state as a data attribute no CSS read, so passing and failing were
**identical in background, border and ink**; a streaming control rendered no difference at the block
count its own stories used; and two fixtures had drifted ten days from the pinned capture clock, so a
panel claimed "Updated 243 hours ago". Typecheck, both suites, story coverage and the render gate were
green through all three.

### The addons

Active today (in `main.ts` / `preview.ts`): **a11y** (automatic accessibility checks), **themes**
(the system/light/dark toolbar, via `withThemeByDataAttribute` on `data-theme`), and **autodocs**
(per-component docs pages, via each story's `autodocs` tag).

**designs** is installed but wired to nothing: no story declares a `design:` parameter, because there
is no Figma source for this app — the design system was authored in code, with `app.css` as its
origin. The addon stays installed so the links can be added if that changes; until then, treat any
claim that a Figma frame sits beside a surface as false.

Planned per the 009 spec: the **test** addon (`@storybook/addon-vitest`, running the stories as
interaction tests via the Vitest browser provider). Visual-regression via Chromatic is intentionally
not adopted (hosted/paid) — the local `catalog-smoke-cdp.mjs` render gate is the visual check.
