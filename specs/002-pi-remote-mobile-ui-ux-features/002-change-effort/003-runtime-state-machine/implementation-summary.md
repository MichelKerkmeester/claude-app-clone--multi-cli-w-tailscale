# Implementation Summary — Complete runtime state machine and mutation boundary

## Final state

Complete and verified. The browser now enforces the full runtime lifecycle at its final mutation boundary — non-optimistic confirmed state, one guarded request per mutation, recoverable redacted failure states, and read-only rehydration — consuming the Phase-1 reconcile/issue-code contract. No new visual surface; the existing controls run on the hardened path. Implemented by DeepSeek v4 Flash Max (via the Devin CLI, dangerous mode, operator-approved); orchestrated and verified by Claude.

## What shipped (web-only)

- **`runtime-issues.ts` (new):** the local issue-code union + `RUNTIME_ISSUE_COPY` — a fixed local string per protocol issue code. The browser renders only this bounded copy; raw status/bodies/server/host/RPC reasons are never surfaced.
- **`relay.ts`:** hydration routes through `/api/runtime/reconcile` with `RuntimeSnapshotDto` validation; offline/403/429/503/invalid/abort/timeout normalize to bounded issue codes with bounded `Retry-After`. Each mutation mints a FRESH one-use ticket (`POST /api/runtime/ticket`) and a unique `control_<uuid>` control ID — never cached or persisted.
- **`runtime.ts` (+445):** the complete state table (`checking`/`ready-*`/`streaming`/`pending`/`accepted`/`stale`/`unsupported`/`offline`/`foreground-required`/`rate-limited`/`host-unavailable`/`delivery-unknown`/`inconsistent-state`) with host-confirmed state, pending intent, and issue state separate. A synchronous in-flight ref blocks same-tick double taps; a cross-browser 10s deadline classifies unresolved delivery as `delivery-unknown`, clears no ticket, and never replays; stale/unsupported trigger one read-only reconcile with zero auto mutation retries; refresh triggers (sheet-open, visibility, online, live-sync) are read-only + deduplicated; controls lock during a pending mutation.
- **`App.tsx`:** session live transitions plumbed through; one document-level polite atomic status region; runtime state kept decoupled from transcript state.

## Verification (Claude, in the worktree)

- `npm run typecheck` → exit 0.
- `npm test` → exit 0, **147 passed (147)** — backend unchanged, zero regressions.
- `npm run test:web` → exit 0, **102 passed (102)** (74 pre-existing + 28 new: non-optimistic confirmed state, one-ticket-per-selection, same-tick dedupe, streaming-zero-mutations, stale/unsupported one-reconcile-no-retry, 10s-deadline → delivery-unknown no-replay, no-raw-issue-text).
- Security review (Claude read the diffs): issue-code allowlist prevents raw host text; fresh one-use ticket + unique control ID per mutation; no auto-retry; delivery-unknown terminal until hydrate; no protocol/relay/policy source touched.

Note: Devin (dangerous mode) is not sandboxed, so it ran `npm test` normally — no codex-style EPERM artifact. Independently re-run by Claude, fully green.

## Frozen contracts

- Design untouched (no visual surface this phase).
- Security strengthened, never weakened: read-only default; the mutation lane keeps the one-use revision-bound ticket + fresh control ID + foreground authority; browser sees only bounded issue codes; plan-mode/tool authority unchanged.

## Deferred

- True-390px CDP captures ride the feature-002 visual checkpoint (after the effort-sheet UI phase) — this phase changes no visual surface; "no raw issue text / no overflow" is already test-proven in jsdom.
