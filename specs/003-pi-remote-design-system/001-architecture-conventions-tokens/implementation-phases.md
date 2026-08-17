# Phase 1 — Research and synthesis flow

Phase 1 is delivered as one research-first flow: 20 independent, cited research iterations, then
a single synthesized build-ready decision. This packet **scaffolds** that flow; it does not run
it. The research **models are TBD** (operator-defined) and the **20 iterations are not run** here.

The synthesized decision (`research/research.md`) is the prerequisite for every Phase 2
grandchild. No component migration starts until it exists.

## Stage 1 — Research (20 iterations, models TBD, not run here)

### Objective

Investigate, under rotating lenses across 20 independent passes, the three decisions Phase 2
depends on, and cite real reference systems rather than asserting a house opinion.

### The three decision areas each iteration probes

1. **Component architecture and conventions** — how a component is authored and laid out; how
   variants, states, and slots are declared; how the single-stylesheet + Tailwind-4 `@theme`
   authorship model is kept while adding structure.
2. **Designer-editability model** — token-first CSS; the inline-comment grammar (working
   proposal `@ds surface:` / `@ds edit:` / `@ds slot:` / `@ds state:` / `@ds guardrail:`);
   variant/slot conventions; "edit here" seams; and guardrails keeping logic and the security
   boundary out of a designer's edit path.
3. **Token-library architecture** — primitive → semantic → component layering; the frozen
   ink-on-parchment palette as the primitive source; the light/dark theming mechanism
   (`:root`, `:root[data-theme='dark']`, `@media (prefers-color-scheme: dark)
   :root[data-theme='system']`); and WCAG AA contrast guaranteed by the semantic→primitive map.

### Reference direction to investigate (not decisions)

The Untitled UI React library as the primary reference for a designer-oriented coded system,
plus shadcn/ui (copy-in, token-driven), Radix Themes (token scales + theming), Material 3
(design-token tiers), and Polaris (semantic token tiers). Each iteration cites what it draws
from and what it rejects for this app's constraints.

### Manifest and models

`research/deep-research-config.json` records 20 iterations planned, `status: "pending"`, and an
empty `executors` list with `modelsTBD: true`. The operator fills the executor roster and decides
whether the run goes through the `/deep:research` state machine or external-CLI orchestration
(matching the sibling `002` packet's provenance discipline).

## Stage 2 — Synthesis (after the iterations run)

### Objective

Collapse the 20 cited passes into one build-ready decision in `research/research.md`: the
component architecture, the designer-editability model with the finalized inline-comment grammar,
and the token-library architecture — each stated concretely enough that a Phase 2 grandchild can
migrate a surface without re-deciding.

### Acceptance

- `research/research.md` states a single decision per area with citations to the iterations.
- The decision stays within the frozen source values and the read-only security posture.
- Any security-crossing implication is flagged for the relevant Phase 2 grandchild to design
  security-first.

## Verification gate (this packet)

Scaffold-only, per [`../build-strategy.md`](../build-strategy.md) §6: the research structure
exists and links internally, `research/research.md` is a labelled placeholder marking the
decision pending, the manifest records models-TBD and 20 planned iterations, and the
`001-research/` lean phase validates. Running the iterations and writing the decision is later
operator work.
