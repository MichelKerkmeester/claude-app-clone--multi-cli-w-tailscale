# Architecture, conventions & token library — research brief

**Phase:** `001-architecture-conventions-tokens` (research-first)
**Tier:** foundational — the decision governs every Phase 2 migration.

**Goal:** Decide, with cited evidence, how to author `apps/pi-remote-web/` as one coded design
system that a designer with low-level code knowledge can safely edit — the component
architecture, the designer-editability model, and the token-library architecture.

**Current state:** One global `src/style.css` (~5,100 lines) holds the frozen ink-on-parchment
palette as CSS custom properties on `:root`, `:root[data-theme='dark']`, and
`@media (prefers-color-scheme: dark) :root[data-theme='system']`, plus component-scoped token
sets (`--model-sheet-*`, `--slash-*`). Tailwind 4 is wired via the Vite plugin and an in-CSS
`@theme` block with no `tailwind.config`. ~55 components use semantic class names; react-aria
owns behaviour and state. There is no component API, no formal token layering, and no catalog.

**Desired:** One build-ready decision covering three areas, each concrete enough to migrate a
surface without re-deciding:

1. **Component architecture & conventions** — authoring pattern, file layout, and how variants,
   states, and slots are declared, keeping the single-stylesheet + `@theme` model.
2. **Designer-editability model** — token-first CSS; the inline-comment grammar (working
   proposal `@ds surface:` / `@ds edit:` / `@ds slot:` / `@ds state:` / `@ds guardrail:`);
   variant/slot conventions; "edit here" seams; guardrails keeping logic and the security
   boundary out of a designer's edit path.
3. **Token-library architecture** — primitive → semantic → component layering; the frozen
   palette as the primitive source; the light/dark theming mechanism; WCAG AA contrast
   guaranteed by the semantic→primitive map.

**Questions each iteration must answer:**

- What does the Untitled UI React library (and shadcn/ui, Radix Themes, Material 3, Polaris) do
  that a designer-editable system needs, and what does it do that this app's constraints reject?
- Where exactly are the "edit here" seams, and how is logic/security fenced from them?
- How is contrast guaranteed at the token layer rather than per-rule?
- How does the catalog enumerate every component, variant, and state from the grammar?

**Target bar:** the Untitled UI React library and comparable designer-editable coded systems,
one step further — safe low-code editing of styling, markup, layout, and per-state presentation.

**Budget:** 20 iterations, no early convergence. **Models: TBD (operator-defined).**
**Sources:** the reference systems above (via web), plus this app's real code and `style.css`.

Each `research/iterations/iteration-NNN.md` is one independent, cited pass under a rotating lens.
`research/research.md` (written after) is the build-ready decision.
