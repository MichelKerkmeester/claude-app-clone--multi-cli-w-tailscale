# Research provenance — Architecture, Conventions & Token Library

This `research/` folder holds the deep-research artifacts for the
`001-architecture-conventions-tokens` phase, laid out to match the system deep-loop
`/deep:research` conventions (`research.md` + `iterations/iteration-NNN.md` +
`deep-research-config.json`).

## Status: DECIDED — synthesized by the design-systems research agent

The scaffolded placeholder in `research.md` has been **written** as the canonical build-ready
decision, and six single-lens iteration passes were authored under `iterations/`. This run did
**not** use the `/deep:research` state-machine runtime or a 20-pass external-CLI fan-out; it is an
agent-invoked synthesis pass. `deep-research-config.json` therefore still records the scaffolding
manifest (`iterationsPlanned: 20`, `iterationsComplete: 0`, `executors: []`); its "operator runs 20
models later" contract described the scaffold state this run supersedes.

## What this folder now contains

- `BRIEF.md` — the research brief and questions (unchanged).
- `research.md` — **the synthesized, build-ready decision** (replaces the placeholder).
- `iterations/iteration-001..006.md` — six single-lens, cited passes:
  001 Untitled UI React + Figma→code token seams; 002 shadcn/ui CSS-variable semantics;
  003 Radix Themes appearance/scale (borrow-vs-reject); 004 Material 3 tiers + on- roles + contrast;
  005 Polaris role-segmented naming + tiers; 006 ground-truth read of the app's own code.
  (`iteration-000-template.md` remains as the authoring template.)
- `deep-research-config.json` — unchanged (see note above).

## Method (honest record)

- **Sources fetched live** (see Citations in `research.md`): `ui.shadcn.com/docs/theming`;
  `radix-ui.com/themes/docs` + `/docs/theme/dark-mode`; the raw README of
  `material-foundation/material-color-utilities`; `untitledui.com/react`;
  `polaris.shopify.com/tokens` (+ `/tokens/color`). The M3 `m3.material.io` design-token and
  color-role pages and the Polaris token pages are **client-rendered** (fetched as nav-only or
  "requires JavaScript"); where the decision carries their authored content (M3 core→reference→
  system tiers, on- color roles; Polaris base→alias→component tiers), those citations are marked
  **knowledge-backed, source JS-rendered** and corroborated by the fetched color-utilities README.
- **Repo reads** (ground truth): `apps/pi-remote-web/src/style.css` (6,989 lines), `index.html`,
  and representative components (`SessionComposer.tsx`, `TodoPanel.tsx`, `ArtifactCard.tsx`,
  `features/ask-question/*`, `CommandOption.tsx`). Line numbers cited in the decision were read at
  the time of writing.
- **No app code, token value, or file outside `research/` was modified during this run.**

## Why some canonical deep-loop artifacts are absent

The `/deep:research` runtime-state byproducts — `deep-research-state.jsonl`,
`findings-registry.json`, `deep-research-dashboard.md`, `observability-events.jsonl`,
`orchestration-summary.json`, `deltas/`, `dispatch-receipts/`, `lineages/` — are **not** created
for this agent-invoked run and are **not** fabricated here (fabricating telemetry would be
dishonest). The verifiable record is this file, `BRIEF.md`, `deep-research-config.json`,
`research.md`, and the six iterations.

## Relationship to the `001-research/` phase

`001-research/` remains a lean spec-kit phase (`spec.md` + `description.json` +
`graph-metadata.json`) that documents the research phase in the packet's phase graph. The
research **content** lives here, in `research/`.
