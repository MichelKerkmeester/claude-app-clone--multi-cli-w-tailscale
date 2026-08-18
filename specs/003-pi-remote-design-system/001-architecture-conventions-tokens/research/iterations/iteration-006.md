# Iteration 006 — Lens: ground truth — the app's own code (state hooks, variants, guardrails)

**Pass goal:** confirm the conventions the decision formalizes already exist in the real surface,
so the migration is codification, not rewrite.

## What the real code shows

- **States are attribute-driven already.** react-aria emits `[data-pressed]`, `[data-focus-visible]`,
  `[aria-pressed]`, `[aria-selected]`, `[aria-disabled]`; components write their own `data-*`:
  `data-todo-task-state`, `data-todo-all-done`, `data-ask-question-phase`, `data-focused`,
  `data-disabled`, `data-exiting`, `data-control-presentation='readonly'`. CSS selects on these
  (`style.css:214`, `2198`, `3411`, `4104`, `6425`; `features/ask-question/AskQuestionCard.tsx`,
  `TodoPanel.tsx`). → Decision 1 "states = attribute selectors" is already true; the migration only
  removes residual class-as-state if any.
- **Variants = class suffixes.** `ask-question-option-indicator-single/-multiple`,
  `todo-state-glyph-pending/done`, `ask-question-card-loading/-<phase>`; `data-` carries the
  machine value. → Decision 1 "variants = class suffixes".
- **Slots = named part classes.** `slash-name-line`, `slash-desc`, `slash-meta`;
  `artifact-card-glyph/-body/-meta/-summary/-peek/-open`. → Decision 2 `@ds slot`.
- **Component token triples are the exact duplication to kill.** `--model-sheet-*` (4076-4116) and
  `--slash-*` (6343-6382) each declared light + `:root[data-theme='dark']` + system block.
  → Decision 3 Layer 3 flattens to semantic-backed aliases.
- **Guardrail markers already exist in spirit.** The global focus ring
  (`button:focus-visible, [data-focus-visible]` → `outline: 3px solid var(--focus)`, 204-209);
  `min-block-size: 44px` buttons (1726, throughout); `sr-only` live regions (216-226);
  `prefers-reduced-motion` (14 blocks); `prefers-contrast: more` and `forced-colors:` blocks
  (6572-6621 — the latter explicitly yield the **scoped** slash palette to `CanvasText`/`Highlight`).
  → Decision 2 `@ds guardrail` turns these from prose into fenced, preservable invariants.
- **Security affordances are presentational surfaces a designer could reach — hence guardrails.**
  Read-only labels (`todo-sync-note`, `ask-question-read-only-hint`, `artifact-card` "Read-only"),
  redaction (`redacted-attachment-*`, `rich-redaction-badge`), disabled-failed-closed controls
  (`[data-disabled]`, `:disabled`) — styled in CSS, enforced in `relay.ts`/`auth.ts`/`state.ts`.
  Fencing the *affordance* styles as guardrail is the boundary between styling and security.

## Implication

Codify, don't rebuild. Migration is annotation + token-delegation, verified pixel-identical by the
CDP baseline in both themes — consistent with the packet's Phase-2 gate.

## Confirmed by
- Repo reads: `src/style.css` (cited line numbers), `index.html` CSP, and
  `features/ask-question/*`, `TodoPanel.tsx`, `SessionComposer.tsx`, `ArtifactCard.tsx`,
  `CommandOption.tsx`.