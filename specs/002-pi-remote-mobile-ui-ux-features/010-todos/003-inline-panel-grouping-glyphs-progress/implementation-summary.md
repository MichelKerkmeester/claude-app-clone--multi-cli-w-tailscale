# Implementation Summary — 010 Phase 2 (read-only inline todo panel)

## Final state — COMPLETE

The read-only inline todo panel renders pi's plan in the transcript: grouped task rows with state glyphs +
labels, localized section headings and counts in host order, a clay progress hairline (`3/8`), a
disclosure/refresh control, and honest empty/all-done/unsupported states. The panel is display-only — no task
row carries any interactive or mutation control. Built by GPT-5.6 **sol** via OpenRouter (route note below);
orchestrated, security-reviewed, and independently verified by Claude on `main` outside the sandbox. No
relay/protocol/extension/main.tsx/index.html/service-worker/token change.

## Route note

The primary cli-codex Luna route is usage-exhausted (resets Sep 17); the opencode-go DeepSeek fallback hit its
weekly cap; and the OpenRouter **Luna** endpoint quota depleted mid-session (429/forbidden). A probe found the
limit was Luna-endpoint-specific, not account-wide, so this phase was built on **`openrouter/openai/gpt-5.6-sol`**
— still "OpenRouter via cli-opencode" per the route. RM-8 safeguards applied (clean baseline, tight ALLOWED/
BANNED, stall watchdog, full-diff review).

## What shipped (web only)

- **`TodoPanel.tsx`** (new) — `TodoProjectionBlock` (standalone transcript sibling), `TodoTaskRow` (a plain
  `<li>`: decorative aria-hidden state glyph + title + text state label — NO checkbox/button/link/drag/handler),
  grouped `Disclosure` sections with headings + counts, a `role="progressbar"` clay hairline, a panel-level
  refresh (re-fetch, read-only) and empty/all-done states.
- **`todo-model.ts` / `todo-state.ts`** (new) — the web read model + a `todoProjectionReducer` that consumes the
  Phase-1 snapshot + delta lane (a separate projection path beside transcript envelopes; host order preserved,
  stable id as identity).
- **`App.tsx` / `state.ts`** — wire the projection reducer and place the `TodoProjectionBlock` in the transcript
  at its sync position (collapse-safe — it stays visible when the tool `ActivityGroup` collapses).
- **`relay.ts`** — the authenticated read-only todo snapshot/delta/refresh calls.
- **`style.css`** — panel/rows/glyphs/progress-hairline within the frozen tokens (no added status colors, no
  floating-card treatment; state shown by glyph shape + label, never color-only).
- **`demo.ts`** — a deterministic `?fixture=todos` fixture (8 tasks, `3/8`).
- **Tests:** `TodoPanel.test.tsx`, `todo-state.test.ts`, an extended `contrast.test.tsx`, and a new end-to-end
  `App.test.tsx` case — "renders one todo panel at its sync position through the real Session and state path".

## Verification (Claude, on `main`, OUTSIDE the sandbox)

- **Scope:** web-only (the plan's list + `demo.ts` fixture). No relay/protocol/extension/main.tsx/index.html/
  service-worker/token change; no stray files.
- **Gates (final state):** `npm run build` 0; `npm run typecheck` 0; `npm test` **379 passed / 48 files**
  (unchanged — no backend change); `npm run test:web` **651 passed / 61 files** (+14). ESLint on changed files:
  0 errors (3 pre-existing `App.tsx` hook warnings, unrelated).
- **Read-only (DOM-verified, both themes):** CDP reports **8 task rows with 0 row-level controls**
  (`.todo-task-row button/input/a/[role=checkbox]` = 0); the only controls are the panel refresh + section
  disclosure + the progressbar.
- **CDP (390px, light + dark):** the panel renders end-to-end at exactly 390 CSS px, contained, no horizontal
  overflow, no modal/scrim, progress `3/8`, `localStorage` free of task content, zero uncaught exceptions.
- **End-to-end render:** the new `App.test.tsx` case drives the real App/state render path (not the panel in
  isolation) and asserts one panel at its sync position — proactively guarding against the hydrate/render gap
  that bit the prior feature.
- **Real-path (non-demo) mount check:** PASS — App.tsx/state.ts changed but the app mounts clean.

## Continuation

Next: Phase 3 (`004-live-delta-accessibility-visual-release-hardening`) — live delta application, keyboard/
screen-reader/visual hardening, and the feature release gate. The projection stays strictly read-only.
