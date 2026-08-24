# Implementation Summary — 003 P2 grandchild 013 (plan/todo & ask-question surfaces)

## Final state — COMPLETE

The task/question surfaces — the `plan`-kind block's ✓/○ todo checklist, the ask-question card
(`AskQuestionCard` + prompt / option-list / option-row / free-text / status / submit), and the todos
projection panel (`TodoPanel`) — now carry the full `@ds` grammar with `@ds state:` blocks per visual
state, and every security seam fenced: the ask-question **one-use ticketed, revision-bound, FAIL-CLOSED
mutation path** and the todos panel's **read-only projection** both carry `@ds guardrail: do-not-edit`.
Value-, behaviour-, and security-preserving. Built by **DeepSeek V4 Flash MAX (Cline CLI)**;
orchestrated and independently verified by Claude on `main` outside the sandbox.

## Spec reconciliation (Logic-Sync)

`spec.md` was authored when the ask-question and todos surfaces did not exist; it planned only to
*scaffold `@ds` seams* for them and migrate the plan/todo checklist. Both sibling-`002` features have
since **shipped to `main`** — `apps/pi-remote-web/src/features/ask-question/` and
`apps/pi-remote-web/src/TodoPanel.tsx`, with their `.ask-question-*` / `.todo-*` rules in `style.css`.
Continuing to scaffold empty seams would leave two shipped surfaces un-migrated. So this phase
**migrates all three real surfaces** (annotation-only — the rules are already tokenized). Documented
deviation; the spec's intent (bring the task/question surfaces onto the system, designer-editable) is
better met than by the stale letter.

## What shipped

- **`apps/pi-remote-web/src/App.tsx`** (+6/0) — `@ds surface: plan-todo` + `@ds state:` done (✓) /
  pending (○) on the plan-kind block; `@ds guardrail` on the done-derivation. Existing transcript
  `@ds` labels preserved.
- **Seven `features/ask-question/*.tsx`** (+27/0 total) — `@ds surface: ask-question`, `@ds slot:`
  (prompt / kicker / options / option-row / free-text / submit / status), `@ds state:` (loading,
  read-only, option idle/hover/pressed/selected/disabled, submitting, sent, error), and `@ds
  guardrail: one-use ticketed, revision-bound, FAIL-CLOSED mutation path` fencing the ticket / revision
  binding / non-optimistic submit / react-aria wiring. **Comments only.**
- **`apps/pi-remote-web/src/TodoPanel.tsx`** (+26/0) — `@ds surface: todos`, `@ds slot:` (header /
  heading / provenance / progress-count / sync-note / body / rows / empty-line), `@ds state:`
  (all-done, empty, syncing, per-row), and `@ds guardrail: READ-ONLY projection — the phone NEVER
  mutates pi's task list`. **Comments only.**
- **`apps/pi-remote-web/src/style.css`** (+76/0) — `@ds surface:`/`@ds slot:`/`@ds state:`/`@ds
  guardrail:` labels across the plan-checklist, `.ask-question-*`, and `.todo-*` rules. **Comments
  only** — no declaration, value, selector, or token changed.

## Verification (Claude, on `main`, OUTSIDE the sandbox)

- **Scope:** 10 files — App.tsx, 7 ask-question `.tsx`, TodoPanel, style.css; **no test touched**; no
  dependency; no hooks/types/state files touched.
- **`.tsx` behaviour/security-preserving:** all comments-only (0 deletions); a scan for `ticket`/
  `revision`/`mutat`/`useAskQuestion`/`onPress`/`onSubmit`/`useState`/`fetch`/`submit` on non-comment
  lines returned **empty** — the ask-question mutation path is byte-identical.
- **Token identity:** token resolver **CHANGED 0, MISSING 0**.
- **Rule identity:** rule-level resolver **CHANGED 0 / VANISHED 0 / ADDED 0** across light/dark/system.
- **Gates:** `npm run typecheck` **0**; `npm run build` **0**; `npm run test:web` **0 — 670 passed /
  62 files** (incl. the ask-question / todo / plan suites, unmodified); `git diff --check` clean;
  backend unaffected (pre-existing WASM flake only).
- **Comment hygiene:** clean; `@ds` comments carry the durable WHY.
- **Security:** annotation-only; the ask-question ticketed/revision-bound FAIL-CLOSED mutation stays
  exactly as is; the todos panel stays a read-only projection.
- **User-flagged safety:** `specs/context/` (the two untracked repos) re-confirmed `?? … untouched`.

## Route & cost note

Built on the **Cline CLI** (`cline-pass/deepseek-v4-flash`, `--thinking xhigh`), 69 iterations.
Goal-named routes remain hard-exhausted; safeguarded by clean-baseline + comments-only diff review +
browser-free token/rule resolvers + a mutation-diff read.

## Continuation

Grandchild 013 (plan/todo & ask-question surfaces) is complete. **Next:** `014-states-interaction-motion`
then `015-catalog-docs-preview` — the last two P2 surfaces.
