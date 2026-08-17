# Spec 003 — Pi Remote Designer-Editable Coded Design System

> Bring every page and component of the Mobile CLI app onto a well-built coded design
> system — in the spirit of the Untitled UI React library and its peers, taken one step
> further: authored so a **designer with low-level code knowledge** can safely adjust
> styling, markup, layout, and per-state presentation through token seams and a documented
> inline-comment grammar, without touching logic or weakening the frozen security posture.

---

## What this packet is

A restyle-and-systematize packet, not a feature packet. The sibling packet
`../002-pi-remote-mobile-ui-ux-features/` brought the mobile chat to Claude/Kimi-app
quality as ten feature phases. This packet takes the shipped surface and rebuilds it as
a **coherent, documented, token-driven, designer-editable design system**: a dedicated
token library, a component API (variants, states, slots), theming, accessibility and
contrast guarantees, a live preview/catalog, and migration guidance.

Two contracts are **frozen** and travel in every phase:

- **Design-system source values (frozen):** ink-on-parchment. Light — bone `#f8f8f6`,
  raised `#ffffff`, carbon `#24221f`, muted `#6c6a65`, clay `#d97757`, AA text accent
  `#8a452f`, AA UI accent `#b85f42`, soft selection `#f3e4de`. Dark — page `#24221f`,
  raised `#2d2a26`, text `#f8f8f6`, muted `#9f998f`, clay `#d97757`, accent text
  `#f0b19a`, soft selection `#3a2720`. Inter + Source Serif 4; light + dark; WCAG AA.
  The token library **formalizes** these as the source; it does not change them.
- **Security posture (frozen):** read-only default; one-use ticketed + revision-checked
  mutations that fail closed; redaction everywhere; host/extension-enforced plan mode;
  content-free push; operator-only `--full-access` the phone can never enable. The
  design-system work is UI/architecture only and must not weaken this.

## The four phases

1. **`001-architecture-conventions-tokens`** — research-first. Define the component
   architecture and file conventions, the designer-editability model (token-first CSS, the
   inline-comment grammar, variant/slot conventions, "edit here" seams, guardrails), and the
   token-library architecture (primitive → semantic → component, theming, the frozen palette
   as source). Requires **20 research iterations (models TBD, not run in this packet)**;
   only the research scaffold is created here.
2. **`002-implement-migrate-component-library`** — implement the architecture and migrate
   **every** component group onto it as 15 grandchildren, foundation first, catalog/docs last.
3. **`003-refine-audit-designer-editability`** — audit that a low-code designer can actually
   and safely edit styling/markup/layout/states; refine ergonomics; verify a11y/contrast;
   produce editability evidence and a designer guide.
4. **`004-sk-code-mobile-cli-mode`** — plan (do not build) a dedicated `sk-code` mode for
   Mobile-CLI app work that auto-loads these conventions for future code work.

## Layout

```
003-pi-remote-design-system/                       ← phase parent (lean trio + orientation)
  spec.md  implementation-phases.md  build-strategy.md  README.md
  description.json  graph-metadata.json
  001-architecture-conventions-tokens/             ← research-first phase parent
    spec.md  implementation-phases.md  description.json  graph-metadata.json
    001-research/                                   ← lean spec-kit phase → ../research/
    research/                                       ← BRIEF + research.md placeholder + iterations/ scaffold
  002-implement-migrate-component-library/          ← phase parent
    spec.md  implementation-phases.md  description.json  graph-metadata.json
    001-tokens-foundation/ … 015-catalog-docs-preview/   ← 15 migration leaves (spec/plan/tasks/checklist each)
  003-refine-audit-designer-editability/            ← leaf (spec/plan/tasks/checklist)
  004-sk-code-mobile-cli-mode/                      ← leaf, plan-only (spec/plan/tasks/checklist)
```

## The app being systematized

`apps/pi-remote-web/src/` — React 19 + Vite + Tailwind 4 + react-aria-components. One
global `src/style.css` (~5,100 lines) already holds the frozen palette as CSS custom
properties on `:root`, `:root[data-theme='dark']`, and `@media (prefers-color-scheme: dark)
:root[data-theme='system']`, plus component-scoped token sets (`--model-sheet-*`,
`--slash-*`). Tailwind 4 is wired through the Vite plugin and an in-CSS `@theme` block with
**no `tailwind.config.*`**; class names are semantic (BEM-ish), and react-aria supplies
behavior and state attributes. ~55–60 components: ~22 defined inline in `App.tsx`, the
composer/slash/model-effort/plan-mode surfaces as top-level modules, and the `artifacts/`
viewer family (`ArtifactViewerHost`, `ArtifactCard`, and Text/Code/Diff/Markdown/Image/Pdf
previews). There is no component catalog today — Phase 2 stands one up.

## Verification (every migration leaf)

`npm run typecheck` · `npm test` · `npm run test:web` · `npm run build`, plus a true-390px
light + dark CDP capture of the migrated surface. Web-scoped fast checks:
`npm run typecheck -w @pi-remote/web` and `npm run test:web`. See
[`build-strategy.md`](build-strategy.md) for the per-phase gate discipline.
