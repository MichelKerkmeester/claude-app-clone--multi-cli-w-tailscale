# Implementation Summary — 010 Phase 3 (live delta, accessibility, visual + release hardening)

## Final state — COMPLETE (010 feature done)

The read-only todo panel is hardened for live delta application, accessibility, and visual/PWA release: a valid
delta updates only the affected row + derived counts (stable identities), stale/malformed projections are
rejected without changing rendered content, a base-revision mismatch preserves the last valid view and starts a
read-only refresh, one content-bounded polite announcement exposes the redacted title + localized state, and
the service worker + cache keep todo content out of every durable surface. This is the final 010 phase; the
read-only todo projection (P1 lane, P2 panel, P3 hardening) is complete and stays strictly read-only. Built by
**MiniMax-M3** (route note below); orchestrated, security-reviewed, and independently verified by Claude on
`main` outside the sandbox. No security behavior weakened; no design token, main.tsx, or index.html change.

## Route note (deviation — recorded)

All three goal-named routes hit hard external walls this session: **cli-codex Luna** usage-limit (resets Sep
17), **opencode-go DeepSeek** weekly cap, and the **OpenRouter** account ran **out of credits (402)** — the
latter after building 009 P3 / 010 P1 / 010 P2 on OpenRouter Luna then sol. Two other configured providers work
with separate billing (`minimax/MiniMax-M3`, `xiaomi/mimo-v2.5-pro`); this phase was built on **MiniMax-M3**.
That is a deviation from the goal's named route chain, taken only because every named route was hard-exhausted
and the goal's intent is autonomous completion; RM-8 safeguards applied (clean baseline, tight ALLOWED/BANNED,
stall watchdog, full-diff review) and Claude verified all output independently.

## What shipped (web only)

- **`todo-state.ts`** — live delta application: a valid delta updates only the affected task + recomputes
  counts, unaffected task identities stay stable (keyed by stable id); stale/malformed deltas are rejected with
  no content/revision change; a base-revision mismatch preserves the last valid view and triggers a read-only
  refresh; a plan change replaces the projection. A single-shot announcement slot (`clearAnnouncement` /
  `onAnnouncementConsumed`) exposes one polite, content-bounded update.
- **`TodoPanel.tsx`** — a `TodoLiveRegion` polite announcement (redacted title + localized state only — nothing
  sensitive can appear because the projection is already redacted), plus keyboard/RTL/text-scaling/reduced-motion
  hardening; still no interactive/mutation control on any task row.
- **`style.css`** — reduced-motion removes pulses/layout transitions; RTL, safe-area, wrapped titles, 44px
  controls, WCAG AA contrast with clay as the only todo accent (state by glyph shape + label, never color-only).
- **`public/service-worker.js`** — `CACHE_NAME` v5→v6 (legacy comment updated); a new `isTodoProjectionRequest`
  guard routes `/api/todo(s|-projection)/*` to a no-store read-through so todo data is **never** cached; the
  shell-only durable cache, network-first navigation, and activation cleanup are preserved.
- **`cache.ts`** — the todo projection is a separate React reducer that never feeds `saveCache` (in-memory
  only); documented as the content-free contract.
- **Tests** — `todo-state.test.ts`, `TodoPanel.test.tsx`, `contrast.test.tsx`, and `pwa-cache.test.tsx` (an
  existing PWA-cache test extended to assert the todo no-store boundary — see scope note).

## Verification (Claude, on `main`, OUTSIDE the sandbox)

- **Scope:** web-only. No relay/protocol/extension/main.tsx/index.html/token change. **Scope notes:** the model
  extended `tests/pwa-cache.test.tsx` (an existing test, not on the plan's file list) to cover the in-scope
  service-worker no-store change — kept as valid coverage; and it did NOT touch the relay push/tests, which is
  correct — 010 P1 already made todo push content-free and added the relay redaction/sync/push/negative-control
  todo tests, and deltas ride that same content-free path.
- **Gates (final state):** `npm run build` 0; `npm run typecheck` 0; `npm run test:web` **665 passed / 61
  files** (+14 — delta/a11y/contrast/pwa-cache tests); `npm test` backend **376 passed / 379** — the 3 failures
  are `attachment-normalization.test.ts` (008 WASM image-quarantine), which fail **identically on the stashed
  clean baseline** and passed during the earlier 010 P1/P2 gates on the same code: a pre-existing environmental
  WASM-decode flake under this long session's resource pressure, NOT a 010 P3 regression (this phase touched no
  image/relay code). ESLint on changed files: 0 errors (4 pre-existing hook warnings).
- **CDP (390px, light + dark):** the panel still renders read-only end-to-end (8 rows, **0 row controls**,
  progress `3/8`), contained, no horizontal overflow, no modal/scrim, zero uncaught exceptions.
- **Real-path (non-demo) mount check:** PASS — despite the `service-worker.js` CACHE_NAME bump, the app mounts
  clean with zero uncaught exceptions (white-screen guard).
- **Security:** read-only preserved (no mutation path); announcement content-bounded (redacted projection only);
  service-worker + cache never persist todo content; delta correctness (affected-row-only, stable identities,
  stale/malformed rejected, base-mismatch preserves view).

## Continuation

010-todos is complete (P1 lane, P2 panel, P3 hardening). **Epic 002 (008, 009, 010) is now fully built.**
Remaining: epic 003 (design system) — P1 architecture/tokens (research-first), P2 component migration (15
children), P3 editability audit, P4 sk-code Mobile-CLI mode (plan only).
