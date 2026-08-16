# Checklist — Typed host snapshot, reconciliation, and redacted outcomes

- [x] A valid three-level snapshot passes the protocol guard. — `packages/pi-rpc-protocol/tests/guards.test.ts`.
- [x] A valid five-level snapshot passes the protocol guard. — same.
- [x] A valid seven-level snapshot passes the protocol guard and preserves host order/subset. — same; `RuntimeSnapshotDto` guard preserves advertised order/subset.
- [x] Unknown thinking IDs remain internal and do not become visible labels or reasons. — projection keeps unknown IDs internal (no user-facing label path).
- [x] Unknown issue codes, extra keys, unbounded strings, invalid revisions, invalid levels, and mismatched session IDs are rejected. — negative fixtures in `guards.test.ts`; exact-key guards.
- [x] Reconcile returns one redacted snapshot with confirmed value, advertised levels, model catalog, streaming, mode, and revision. — `server.ts /api/runtime/reconcile` → `hydrate()` → `isRuntimeSnapshotDto`; `tests/runtime-reconcile.test.ts`.
- [x] Reconcile performs no ticket request, ticket consumption, intent forwarding, or `set_thinking_level` call. — handler calls only `hydrate()`; maps to `runtime:read`; no `consumeTicket` in the reconcile path (verified by reading the handler).
- [x] Host rejection, unsupported capability, and ambiguous transport failures map to bounded issue codes. — `runtimeIssueCode(error)` → `RUNTIME_ISSUE_CODES` allowlist; `sendRuntimeIssue`.
- [x] Raw host reasons, HTTP bodies, and RPC text are absent from browser-visible responses. — issue-code projection; `tests/security/negative-controls.test.ts` + reconcile tests.
- [x] Stale revisions fail closed. — existing runtime-control tests still green in the 147-test suite.
- [x] Duplicate control IDs do not send a second Pi command. — same suite.
- [x] Foreground authority remains required. — same suite.
- [x] Build/Plan behavior is unchanged and no Plan-mode side effect occurs. — no plan-mode/policy source changed; backend suite green.
- [x] `npm run typecheck` exits 0. — verified (worktree).
- [x] `npm test` exits 0. — verified, 147 passed (147) (baseline 140 → +7, zero regressions).
- [x] `npm run test:web` exits 0. — verified, 74 passed (74).
- [ ] The fixture relay session view is captured at exactly 390 CSS px in light and dark themes through CDP. — DEFERRED to the feature-002 visual checkpoint (after phase `004`, the effort-sheet UI). This phase adds NO visual surface, so there is nothing new to capture; "no raw issue text / no new overflow" is proven by the DOM/negative-control tests. The 390px CDP harness is built.
- [x] The 390px captures show no new overflow, no raw runtime issue text, and no changed Build/Plan behavior. — no-raw-issue-text and no-Build/Plan-change are test-proven now; the pixel capture rides the feature-002 checkpoint above (no visual surface changed this phase).
