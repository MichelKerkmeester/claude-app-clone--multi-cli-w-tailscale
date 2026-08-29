<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Plan — Refine & audit for designer-editability

## Approach

Audit before refining. Assemble a fixed set of representative designer edit tasks, run each one
through the seams alone (no logic files touched), and record whether a low-code designer could do
it safely. Where a task fails — a missing seam, a leaky guardrail, a mislabelled state — fix the
ergonomics and re-run the task. Repeat the contrast pass over the token layer. Write the designer
guide last, from the audited-and-refined system. Every refinement must leave every surface visually
identical to its Phase-2 baseline.

## Steps

1. Define the representative designer edit-task set: retint a role token; retint one component via
   its component tokens; change a card's radius; relabel a `@ds state:` block; reorder a `@ds slot:`;
   change a `@ds edit: layout` block. Bind each task to a real migrated surface.
2. Run each task through the seams alone and record before/after captures and a pass/fail on
   "could a low-code designer do this safely without touching logic?"
3. Run the guardrail audit: attempt, from within the seams, to reach state computation, the
   mutation/ticket path, redaction, and plan-mode enforcement; confirm each is fenced off.
4. Refine the gaps found: add or relabel seams, tighten leaky guardrails, clarify "edit here"
   comments, and correct mislabelled state blocks — without changing any resolved value.
5. Re-run the failed tasks and the guardrail audit until every representative task passes.
6. Repeat the a11y/contrast pass over the token layer in both themes.
7. Write the designer guide: the four edit classes, where the seams are, worked examples, and the
   guardrails a designer must not cross.
8. Capture true-390px before/after evidence for each refined surface to prove visual identity.

## Files to change

- `apps/pi-remote-web/src/style.css` (seam comments, state-block labels — no resolved-value change)
- `apps/pi-remote-web/src/` per-component seams (comment/label refinement only)
- `apps/pi-remote-web/src/design-system/designer-guide.md` (new)
- the editability evidence recorded under this phase's docs
- `scripts/design-system-cdp.mjs` (before/after capture support, if needed)

## Verification gate

Run from the repository root:

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
