# Implementation Summary — 010 Phase 1 (read-only todo projection protocol + authority + redaction)

## Final state — COMPLETE

The typed, host-owned, READ-ONLY todo projection lane is built and verified: snapshot + delta DTOs with strict
guards, an allowlist host projector that discards task detail, redacted metadata-only persistence, content-free
push, and a `todoProjection` capability. No web panel UI (Phase 2). The phone never mutates the todo list.
Built by GPT-5.6 Luna Max **via OpenRouter** (the primary cli-codex route remains usage-exhausted; a first
attempt hit OpenRouter rate limits and wrote nothing — retried after the rate window reset). Orchestrated,
security-reviewed, and independently verified by Claude on `main` outside the sandbox.

## What shipped (protocol + relay only)

- **`packages/pi-rpc-protocol/src/{types,guards,index}.ts`** — snapshot + delta todo projection DTOs and strict
  exact-key guards (closed-state set, supported envelope kinds, bounded id/order/revision, timestamps); no
  mutation DTOs.
- **`apps/pi-remote-relay/src/store/todo-projector.ts`** (new) — `projectTodoSnapshot`/`projectTodoDelta`/
  `projectTask`: an ALLOWLIST projector emitting only stable id, redacted title (`projectDisplayText`, bounded),
  closed state, redacted group, order, revision, and timestamps. **Task detail is discarded** (the file never
  emits a `detail` field). Rejects unknown states / duplicate ids / invalid order / malformed timestamps /
  invalid revisions with no fabricated fallback.
- **`store/redaction.ts` + `store/relay-store.ts`** — todo projection content passes `redactEnvelope` before
  persistence/broadcast; raw DTOs are never logged.
- **`replay/sync.ts` + `rpc/supervisor.ts`** — typed snapshot + delta read models with revision metadata; a
  base-revision mismatch preserves the last valid view (no invented/merged delta chain).
- **`http/server.ts`** — advertises `TODO_PROJECTION_CAPABILITY` (`todoProjection: 1`); **adds no mutation
  route** (read-only).
- **`push/push-service.ts`** — a content-free todo sync-availability signal (reuses `serializePushHint`; no
  title/detail/state/group/order/plan-identity).
- **Tests** — `todo-projection.test.ts` (new) + extended `redaction`/`sync`/`push`/`security/negative-controls`
  tests.

## Verification (Claude, on `main`, OUTSIDE the sandbox)

- **Scope:** only the plan's allowed paths (protocol + relay projector/store/sync/push/http + tests). **No web
  file touched** (Phase 2). No stray files.
- **Gates (final state):** `npm run build` 0; `npm run typecheck` 0; `npm run test:web` **637 passed / 61
  files** (unchanged — no web this phase); `npm test` backend **378 passed / 379** with the single failure
  ROTATING between two pre-existing, unrelated flaky tests across reruns — the known `auth.test.ts`
  socket-teardown race and the `pinned-pi-image-probe` integration spawn race (both pass in isolation; 010
  touched no auth or image code). The focused todo projection/redaction/sync/push/security suite is 93 passed /
  6 files. ESLint on changed files: 0.
- **Security sign-off (diffs read):** READ-ONLY — no todo mutation route/RPC/ticket/approval exists (only the
  capability is advertised); allowlist projector discards detail and never emits a `detail` field; titles/groups
  pass redaction before DTO; `redactEnvelope` before persistence/broadcast; content-free push; base-revision
  mismatch preserves the last valid view; plan mode + `--full-access` remain phone-inaccessible; todo state is
  not inferred from transcript text; the stable id (not array position) is the identity.

## Continuation

Next: Phase 2 (`003-inline-panel-grouping-glyphs-progress`) — the web inline panel that projects the read-only
todo list (grouping, glyphs, progress) from this lane. Phase 3 (`004-...`) adds live-delta/a11y/visual/release
hardening. The projection stays strictly read-only throughout.
