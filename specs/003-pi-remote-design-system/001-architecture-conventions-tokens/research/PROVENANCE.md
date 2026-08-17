# Research provenance — Architecture, Conventions & Token Library

This `research/` folder holds the deep-research artifacts for the
`001-architecture-conventions-tokens` phase, laid out to match the system deep-loop
`/deep:research` conventions (`research.md` + `iterations/iteration-NNN.md` +
`deep-research-config.json`).

## Status: scaffolded, not run

The 20 research iterations are **not yet run** and the executor **models are TBD**
(operator-defined). This packet creates the structure only:

- `BRIEF.md` — the research brief and questions.
- `research.md` — the canonical synthesized decision, currently a labelled **placeholder**.
- `deep-research-config.json` — the run manifest (20 planned, executors empty, `modelsTBD: true`,
  `status: "pending"`).
- `iterations/` — a scaffold expecting ~20 cited passes; `iteration-000-template.md` is the
  per-pass template.

## How this research will be run (operator decision)

The operator chooses, later, either the `/deep:research` state-machine runtime or external-CLI
orchestration (as the sibling `002` packet used), and fills the executor roster in
`deep-research-config.json`. No early convergence: every planned pass runs before synthesis.

## Why some canonical artifacts are absent

If the run uses external-CLI orchestration rather than the `/deep:research` runtime, the
runtime-state files that runtime emits as a byproduct are **not** created and are **not
fabricated** here (fabricating telemetry would be dishonest):

- `deep-research-state.jsonl`, `findings-registry.json`, `deep-research-dashboard.md`
- `observability-events.jsonl`, `orchestration-summary.json`
- `deltas/`, `dispatch-receipts/`, `lineages/`

The honest, verifiable record until the run is: this file, `BRIEF.md`, `deep-research-config.json`,
the `research.md` placeholder, and the `iterations/` scaffold.

## Relationship to the `001-research/` phase

`001-research/` remains a lean spec-kit phase (`spec.md` + `description.json` +
`graph-metadata.json`) that documents the research phase in the packet's phase graph. The
research **content** lives here, in `research/`.
