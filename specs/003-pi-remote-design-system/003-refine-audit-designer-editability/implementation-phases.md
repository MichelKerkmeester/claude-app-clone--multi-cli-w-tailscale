# Phase 3 — Audit-and-refine flow

Phase 3 is delivered as one work-leaf, [`001-editability-audit-and-guide`](001-editability-audit-and-guide/),
which audits the whole migrated surface for real designer-editability, refines the gaps it finds,
verifies a11y/contrast, and ships the designer guide plus editability evidence.

## Leaf — `001-editability-audit-and-guide`

### Objective

Prove that a designer with low-level code knowledge can actually and safely adjust styling,
markup, layout, and per-state presentation across every Phase-2 surface, and refine the ergonomics
where they cannot.

### Scope

An editability audit against representative designer edit tasks (retint a role token, retint one
component, change a card's radius, relabel a `@ds state:` block, reorder a `@ds slot:`, change a
`@ds edit: layout` block); a guardrail audit proving no in-seam edit reaches logic or the security
boundary; a refinement pass for the gaps found; a repeat a11y/contrast pass; and the designer guide.
No source value or security boundary changes.

### Verification gate

```text
npm run typecheck
npm test
npm run test:web
npm run build
node scripts/design-system-cdp.mjs --surface <refined-surface> --viewport-width 390 --theme light --output <temporary-directory>/audit-<surface>-light.png
node scripts/design-system-cdp.mjs --surface <refined-surface> --viewport-width 390 --theme dark --output <temporary-directory>/audit-<surface>-dark.png
```

The gate passes only when all suites and the build pass; every representative designer edit task is
recorded with a before/after and a pass; the guardrail audit shows no in-seam edit reaches logic or
the security boundary; the contrast checks pass in both themes; the designer guide exists; and every
refined surface is visually identical to its Phase-2 baseline at true 390 CSS pixels.
