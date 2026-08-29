<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Plan — Plan/todo & ask-question surfaces

## Approach

Migrate what exists, scaffold what is pending. Bring the `plan`-kind block's todo checklist onto
semantic + component tokens and the `@ds` grammar with done/pending state seams, value-preserving.
Then write a documented `@ds surface:` seam contract for the future ask-question and todos surfaces
so they slot in already designer-editable when the sibling `002` features land — without adding any
visible surface or any mutation here. Prove the existing checklist is unchanged.

## Steps

1. Read the `plan`-kind branch of `Block` in `App.tsx` and its `style.css` rules; record the current
   resolved look of a done (✓) and a pending (○) item in light and dark.
2. Migrate the checklist rules onto semantic + component tokens; add the `@ds surface: plan-todo`
   label and `@ds state:` blocks for the done and pending items; keep the ✓/○ presentation identical.
3. Confirm plan-item computation, delivery, and plan-mode gating are untouched (a `@ds guardrail`
   marks that logic as off-limits to a designer edit).
4. Write the `@ds surface:` seam contract for the future ask-question prompt UI (a terminal-style
   prompt with option/free-text states) and the future todos list (task rows with status), each
   marked pending and gated on the sibling `002` features `009-ask-question` and `010-todos`.
5. Register the migrated plan/todo checklist in the catalog and list the two future surfaces as
   declared-but-pending entries.
6. Capture true-390px light/dark evidence of the plan/todo block and diff against the pre-migration
   baseline.

## Files to change

- `apps/pi-remote-web/src/App.tsx` (the `plan`-kind block's classes only; no computation change)
- `apps/pi-remote-web/src/style.css` (migrate the plan/todo checklist rules onto tokens; add the
  `@ds` seams and the pending-surface seam contract as comments)
- the catalog surface (register the checklist; list the pending surfaces) — from grandchild 15
- `scripts/design-system-cdp.mjs` (plan/todo capture support, if needed)

## Verification gate

Run from the repository root:

```text
npm run typecheck
npm test
npm run test:web
npm run build
node scripts/design-system-cdp.mjs --surface plan-todo --viewport-width 390 --theme light --output <temporary-directory>/plan-todo-light.png
node scripts/design-system-cdp.mjs --surface plan-todo --viewport-width 390 --theme dark --output <temporary-directory>/plan-todo-dark.png
```

The gate passes only when all suites and the build pass, the plan/todo checklist renders identically
to before in both themes, the CDP runner reports exactly 390 CSS pixels with zero page horizontal
overflow, the ask-question and todos seams are documented-but-pending with no visible surface and no
mutation added, and no frozen source value or plan-mode gate is changed.
