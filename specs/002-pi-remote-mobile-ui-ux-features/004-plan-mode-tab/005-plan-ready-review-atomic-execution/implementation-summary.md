# Implementation Summary — Phase 4 — Plan-ready card, review sheet, and atomic execution

## Final state

Complete and verified. The live Plan → review → bounded Execute journey is in place: a plan-ready card, a full-height redacted review sheet, and a distinct atomic `execute_plan` handoff bound to the reviewed artifact + current revisions, with Plan restrictions restored on every terminal path and no prompt-channel privilege path. Implemented by GPT-5.6 Luna Max (via opencode-go); orchestrated and verified by Claude.

## What shipped

- **`PlanReadyCard.tsx` (new):** renders only the newest live VALID artifact (bounded title, redacted summary, revision, timestamp, step count, `Review plan`); cached/superseded/stale/unconfirmed stay history-only and cannot enable Review/Execute.
- **`PlanReviewSheet.tsx` (new):** full-height RAC modal, redacted content, inert background, initial focus on `Keep planning` (never Execute), four actions (`Keep planning`/`Revise plan`/`Leave without running`/`Execute reviewed plan`); every dismissal (Escape/backdrop/Back/swipe/focus-loss) cancels without mode change or execution.
- **`LeavePlanSheet.tsx`:** extended for Plan-ready `Leave without running`; retained artifact after confirmed exit is non-executable.
- **Web state/client** (`runtime.ts`, `state.ts`, `App.tsx`, `relay.ts`): artifact lifecycle + feedback invalidation (supersedes + disables old Execute before a replacement), review/execute-pending/executing/post-run states, and `executePlan` — a distinct call (`type:'execute_plan'`, `postRunMode:'plan'`) that mints a FRESH one-use ticket and validates the structured response; never `submitPrompt`, never `setMode(build)` fallback. The plan token is memory-only (absent from the card/review UI).
- **Relay validation** (`runtime-service.ts`, `server.ts`): atomic pre-handoff validation of ticket + foreground principal + session + runtime/plan revisions + opaque planId/token + valid artifact + Plan mode + idle turn + exact `postRunMode`; any invalid/stale/replayed/expired/mismatched/non-Plan/non-idle/non-foreground binding invokes no host tools.
- **Host execution** (`extensions/pi-remote-plan/src/index.ts`): publishes `executing-plan` only after successful handoff; bounded lease restores Plan restrictions after success/cancellation/failure (and forces them back on lease timeout); normal approvals retained; restoration failure keeps restrictions active + emits the bounded safety error.

## Verification (Claude, in the worktree)

- `npm run typecheck` → exit 0.
- `npm test` → exit 0, **221 passed (221)** (+3 new relay/extension execute tests; flake aside).
- `npm run test:web` → exit 0, **450 passed (450)** (+19 new: card/review/leave/execute).
- Security review (Claude read the diffs): `executePlan` distinct with fresh per-write ticket; no `planToken` in UI; relay atomic binding validation with foreground + opaque planId; fail-closed lease restoration; zero new colors; no `packages/**`/`specs/**` change.

## Frozen contracts

- Design unchanged (frozen tokens; zero new colors).
- Security: Execute is a client presentation of a live host-confirmed capability, revalidated atomically; fresh one-use ticket + full binding + idle + `postRunMode:'plan'`; never via submitPrompt/Build fallback; no auto-exec/YOLO/approval-bypass; token memory-only; redaction boundary intact; restrictions restored on every terminal path.

## Deferred

- True-390px CDP captures of card/review/executing ride the feature-004 batched visual pass (needs `demo.ts` plan-artifact fixtures). Real-device/VoiceOver is operator-required.
