# Research — Architecture, Conventions & Token Library (synthesized decision)

> **STATUS: DECIDED — build-ready.** This file replaces the placeholder and is the canonical
> authority every Phase-2 grandchild (esp. `001-tokens-foundation` and `002-theming-light-dark`)
> consumes. The three decisions below are final for this phase: a migration child must NOT
> re-decide them. It may only propose an *amendment* (via the spec amendment route) if it finds a
> genuine blocker, documented with evidence.
>
> **AMENDED (2026-08-19) — Decision 1 superseded.** The app is being rewritten to SvelteKit 5 /
> Svelte 5 (SPA) so every component is one `.svelte` file with a co-located scoped `<style>`.
> Decision 1 (component architecture) is superseded; **Decisions 2 and 3 are carried forward
> unchanged**. This table is intentionally left intact — see
> `../../005-sveltekit-spa-migration/amendment.md` for the clause-by-clause reversal.
>
> **Frozen contracts carried in (never weighed):** the ink-on-parchment palette **values**,
> Inter + Source Serif 4, the light/dark/system theming, WCAG AA, `>=44px` interactive targets,
> and the read-only-by-default security posture. This decision **formalizes** that palette into a
> layered token library and an editable-seam model; it changes no value and no security boundary.
> The Phase-2 CDP baseline (pixel-identical light AND dark at true 390px) is the authority.

## Decisions at a glance

| # | Decision | One-line summary |
|---|----------|-------------------|
| 1 | **Component architecture** | Keep the single `src/style.css` + Tailwind-4 `@theme` model and the existing surface-grouped file layout; a component is a **semantic-flat-classed, stateless presentational unit** whose states are declared via **react-aria / `data-*` attribute selectors**, its variants via **class suffixes**, and its parts via **named slot classes**. No per-component CSS, no runtime variant props, no utility sprinkling. |
| 2 | **Designer-editability model** | Token-first CSS plus a refined inline-comment grammar (`@ds surface:` `@ds slot:` `@ds state:` `@ds variant:` `@ds edit:` `@ds guardrail:` `@ds end`) in `style.css` and narrow labelled seams in each `.tsx`. A designer edits **styling, layout, per-state presentation, and markup structure** at labelled seams; **logic, react-aria wiring, a11y/security invariants, and the security boundary are `@ds guardrail:`-fenced and unreachable**. |
| 3 | **Token-library architecture** | Three layers, all inside the single stylesheet: **primitive** (frozen palette raw values as `--pi-*`), **semantic/role** (the existing themed `:root` roles, remapped per theme), **component** (thin per-surface aliases that resolve to semantic tokens, never re-declare primitives). WCAG AA is guaranteed by an **on- ink/surface pairing invariant + a machine-checkable contrast manifest** over the semantic→primitive map — not by per-rule checks. |

---

## Decision 1 — Component architecture & conventions

### The choice

**Keep the app exactly where it is and codify it.** The real authorship model — `src/style.css`
(~7,000 lines today) as the single presentational authority, a Tailwind-4 `@theme` block for
type/radius/easing (no `tailwind.config`), and react-aria (v1.11) owning behaviour and state — is
the correct foundation for a designer-editable system, and it is exactly the stack of the
strongest comparable "designer-editable coded system": Untitled UI React is "Tailwind CSS +
React Aria" ([C4][c4]). We **formalize** the conventions rather than replace the library.

- **File layout.** Keep the existing surface-grouped layout — flat `src/*.tsx` for chrome and
  shared objects, `src/features/<surface>/*`, `src/artifacts/*`, `src/rich-content/*`. Do **not**
  introduce a `components/` directory or a generic component-API layer. The ~55 semantic
  components *are* the API. Phase 2 migrates one surface group per grandchild as it stands
  (grandchildren `004`–`014`).
- **One `style.css`.** Every presentation rule stays in the single stylesheet. No CSS Modules, no
  per-component `.css`, no `<style>` tags — matches today and keeps every "edit here" seam
  legible in one place (shadcn/ui likewise relies on one `globals.css`; [C1][c1]).
- **Class naming.** Semantic flat kebab-case part names already in the code (`slash-option`,
  `ask-question-option-row`, `todo-task-row`, `artifact-card`, `model-sheet-modal`). Keep them. A
  class names a *slot* (a presentational part), never a visual token value.
- **States = attribute selectors, never JS-duplicated classes.** react-aria already emits the
  attribute hooks: `[data-pressed]`, `[data-focus-visible]`, `[aria-pressed]`, `[aria-selected]`,
  `[aria-disabled]`; the app already uses `[data-disabled]`, `[data-focused]`, `[data-exiting]`,
  `[data-todo-task-state]`, `[data-todo-all-done]`, `[data-control-presentation='readonly']`.
  Convention: **a state is styled by exactly one attribute selector**
  (`[aria-pressed='true']`, `[data-todo-task-state='done']`), and state models write only the
  `data-*` attribute. No `.is-active` classes toggled in JSX.
- **Variants = class suffixes.** A fixed visual typing of a part uses a stable class suffix, as
  today (`ask-question-option-indicator-single`/`-multiple`, `todo-state-glyph-pending`/`done`).
  Variants are enumerated in the [catalog][cat] (§3.4).
- **Slots = named part classes.** A component decomposes into named slot classes (`slash-name-line`,
  `slash-desc`, `slash-meta`…). A `@ds slot:` block in `style.css` styles one part; a `@ds slot:`
  seam in `.tsx` marks where its markup lives (Decision 2).
### Why this over the alternatives (and what we reject)

- **Reject a pre-styled component library** (Radix Themes' `<Theme appearance>`, `<Button
  variant>`, `accentColor`/`grayColor`/`radius`/`scaling` props; [C2][c2]). Radix Themes is a
  self-contained styled library with its own token canon — adopting it would replace the frozen
  single stylesheet and the bespoke ink-on-parchment tokens, and it owns a runtime `Theme`. The
  app needs its **own** presentational tokens under one stylesheet, with react-aria (not Radix
  Themes' styled wrappers) as behaviour. We borrow Radix Themes' *ideas* — theme as a first-class
  concept, dark mode via a class/attribute, live preview — not its library.
- **Reject runtime variant props / `class-variance-authority`** and any API that turns variants
  into JS objects. react-aria `Button`/`Checkbox`/etc. is already the primitive; pushing variants
  into props splits styling out of the single stylesheet and hides the "what can I edit?" answer
  behind code. Variants stay in `style.css`.
- **Reject utility-first-in-JSX.** The app deliberately uses semantic classes; sprinkling
  Tailwind utilities onto elements would move the designer's edit surface out of the single
  stylesheet. The `@theme` block is retained for type/radius/easing **tokens**; the app's own
  rules consume those CSS variables directly.

### Canonical file / skeleton shape a Phase-2 migration follows

**A migrated surface is a `.tsx` (markup + slots, enumerated states) and a labelled region of
`style.css` (presentation).** Canonical `surface.tsx` skeleton:

```tsx
// @ds surface [ask-question-card]
// One interactive unit. react-aria owns behaviour; presentational styling
// lives in the matching @ds surface block in src/style.css. A designer may
// edit MARKUP between @ds slot seams and nothing under @ds guardrail.
export function AskQuestionCard(props) {
  // @ds guardrail logic: hooks, handlers, relay, aria/role wiring, state
  // modelling — NOT designer-editable.
  const viewModel = useAskQuestionState(/* … */);
  const submit = useAskQuestionMutation(/* … */);
  const controlsDisabled = /* … */;

  return (
    <article
      ref={cardRef}
      className="ask-question-card"
      data-ask-question-card
      // @ds state [phase] — attribute the state-model writes; style.css styles it.
      data-ask-question-phase={effectivePhase}
      aria-labelledby={labelId}
      aria-describedby={statusId}
    >
      {/* @ds slot [prompt] · hasContent=required */}
      <AskQuestionPrompt viewModel={viewModel} />
      {/* @ds slot [form] · mayReorder */}
      {!terminal && <form className="ask-question-form">…</form>}
      {/* @ds slot [status] · hasContent=required */}
      <AskQuestionStatus state={effectiveState} />
    </article>
  );
}
```

Canonical `style.css` block (Decision 2 defines the labels precisely):

```css
/* @ds surface [todo-panel] — plan checklist surface. */
.todo-panel { …declarations… }

/* @ds slot [task-row] — one task's row.          */ .todo-task-row { … }
/* @ds state [done] on .todo-task-row            */ .todo-task-row[data-todo-task-state='done'] { … }
/* @ds variant [all-done] …                      */ .todo-panel[data-todo-all-done='true'] { … }
/* @ds end surface [todo-panel] */
```

### Phase-2 implication

Every per-surface grandchild (`004`–`014`) does the **same** three-hours-of-work: (a) confirm
react-aria state already lives in `data-*` attributes and move any stray class-as-state to
attribute selectors, (b) replace every **literal colour/spacing/radius value in its rules** with
semantic tokens (Decision 3) — this is where per-surface duplication like the `--model-sheet-*` /
`--slash-*` re-declared triples disappears — (c) add `@ds` surface/slot/state/variant/edit labels
and register the surface in the catalog (`015`). The CDP light+dark baseline proves no visual
change.
---

## Decision 2 — Designer-editability model & inline-comment grammar

### The choice

**Token-first CSS + a refined inline-comment grammar.** Editing a surface = changing **values in
`style.css`** and **markup between labelled seams in `.tsx`**. The full grammar (refined from the
brief's working proposal — every keyword is kept, `variant:` is added, and each label carries
metadata so tooling and the catalog can act on it):

| Grammar token | Where | Means | A designer may edit |
|---|---|---|---|
| `@ds surface [name]` | `.css`, `.tsx` | Open a component group (the same name in both files links them). | The name; the block. |
| `@ds end surface [name]` | `.css`, `.tsx` | Close the block. | — |
| `@ds slot [part]` `· order/N · mayReorder` | `.css`, `.tsx` | A named presentational part. The `.tsx` seam marks the markup boundary; the `.css` block styles it. | Property **values** in `.css`; add/remove/reorder **markup** in `.tsx` when `mayReorder`. |
| `@ds state [key]` | `.css` | Conditional presentation for one state (hover, focus, pressed, selected, disabled, done, submitting…), written as **attribute selectors**. | Per-state **presentational values** only; never block the attribute hook or a guardrail. |
| `@ds variant [key]` | `.css` | A fixed visual typing (size, single/multiple, glyph kind). | Presentational values; the variant set is frozen post-existence. |
| `@ds edit [label]` `· retint · spacing · radius` | `.css` | A highest-level "edit here" seam: a single tunable token assignment (often a component-role → semantic-token row). | The **value** on that one row — the first-class retint/pitch/tune seam. |
| `@ds guardrail [reason]` | `.css`, `.tsx` | A lock: presentational invariants (focus ring, `>=44px`, `sr-only` live regions, read-only/redacted affordances, disabled-and-failed-closed visuals, `forced-colors`, `prefers-contrast`, `reduced-motion`) and logic/security in `.tsx`. | **Nothing.** Tooling + review refuse to open a guardrail block. |
| `@ds theme [fonts\|radius\|ease]` | `@theme` | The shared design-scale block. | Font stacks, radius magnitudes, easing (fonts are single-typed: Inter/SS4). |
| `@ds catalog [property]` | `.css` | Catalog metadata on a surface/slot/state/variant (e.g. `a11yPair=ink/surface`, `contrastTarget=AA`). | Metadata only. |

The grammar is deliberately **small** (markers begin `@ds`, free text follows) so it is readable,
greppable (a catalog generator scans `@ds surface / slot / state / variant` and the `.tsx` seams),
and safe: **no marker can change behaviour**, because every marker sits inside a CSS or JSX
comment, and the guardrail is enforced by tooling + review, not by the grammar itself.

### The exact "edit here" seams a low-code designer touches

1. **Retint a component** — one `@ds edit` token row (`--slash-raised: var(--surface-raised);` →
   `var(--surface);`), or a semantic retint at `:root` (one semantic token).
2. **Restyle one part** — the matching `@ds slot:` block in `style.css`.
3. **Per-state presentation** — the `@ds state:` blocks (`hover`, `pressed`, `done`, `disabled`).
4. **Markup structure** — add/remove/reorder a `@ds slot:` in `.tsx` (only when its `mayReorder`
   flag allows; required slots marked `hasContent=required` cannot be removed).
5. **Overlays** — `@ds surface` overlay blocks (model-sheet, slash-panel) as normal slots.

### What a designer never reaches

- **Logic:** function bodies, hooks, `onClick`/`onPress`/submit handlers, reducers, re-layout and
  anchor logic — always inside `@ds guardrail logic` in `.tsx`.
- **Behaviour/state wiring:** every react-aria prop and every `data-*` attribute a state model
  writes (§1) — presentation reads them, but a designer neither writes nor removes them.
- **The security boundary:** redaction rules, read-only enforcement, one-use ticketed mutation +
  revision checks, CSP (`index.html`), auth/relay (`relay.ts`/`auth.ts`) — outside the styling
  seams, fenced or seam-less. The only security surface a designer can *reach* is the **visual
  affordance** of read-only/redacted/disabled states (`.redacted-*`, `.todo-read-only-label`,
  `[data-control-presentation='readonly']`, `:disabled`), and those blocks are guardrailed so
  their meaning cannot be stripped.
- **A11y invariants:** the global focus-visible ring (`button:focus-visible, [data-focus-visible]`
  → `outline: 3px solid var(--focus)`; style.css:204-209), `>=44px` targets, `sr-only` live
  regions/announcers, `forced-colors`/`prefers-contrast` (style.css:6556-6621), and
  `prefers-reduced-motion` (14 blocks) — all guardrail-protected.

### Why this over the alternatives

- **Against "no grammar, just good tokens":** tokens alone give a designer a palette to change but
  no safe *markup/layout/states* affordance and no machine-checkable inventory. The grammar is the
  difference between "retint a surface" and "safely reorder a card" — the brief's target bar is the
  latter.
- **Against a low-code visual editor overlay:** heavier than the read-only posture wants and out of
  scope; the codec is the seam. The reference systems are seam-first too — shadcn/ui's "override
  those tokens … without rewriting component classes" ([C1][c1]) and Untitled UI React's
  Figma-variable→code token handoff ([C4][c4]) are *token seams*, not editors.
- **Against a Radix-`Theme`-style runtime config:** that centralizes theming in a component prop
  API ([C2][c2]), hiding the seam inside code and conflicting with one stylesheet. The app's
  `data-theme` attribute + `@theme` block stays the seam.

### Phase-2 implication

`003-primitives-react-aria` applies the grammar to the shared controls first so `004`–`014` have a
living template; each surface grandchild then annotates its `.tsx` and its `style.css` block.
`015-catalog-docs-preview` proves the grammar by enumerating every surface × slot × state × variant
row and validating each `a11yPair` (`@ds catalog`). The Phase-3 Designer Guide documents exactly
these seams as editable.
---

## Decision 3 — Token-library architecture

### The choice: three layers, all inside `style.css`, primitive ← semantic ← component

**Layer 1 — primitive** (the frozen ink-on-parchment source tokens, as `--pi-*`). The frozen source
values (spec.md §Out of Scope) — bone, raised, carbon, muted, clay, AA text accent, AA UI accent,
soft selection (light); page, raised, text, muted, clay, accent-text, soft (dark) — become named
raw tokens in a new **primitive block** (light on `:root`, dark under `:root[data-theme='dark']`
and the system block). **The hex values attend identically** — this formalizes, does not change,
the palette; the Phase-2 CDP baseline proves it.

```css
/* @ds theme [primitives] — the frozen ink-on-parchment source. Never changes a value. */
:root {
  --pi-bone:      #f8f8f6;   /* light canvas          */
  --pi-raised:    #ffffff;   /* light surface-raised  */
  --pi-carbon:    #24221f;   /* ink / dark page       */
  --pi-muted:     #6c6a65;   /* light muted text      */
  --pi-clay:      #d97757;   /* accent                */
  --pi-accent-txt:#8a452f;   /* AA text accent        */
  --pi-accent-ui: #b85f42;   /* AA UI accent          */
  --pi-selection: #f3e4de;   /* soft selection        */
  /* … a dark block remaps these same names to the dark values … */
}
```

**Layer 2 — semantic / role** (the themed roles the app already declares on `:root`, now
*referencing primitives*). Every existing role token (`--canvas`, `--surface-raised`, `--ink`,
`--ink-muted`, `--line`, `--line-strong`, `--control-border`, `--accent`, `--accent-strong`,
`--accent-soft`, `--accent-ink`, `--action-bg/fg`, `--success/-soft`, `--warning`, `--danger`,
`--focus`, `--shadow-raised`, `--space-*`, `--radius-*`, `--duration-*`, `--ease-out`,
`--page-gutter`, `--content-width`, `--reading-width`) is re-expressed as `var(--pi-…)` instead of
a raw hex. This is the **one change** between today's `:root` and Layer 2, and it is the layer
that themes remap.

**Layer 3 — component** (per-surface roles, thin aliases to semantic). The duplicated per-surface
triples (`--model-sheet-raised/ink/muted/accent/ui-accent/selection` at style.css:4076-4116 and
`--slash-*` at 6343-6382, each declared three times for light, dark, and system) flatten to one
block per component that resolves to semantic tokens, so the value AND the theme remap inherit.

```css
/* @ds surface [slash-panel] … */
.slash-panel {
  /* @ds edit [palette]: retint this overlay without touching global roles. */
  --slash-raised:    var(--surface-raised);
  --slash-ink:       var(--ink);
  --slash-muted:     var(--ink-muted);
  --slash-accent:    var(--accent-ink);
  --slash-ui-accent: var(--accent-strong);
  --slash-selection: var(--accent-soft);
  /* …presentation declarations reference the component roles… */
}
```

No `:root[data-theme='dark'] .slash-panel` / `@media … system .slash-panel` re-declarations remain:
the semantic layer already holds the theme, and the component role delegates to it. A designer who
wants the **whole app** to retint edits Layer 2; a designer who wants **one surface** uses the
`@ds edit` row on Layer 3. Component roles exist only where a surface needs a bespoke meaning;
otherwise rules consume semantic tokens directly — **use a component token only when you would
otherwise repeat a semantic token three times or need a surface-specific meaning**.

### Light/dark theming mechanism (kept)

The tri-state stands exactly as shipped: light = `:root` defaults; dark =
`:root[data-theme='dark']`; system = `:root[data-theme='system']` under
`@media (prefers-color-scheme: dark)` (style.css:29-153). `color-scheme: light dark` / `dark`
toggles native controls. The **only** structural change is that each theme block re-maps
**semantic** tokens from their dark primitives — the component layer never repeats a theme block.
This is "appearance as a first-class concept" ([C2][c2]) without a runtime `Theme`: `data-theme`
on `<html>` already drives it.

### WCAG AA guaranteed at the token layer (not per-rule)

Contrast is enforced **where a designer can break it**: the semantic role pairings, checked once,
not per CSS rule.

1. **An `on-` ink/surface pairing invariant.** Modelled on the shared color-role model (Material 3
   defines roles such that the `on-` role is the ink guaranteed to sit on its named surface with
   accessible contrast; [C3][c3]). Every foreground role the app uses has a recorded `a11yPair`
   with the background it appears on: `ink/surface`, `ink-muted/surface`,
   `accent-ink/accent-soft`, `action-fg/action-bg`, `ink-inverse/surface-code`, etc. These pairs
   mirror the pairs the frozen palette already chose (that is why it passes today).
2. **A machine-checkable contrast manifest.** Phase-2 grandchild `002` emits a static manifest
   `{ backgroundToken, foregroundToken, ratio }` covering every `@ds catalog a11yPair` in the token
   layer, resolved once per theme. **AA text = ≥ 4.5:1; UI/non-text and focus/control edges =
   ≥ 3:1.** Because components consume only semantic tokens (Layer 3→Layer 2→Layer 1), *any*
   designer change that drops a pair below its threshold fails the manifest gate — a single check
   instead of per-rule audits. (M3's own tooling is a `contrast` + `dynamiccolor` module over HCT;
   [C3][c3].)
3. **Disabled/muted exemptions are explicit.** `--ink-disabled` / `--ink-muted` record a
   `nonEssential=true` flag (AA's text-exempt class) so the checker doesn't false-fail, but the
   app's rule keeps them for non-essential copy only.
4. **Escape hatches stay guardrailed.** `prefers-contrast: more` and `forced-colors` blocks
   (style.css:6572-6621) are `@ds guardrail` — they restore hierarchy/system colors independent of
   tokens and must not be removed by a retint.

### How the catalog enumerates every component / variant / state from the grammar

`015-catalog-docs-preview` scans the single stylesheet for the grammar and the `.tsx` seams, and
renders a live preview per row:

- **Surface** ← `@ds surface:` blocks link a `style.css` block to the `.tsx` by name.
- **Variant** ← `@ds variant:` rows (typed visual states).
- **State** ← `@ds state:` rows (each an attribute selector; the `.tsx` renders each state).
- **Slot** ← `@ds slot:` rows (each a part; `hasContent`, `mayReorder`, `order` metadata).
- **Contrast** ← `@ds catalog a11yPair` rows, which feed the manifest (§3.3).

The catalog is therefore *derived* — a component that lacks an `@ds` label for a real part is an
annotation gap the migration checklist catches, never a hand-maintained duplicate.

### Why this over the alternatives

- **Against raw-value tokens only (today):** the primitive layer turns "the palette is frozen"
  (claimed in prose) into "the palette is the single source of truth" (asserted by construction),
  and kills the three-way duplication bug `--model-sheet-*` / `--slash-*` exhibit today.
- **Against "no semantic layer; components use primitives directly":** rejected — theming would
  live in every rule and contrast would not be provable at one point. shadcn/ui's model is
  semantic pairs (`surface/foreground`, `primary/primary-foreground`; [C1][c1]) because the theme
  must remap behind a stable name.
- **Against token files / a build-time JSON token pipeline:** the app has **no token build step**
  and must keep that for single-stylesheet simplicity and the read-only posture (fewer code
  paths). Primitives-as-CSS-custom-properties deliver the same layering inside the existing
  stylesheet. (The manifest is a *static generated check*, not a runtime dependency.)

---

## Security & contrast implications

- **No security boundary is weakened:** every mutation seam is presentational; the security rules
  (read-only default, one-use ticketed + revision-checked mutations failing closed, redaction,
  host/extension plan mode, CSP) live in `relay.ts`/`auth.ts`/`state.ts` and `index.html` with no
  styling seam and no change. A designer's edits cannot reach them.
- **No source value changes:** introducing `--pi-*` primitives carrying the identical frozen hex,
  and re-pointing the semantic layer at them, is value-preserving and strip-free. The Phase-2 CDP
  baseline (light + dark, 390px) is the objective proof.
- **Contrast becomes a build gate, not a hope:** the on- pairing invariant + manifest (§3.3) turns
  "WCAG AA" into a checkable token-layer property that survives designer edits.
- **Flag for `002-theming-light-dark`:** the `--ink-disabled` / `--ink-muted` / `--placeholder`
  pooling (three roles sharing one value; style.css:46-48) is a candidate to *split* — but is
  **not** a value change and is deferred to that grandchild so it can keep the 390px baseline.
---

## Citations

Each citation notes exactly what was confirmed by fetching the source, and what is corroborated by
this repo's code.

- **[C1] shadcn/ui — Theming.** "We use and recommend CSS variables for theming… Override those
  tokens in your CSS to change the look of your app without rewriting component classes." Semantic
  token pairs (`background`/`foreground`, `card`/`card-foreground`, `primary`/`primary-foreground`)
  under `:root` and `.dark`; dark by overriding the same tokens. Confirmed by fetch of
  <https://ui.shadcn.com/docs/theming>. Supports Decision 1 single stylesheet + Decision 3
  semantic-pair + Decision 2 token-seam model.
- **[C2] Radix Themes — Getting started / Dark mode.** Pre-styled library; `Theme` component with
  `appearance="dark"`, `accentColor`/`grayColor`/`radius`/`scaling` config; dark mode via
  `light`/`dark` (and `*-theme`) classes; `ThemePanel` live preview. Confirmed by fetch of
  <https://www.radix-ui.com/themes/docs> and <https://www.radix-ui.com/themes/docs/theme/dark-mode>.
  Rejected as a library; borrowed for "theme-first + live preview" (§1, §2, catalog).
- **[C3] Material — design tokens & color.** `material-color-utilities` exposes `hct` (CAM16×L\*
  color space), `contrast` (measure / obtain contrastful colors), `scheme`
  (`SchemeLight`/`SchemeDark`), `dynamiccolor` (adjusts for dark theme, style, contrast
  requirements), `TonalPalette`. Confirmed by fetch of
  <https://raw.githubusercontent.com/material-foundation/material-color-utilities/main/README.md>.
  The named **color-role** model (`primary`, `on-primary`, `primary-container`, `surface`,
  `on-surface`, `surface-variant`, `outline`; the `on-` ink convention) and **core → reference →
  system token tiers** are the documented M3 token model at
  <https://m3.material.io/foundations/design-tokens/overview> and <https://m3.material.io/styles/color>
  — both client-rendered (fetched as "requires JavaScript"), so the role/tier list is carried from
  the authored M3 model and corroborated by the fetched color-utilities README; mark as
  **knowledge-backed, source JS-rendered**. Supports Decision 3 `on-` pairing and token contrast.
- **[C4] Untitled UI React.** "The world's largest collection of React components. Tailwind CSS +
  React Aria"; dedicated Figma VARIABLES + STYLES preview for design/code consistency; productized
  designer-developer handoff. Confirmed by fetch of <https://www.untitledui.com/react>. Supports
  the whole thesis: a designer-editable coded system on exactly this stack (Tailwind 4 +
  react-aria), with **token/theme seams** bridging design and code.
- **[C5] Shopify Polaris.** Shopify's "unified UI framework built on web components"; color,
  spacing, typography live under a `Tokens` section. Confirmed by fetch of
  <https://polaris.shopify.com/tokens> and <https://polaris.shopify.com/tokens/color>. The
  **role-segmented token naming** (text/icon/border/surface/background/action) and the
  **base → alias → component tiers** are Polaris's documented token model; the live token pages
  rendered as client-rendered nav shells, so that naming is carried as Polaris's token convention.
  Lends Decision 3's *role* (not raw) partition.
- **[Repo evidence]** `apps/pi-remote-web/src/style.css` (6,989 lines): frozen role tokens on
  `:root` (29-92) + `:root[data-theme='dark']` (94-130) + system block (132ff); `@theme` (20-27);
  global focus ring (204-209); `--model-sheet-*` triple (4076-4116) and `--slash-*` triple
  (6343-6382); guardrail a11y blocks (6556-6621); 14 `prefers-reduced-motion` blocks. Components:
  react-aria import/use (`SessionComposer.tsx`, `TodoPanel.tsx`, `ArtifactCard.tsx`),
  attribute-driven states and class-suffix variants (`features/ask-question/AskQuestionOptionRow.tsx`,
  `AskQuestionCard.tsx`), read-only/redacted affordance classes + CSP (`index.html`).

---

## Phase-2 migration contract (the 15 grandchildren follow, in order)

1. **Do not re-decide.** Consume this file. Re-deciding = amendment, gated, evidence-first.
2. **Baseline first, always.** Each surface grandchild records its pre-migration CDP captures
   (light + dark, 390px) before editing, then proves pixel-identical after. Frozen values unchanged.
3. **`001-tokens-foundation`** adds the `--pi-*` primitive block and re-points the semantic layer
   at it (value-identical), without touching rules yet.
4. **`002-theming-light-dark`** hardens the tri-state as a semantic-layer-only remap and ships the
   on- pairing invariant + contrast manifest gate.
5. **`003-primitives-react-aria`** is the living template: apply `@ds surface/slot/state/variant/
   edit/guardrail` to shared controls so every later surface mirrors it.
6. **Every surface (`004`–`014`)** migrates its `style.css` rules to semantic/component tokens,
   converts any class-as-state to attribute selectors, removes literal values, flattens duplicated
   component-token triples to semantic-backed aliases, and labels its `.tsx` + `style.css` with the
   grammar. `010` absorbs the parallel rich-content branch; `012` owns the shared
   overlay/sheet/modal primitive and its choreography.
7. **`014-states-interaction-motion`** unifies the shared status vocabulary, motion tokens, focus,
   and reduced-motion under guardrails.
8. **`015-catalog-docs-preview`** derives the catalog from the grammar, validates every
   `@ds catalog a11yPair` against the manifest, and is the proof that no surface shipped without
   its labels.
9. **Security posture is never weakened.** No edit reaches logic, react-aria wiring, redaction, or
   the CSP. A grandchild that would touch a security file must stop and escalate with evidence.
10. **Every grandchild** passes the authoritative gate: `npm run typecheck`, `npm test`,
    `npm run test:web`, `npm run build`, and the light+dark 390px CDP captures with zero horizontal
    overflow.

---

[cat]: #how-the-catalog-enumerates-every-component--variant--state
[c1]: #c1-shadcnui--theming
[c2]: #c2-radix-themes--getting-started--dark-mode
[c3]: #c3-material--design-tokens--color
[c4]: #c4-untitled-ui-react
[c5]: #c5-shopify-polaris
