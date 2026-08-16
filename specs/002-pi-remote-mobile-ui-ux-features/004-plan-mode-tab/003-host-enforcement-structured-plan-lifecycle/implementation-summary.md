# Implementation Summary — Phase 2 — Host enforcement and structured plan lifecycle

## Final state

Complete and verified. Plan authority is now real at the host boundary: default-deny tool classification, a structured (never prose-inferred) plan lifecycle with redacted artifacts and an opaque host token, a fail-closed execution lease, and `/plan` control isolation at the prompt/catalog boundary. Host/extension + relay only; no web surface. Implemented by DeepSeek v4 Flash Max (via the Devin CLI, dangerous mode); orchestrated and verified by Claude.

## What shipped

- **Extension `pi-remote-plan`** (`index.ts`, new `plan-artifact.ts`): **default-deny** classifier — the read-only extension/MCP allowlist is empty, so every unknown built-in/extension/MCP tool is denied in Plan; the bash allowlist stays narrow; mutation-capable built-ins are stripped from the plan-restricted set. The plan-artifact adapter mints a fresh opaque token per revision via `randomBytes` (never derived from plan text), with bounded redacted fields, stable ID/revision, validity, and accept/invalidate. Lifecycle events (Build/Plan, structured `plan.ready`, `plan.superseded` invalidation, post-handoff `executing-plan`). A bounded execution lease restores Plan restrictions on success/cancel/failure and, on restoration/handoff failure, keeps restrictions active while publishing only `Plan safety could not be verified`.
- **Relay** (`plan-status.ts`, `runtime-service.ts`): consume the structured mode/artifact events, increment the correct revision, and return `unknown` for malformed/unhealthy state (never Build).
- **Prompt boundary** (`prompt-service.ts`): a leading `/plan` token (all argument forms) is rejected after whitespace normalization before any Pi prompt — never transcript or model-visible.
- **Command catalog** (`command-service.ts`): the Plan control command is removed from the phone catalog; safe non-control commands retained.

## Verification (Claude, in the worktree)

- `npm run typecheck` → exit 0.
- `npm test` → 218/218 on a clean run (+25 new host/relay tests; the intermittent 217/218 is the known flaky auth foreground test, unrelated).
- `npm run test:web` → exit 0, 358 passed (358) — no web src changed.
- Security review (Claude read the diffs): default-deny with empty allowlist; fail-closed lease restoration + bounded error; `/plan` blocked before forwarding; random opaque token not from plan text; malformed status → unknown never Build.

## Frozen contracts

- Design untouched (no visual change).
- Security strengthened: Plan enforced by the host, not UI; read-only-by-default preserved; Phase-1 protocol/relay authority contract intact; no Execute path exposed yet.

## Deferred

- CDP fixture screenshots ride the feature-004 visual checkpoint (the mode/extension-error UI arrives in later phases). No web surface changed here.
