# Implementation Summary — Protocol, redaction, and bound runtime authority

## Final state

Complete and verified. The model-switch contract is hardened end to end — protocol DTOs/guards, relay redaction, a one-use revision-bound runtime ticket, and the web contract consumers — while the existing visible picker is unchanged. Implemented by an external model (GPT-5.6 SOL, high/fast via codex); orchestrated and verified by Claude.

## What shipped

- **Protocol** (`packages/pi-rpc-protocol/`): expanded `AvailableModelDto` (host-authoritative optional metadata: reasoning, input kinds, context window, max tokens, tools, availability + reason code, pricing); `RuntimeModelCatalogDto` gained `catalogRevision`, `runtimeRevision`, `currentModel`, `streaming`, `canSetModelWhileStreaming`; new runtime model-ticket request/response DTOs and an expanded `set_model` control command with both expected revisions. Strict guards reject unknown keys, fractional/negative/missing revisions, oversized metadata, malformed ticket requests, and non-path-free IDs. All new public types + guards exported. Positive and negative fixtures added.
- **Relay redaction** (`store/redaction.ts`): bounded allowlist projection. `safeDisplayString` strips control and bidirectional-override characters and rejects any value containing a URL, filesystem path, Windows path, or secret pattern; pricing/enum/scalar fields are individually bounded and omitted when the host cannot authoritatively provide them.
- **Runtime authority** (`runtime/runtime-service.ts`, `auth/auth-service.ts`, `auth/policy.ts`, `http/server.ts`): in-memory, short-lived (10s), one-use runtime ticket bound to session token, device, principal, origin, action `runtime:control`, exact provider/model target, and both revisions. `POST /api/runtime/ticket` gates issuance on guard validation → foreground device → per-device rate limit (10/60s) → fresh-catalog re-validation. `/api/runtime/control` consumes and compares the binding **before** host execution; any mismatch marks the ticket consumed, deletes it, and returns 401 — no execution, no replay. Policy authorizes only the new `runtime-ticket:create` action.
- **Web contract** (`apps/pi-remote-web/src/relay.ts`, `runtime.ts`): consume the expanded catalog and drive the ticket/submit flow; committed state stays non-optimistic (header never changes before host acceptance; zero automatic retries on stale/rejected/delivery-unknown). The existing picker remains the temporary presentation layer.

## Verification (run by Claude, in the worktree, outside the dispatch sandbox)

- `npm run typecheck` → exit 0.
- `npm test` → exit 0, **140 passed (140)** (baseline 134 → +6 new, zero regressions).
- `npm run test:web` → exit 0, 40 passed (40).
- Security review (Claude read the diffs): ticket binding, one-use consume-before-execute ordering, fail-closed on session/device/origin/principal/target/revision mismatch, foreground + rate-limit + fresh-catalog gating on issuance, and the redaction allowlist all confirmed against the checklist. Negative-control tests genuinely exercise substitution, replay, one-use reuse, wrong-session, expiry, and full-access denial.

Note: the dispatch run reported 24 `npm test` failures — all `listen EPERM 127.0.0.1`, a codex workspace-write sandbox artifact (loopback bind denied), not assertion failures. Re-running the same suite outside the sandbox is fully green.

## Frozen contracts

- Design system untouched — no token/CSS/visible-picker change (only the data layer moved).
- Security posture strengthened, never weakened: read-only default preserved (catalog reads/staging consume no ticket), one-use ticketed + revision-checked mutation that fails closed, redaction hardened, plan-mode/full-access boundaries intact.

## Deviations / deferred

- The true-390px light/dark CDP capture of the visible control is satisfied by construction here: no UI component or CSS file changed, so the picker render cannot regress, and `test:web` is green. The pixel-capture harness is stood up and exercised at phase `003-functional-model-switcher-sheet`, the first visible change.
