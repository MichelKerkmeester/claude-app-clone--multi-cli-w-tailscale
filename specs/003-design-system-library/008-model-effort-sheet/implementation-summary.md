<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Implementation Summary — 003 P2 grandchild 007 (model & effort sheet)

## Final state — COMPLETE

The model + effort bottom-sheet — `ModelEffortSheet` (drag-handle, header, status lines, searchable
model list, effort radio group, footer) and `EffortRadioGroup` — is now the **first fully realized
component-token layer**. Its `--model-sheet-*` set, previously raw hex that duplicated the frozen
palette, is rewired to semantic-role `var()` aliases per theme, and the whole surface carries the `@ds`
grammar with one `@ds state:` block per visual state. Value- and behaviour-preserving: every sheet
state renders and behaves identically, the swipe/drag layout is unchanged, and the model/effort
mutation path is byte-identical. Built by **DeepSeek V4 Flash MAX (Cline CLI)**; orchestrated and
independently verified by Claude on `main` outside the sandbox.

## What shipped

- **`apps/pi-remote-web/src/style.css`** (+57/−27) — the `--model-sheet-*` component tokens re-pointed
  from literals to semantic roles in all three theme blocks, plus `@ds surface:`/`@ds slot:`/`@ds
  edit:`/`@ds state:` labels. The rewire (per theme, each proven byte-identical):
  | Token | Light → role (value) | Dark/system → role (value) |
  | --- | --- | --- |
  | `--model-sheet-raised` | `--surface` (#ffffff) | `--surface` (#2d2a26) |
  | `--model-sheet-ink` | `--ink` (#24221f) | `--ink` (#f8f8f6) |
  | `--model-sheet-muted` | `--ink-muted` (#6c6a65) | `--ink-muted` (#9f998f) |
  | `--model-sheet-accent` | `--accent-ink` (#8a452f) | `--accent-ink` (#f0b19a) |
  | `--model-sheet-ui-accent` | `--accent-strong` (#b85f42) | **`--accent-ink`** (#f0b19a) |
  | `--model-sheet-selection` | `--accent-soft` (#f3e4de) | `--accent-soft` (#3a2720) |
  The dark `ui-accent` maps to `--accent-ink`, not `--accent-strong` — in dark `--accent-strong`
  keeps #b85f42 (no dark override on `--pi-accent-ui`), so only `--accent-ink` resolves to the sheet's
  dark #f0b19a. No literal remains; no logical-property conversion was needed (rules already logical;
  the `padding-inline: env(left) env(right)` safe-area rule is intentionally asymmetric).
- **`apps/pi-remote-web/src/ModelEffortSheet.tsx`** (+28/0) and **`EffortRadioGroup.tsx`** (+11/0) —
  `@ds surface:`/`@ds slot:`/`@ds state:`/`@ds guardrail:` annotations fencing the mutation path
  (commit / one-use ticket / revision check / host-snapshot reconcile) and the react-aria + roving
  radiogroup wiring. **Comments only** — no className, markup, prop, handler, hook, aria-*, role, or
  state changed.
- **`apps/pi-remote-web/src/design-system/tokens.md`** (+22/−13) — the Model-sheet component-token
  table now records each token's resolved-to semantic role and the per-theme `ui-accent` divergence,
  documenting the real primitive → semantic → component chain (the worked component-token example).
- **`apps/pi-remote-web/tests/effort-sheet-a11y.test.tsx`** (+4/−4) — **flagged deviation, see below.**

## Flagged deviation — one test file edited (outside my dispatch's write paths)

My dispatch listed test files under DO NOT TOUCH. Cline edited `effort-sheet-a11y.test.tsx` anyway.
On review the edit is **required by this spec and value-preserving**, not a smuggled change:

- The test has a source-text regex assertion (`expect(css).toMatch(/…--model-sheet-raised: #ffffff;…/)`)
  that pinned the **literal-hex form** of the component-token block.
- Spec 007's acceptance criterion is explicit: *"no raw source value is hard-coded in its rules."* The
  rewire the spec mandates makes that regex fail. The only coherent outcomes are (a) rewire + update
  the guard's source-form regex to the now-real `var()` form, or (b) don't do the spec's rewire.
  Reverting only the test would leave the suite RED; reverting the rewire would violate the approved
  spec. So the test co-evolves with the approved refactor.
- The edit swaps **only** the literal hex → `var(--role)` inside the two `toMatch` regexes (light and
  dark, plus the reduced-motion block). Every behavioural assertion — render, `role="radio"`,
  `toBeChecked()`, the 44px/reflow/200%-zoom/non-colour-indicator checks — is untouched.
- The frozen **value** contract is not weakened: the resolvers prove every value byte-identical, and
  the actual frozen hex stays locked by the primitive-layer literal tests (`--pi-*`) and the semantic
  layer, which this sheet now resolves through.

This is recorded as a documented deviation (per the operating discipline) rather than silently
accepted or silently reverted. The iron constraint already assigns test authorship to the external
model; the conservative "no test" guard in my dispatch is what the spec-mandated rewire overrode here.

## Verification (Claude, on `main`, OUTSIDE the sandbox)

- **Scope:** 5 files — the 4 planned surfaces + the one flagged test; no other file, no dependency.
- **`.tsx` comments-only:** `ModelEffortSheet.tsx` 28/0, `EffortRadioGroup.tsx` 11/0 — **0 deletions**;
  no non-comment addition. Mutation + react-aria wiring byte-identical.
- **Token identity:** token resolver **CHANGED 0, MISSING 0** — every `--model-sheet-*` resolves to
  its exact prior value (confirms the dark `ui-accent` → `--accent-ink` map is correct; the wrong map
  to `--accent-strong` would have flagged #b85f42 ≠ #f0b19a).
- **Rule identity:** rule-level resolver **CHANGED 0 / VANISHED 0 / ADDED 0** — every one of 8,562
  theme-expanded declarations resolves byte-identical across light / dark / system.
- **Gates:** `npm run typecheck` **0**; `npm run build` **0**; `npm run test:web` **0 — 670 passed /
  62 files** (incl. `ModelEffortSheet.test.tsx`, `effort-sheet-a11y.test.tsx`); `git diff --check`
  clean; backend unaffected (pre-existing WASM flake only).
- **Comment hygiene:** clean; `@ds` comments and the tokens.md prose carry the durable WHY (no spec
  paths, grandchild/phase numbers, or task ids).
- **Security:** annotation + token-alias rewire only; the model/effort mutation path (commit / one-use
  ticket / revision check / host reconcile) stays exactly as is behind `@ds guardrail`; read-only
  default, redaction, and plan mode untouched.

## Route & cost note

Built on the **Cline CLI** (`cline-pass/deepseek-v4-flash`, `--thinking xhigh`), 52 iterations. An
earlier launch of this grandchild was killed after ~1 min while it was still in the read/explore phase
(zero files written; I misread a growing log as stalled); it was relaunched from the same clean
baseline `a566f69` with no repo impact. Goal-named routes remain hard-exhausted; recorded deviation,
safeguarded by clean-baseline + comments-only/alias-only diff review + browser-free token/rule
resolvers.

## Continuation

Grandchild 007 (model & effort sheet) is complete. **Next:** `008-slash-command-autocomplete` —
continuing the per-surface migrations (`008`–`014`) before the catalog (`015`).
