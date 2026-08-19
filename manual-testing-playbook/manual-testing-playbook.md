---
title: "Pi Remote: Manual Testing Playbook"
description: "Operator-facing reference combining the manual-validation directory, review and release-readiness rules, execution expectations, and per-feature validation files for the Pi Remote app."
version: 1.0.0.0
---

# Pi Remote: Manual Testing Playbook

This document combines the full manual-validation contract for the Pi Remote app into a single reference. The root playbook is the operator directory, review protocol, and orchestration guide: it explains how each scenario is run, how evidence is captured, and how results are graded. The per-feature files under the category folders carry the deeper execution contract — user request, exact prompt, command sequence, expected signals, source anchors, and verdict rules. It is the validation companion to the sibling [`feature-catalog/`](../feature-catalog/feature-catalog.md).

---

## 1. OVERVIEW

A deterministic scenario per shipped Pi Remote feature, one file per feature, grouped into the same eight categories as the feature catalog. Each scenario names a real regression/validation test and a binary verdict so any operator reproduces the same result.

Coverage note: 43 scenarios across 8 categories, mirroring the 43-entry feature catalog one-for-one.

### Realistic Test Model

1. An operator (or agent) restates the maintainer request in plain language.
2. The operator runs the exact command the scenario names — a real Vitest regression, never a mock.
3. The operator captures the transcript, the summary line, and the exit code.
4. The scenario passes only when the named test is green and the observed behavior matches the desired outcome.

### What Each Feature File Explains

- The realistic maintainer request that motivates the check.
- The exact operator prompt and command sequence.
- The expected signals, evidence to capture, and binary PASS/FAIL criteria.
- The implementation and regression-test anchors that justify the scenario.
- Any on-device leg that is out of scope for an automated run (marked SKIP with a specific blocker).

---

## 2. GLOBAL PRECONDITIONS

1. Working directory is the Pi Remote repository root.
2. Node.js 22 and npm 10 are installed.
3. `npm ci` has run and `npm run build` has produced the protocol/relay/web dist, so the web suite resolves the built protocol.
4. Automated scenarios run with no network and no physical device — they exercise relay, protocol, extension, and web logic through Vitest only.
5. Device/ingress/push scenarios (device enrollment, Serve identity, content-free push, attention inbox) additionally require a physical enrolled phone, live Tailscale Serve, and APNs; those legs are marked `SKIP` in an automated run with that exact blocker.
6. The destructive `rollback-drill` scenario runs only against a disposable database and MUST verify recovery.

---

## 3. GLOBAL EVIDENCE REQUIREMENTS

- The exact command transcript and its exit code.
- The Vitest summary line naming the target test file with its pass/fail count.
- The operator prompt used.
- Output snippets for any non-pass step.
- The scenario verdict (`PASS` / `FAIL` / `SKIP`) with a one-line rationale.

---

## 4. DETERMINISTIC COMMAND NOTATION

- Bash/Vitest commands are shown verbatim, e.g. `npx vitest run <test-file>` (web tests add `--config vitest.web.config.ts`).
- Whole-suite gates: `npm test` (protocol + relay + extensions + root) and `npm run test:web` (web).
- `->` separates sequential steps.

---

## 5. REVIEW PROTOCOL AND RELEASE READINESS

### Scenario Acceptance Rules

1. Preconditions were satisfied.
2. The prompt and command were executed as written.
3. Expected signals are present.
4. Evidence is complete and readable.
5. The verdict rationale is explicit.

### Scenario Verdict

- `PASS`: all acceptance checks true and the named test is green.
- `FAIL`: the named test fails, output contradicts the expected signal, or a critical check fails.
- `SKIP`: a specific sandbox/runtime blocker (named in the scenario) prevents the on-device leg.

### Feature & Release Rules

- Feature `PASS` only when every mapped scenario is `PASS` (a device-only leg may be `SKIP` when its automated logic leg is `PASS`).
- Any critical-path scenario `FAIL` forces the feature to `FAIL`.
- Release is ready only when no feature is `FAIL`, every automatable scenario is `PASS`, coverage is 43/43, and no blocking triage item remains.

---

## 6. SUB-AGENT ORCHESTRATION AND WAVE PLANNING

Scenarios are independent and can be run in parallel waves. Reserve one coordinator, saturate worker slots with automatable scenarios, and run the destructive `rollback-drill` in a dedicated sandbox-only wave. Record the utilization table, per-feature file references, and evidence paths in the run report. Device/ingress/push scenarios that need real hardware are grouped into a single operator-run wave.

---

## 7. TRANSPORT AND STATE (`PR-001..PR-006`)

### PR-001 | Canonical redaction

#### Description
Verify the single redaction policy applied to every envelope before persistence or broadcast.

#### Scenario Contract
Prompt: "Run the canonical redaction regression and confirm the policy strips raw path, secret, and private-text material from every envelope before persistence or broadcast."

#### Test Execution
> **Feature File:** [PR-001](transport-and-state/canonical-redaction.md)
> **Catalog:** [transport-and-state/canonical-redaction.md](../feature-catalog/transport-and-state/canonical-redaction.md)

---

### PR-002 | LF JSONL framing and demux

#### Description
Verify strict LF-delimited JSONL framing and request id demultiplexing for the Pi RPC stream.

#### Scenario Contract
Prompt: `Run the framing and demux regression and confirm raw stdout chunks are framed into records and each record is demultiplexed by request id before any higher layer sees a value.`

#### Test Execution
> **Feature File:** [PR-002](transport-and-state/lf-jsonl-framing-and-demux.md)
> **Catalog:** [transport-and-state/lf-jsonl-framing-and-demux.md](../feature-catalog/transport-and-state/lf-jsonl-framing-and-demux.md)

---

### PR-003 | Redacted durable ledger

#### Description
Verify sQLite ledger that persists redacted envelopes with epoch ordering, deduplication, and retention floors.

#### Scenario Contract
Prompt: "Run the store regression and confirm the SQLite ledger persists redacted envelopes with epoch ordering, deduplication, and retention floors."

#### Test Execution
> **Feature File:** [PR-003](transport-and-state/redacted-durable-ledger.md)
> **Catalog:** [transport-and-state/redacted-durable-ledger.md](../feature-catalog/transport-and-state/redacted-durable-ledger.md)

---

### PR-004 | RPC supervision

#### Description
Verify persistent supervision of one Pi RPC child with bounded restart and recorded fixture fallback.

#### Scenario Contract
Prompt: "Run the RPC supervision regression and confirm the supervisor owns exactly one Pi RPC child with bounded restart and recorded fixture fallback."

#### Test Execution
> **Feature File:** [PR-004](transport-and-state/rpc-supervision.md)
> **Catalog:** [transport-and-state/rpc-supervision.md](../feature-catalog/transport-and-state/rpc-supervision.md)

---

### PR-005 | Sync and replay barrier

#### Description
Verify a sync hub that joins replay snapshots and live deltas without interleaving pre-snapshot messages.

#### Scenario Contract
Prompt: "Run the sync regression and confirm the replay barrier holds, so the snapshot replays fully before any live delta is delivered."

#### Test Execution
> **Feature File:** [PR-005](transport-and-state/sync-replay-barrier.md)
> **Catalog:** [transport-and-state/sync-replay-barrier.md](../feature-catalog/transport-and-state/sync-replay-barrier.md)

---

### PR-006 | Transcript projection

#### Description
Verify projection of the Pi event stream into typed, revisable transcript blocks.

#### Scenario Contract
Prompt: `Run the transcript projection regression and confirm Pi RPC events and submitted phone prompts project into the typed, revisable blocks without persisting command authority.`

#### Test Execution
> **Feature File:** [PR-006](transport-and-state/transcript-projection.md)
> **Catalog:** [transport-and-state/transcript-projection.md](../feature-catalog/transport-and-state/transcript-projection.md)

---

## 8. AUTH AND BOUNDARY (`PR-007..PR-012`)

### PR-007 | Application sessions

#### Description
Verify short-lived application sessions established by a device proof challenge exchange.

#### Scenario Contract
Prompt: `"Run the relay auth regression and confirm the session-token exchange still issues bounded-TTL tokens and revalidates origin, principal, device liveness, and expiry on every request."`

#### Test Execution
> **Feature File:** [PR-007](auth-and-boundary/application-sessions.md)
> **Catalog:** [auth-and-boundary/application-sessions.md](../feature-catalog/auth-and-boundary/application-sessions.md)

---

### PR-008 | Default-deny authorization

#### Description
Verify an explicit action allowlist that denies every unknown action and tool mutation.

#### Scenario Contract
Prompt: `Run the negative-controls security tests and confirm no unknown action or tool mutation passes the auth boundary.`

#### Test Execution
> **Feature File:** [PR-008](auth-and-boundary/default-deny-authorization.md)
> **Catalog:** [auth-and-boundary/default-deny-authorization.md](../feature-catalog/auth-and-boundary/default-deny-authorization.md)

---

### PR-009 | Device enrollment

#### Description
Verify short-lived QR pairing challenges and ECDSA key proof for binding one device.

#### Scenario Contract
Prompt: "Run the enrollment regression and confirm the relay still registers a device only after it mints a one-time QR challenge and the phone proves possession of a fresh P-256 key."

#### Test Execution
> **Feature File:** [PR-009](auth-and-boundary/device-enrollment.md)
> **Catalog:** [auth-and-boundary/device-enrollment.md](../feature-catalog/auth-and-boundary/device-enrollment.md)

---

### PR-010 | One-use tickets

#### Description
Verify one-use WebSocket tickets that bind a session to a single sync or prompt upgrade.

#### Scenario Contract
Prompt: `"Run the auth regression and confirm a one-use ticket is minted and consumed exactly once before the socket or prompt boundary."`

#### Test Execution
> **Feature File:** [PR-010](auth-and-boundary/one-use-tickets.md)
> **Catalog:** [auth-and-boundary/one-use-tickets.md](../feature-catalog/auth-and-boundary/one-use-tickets.md)

---

### PR-011 | Revocation

#### Description
Verify session, device, and grant revocation with active connection teardown.

#### Scenario Contract
Prompt: `Run the revocation regression and confirm that revoking a session or device marks every related record terminal, aborts in-flight approval authority, and closes matching WebSocket connections with a revocation code.`

#### Test Execution
> **Feature File:** [PR-011](auth-and-boundary/revocation.md)
> **Catalog:** [auth-and-boundary/revocation.md](../feature-catalog/auth-and-boundary/revocation.md)

---

### PR-012 | Serve-identity anchor

#### Description
Verify fail-closed loopback ingress that trusts only the Serve secret path and the Tailscale identity headers.

#### Scenario Contract
Prompt: "Run the Serve-identity anchor test and confirm the auth boundary fails closed on loopback."

#### Test Execution
> **Feature File:** [PR-012](auth-and-boundary/serve-identity-anchor.md)
> **Catalog:** [auth-and-boundary/serve-identity-anchor.md](../feature-catalog/auth-and-boundary/serve-identity-anchor.md)

---

## 9. APPROVAL AND MUTATION (`PR-013..PR-018`)

### PR-013 | Accept-edits grants

#### Description
Verify bounded grants that auto-approve a fixed number of edits within named enabled tools.

#### Scenario Contract
Prompt: `Run the accept-edits grants regression and confirm the bounded-grant enforcement in the approval service still passes without regressions.`

#### Test Execution
> **Feature File:** [PR-013](approval-and-mutation/accept-edits-grants.md)
> **Catalog:** [approval-and-mutation/accept-edits-grants.md](../feature-catalog/approval-and-mutation/accept-edits-grants.md)

---

### PR-014 | CAS decision settle

#### Description
Verify compare-and-swap settling of one approval decision under idempotency and revision guards.

#### Scenario Contract
Prompt: `Run the approval regression and confirm decision settling stays idempotent and revision-guarded.`

#### Test Execution
> **Feature File:** [PR-014](approval-and-mutation/cas-decision-settle.md)
> **Catalog:** [approval-and-mutation/cas-decision-settle.md](../feature-catalog/approval-and-mutation/cas-decision-settle.md)

---

### PR-015 | Exact-action leases

#### Description
Verify one-decision approval leases bound to the exact canonical action digest.

#### Scenario Contract
Prompt: "Run the exact-action lease regression and confirm every lease pins the canonical action digest with a bounded TTL."

#### Test Execution
> **Feature File:** [PR-015](approval-and-mutation/exact-action-leases.md)
> **Catalog:** [approval-and-mutation/exact-action-leases.md](../feature-catalog/approval-and-mutation/exact-action-leases.md)

---

### PR-016 | Final-gate digest

#### Description
Verify recomputation of the exact action digest at the final boundary before execution.

#### Scenario Contract
Prompt: `Run the final-gate digest regression and confirm the digest is recomputed and every authority gate is rechecked before the lease is marked consumed.`

#### Test Execution
> **Feature File:** [PR-016](approval-and-mutation/final-gate-digest.md)
> **Catalog:** [approval-and-mutation/final-gate-digest.md](../feature-catalog/approval-and-mutation/final-gate-digest.md)

---

### PR-017 | Kill switch

#### Description
Verify a mutation policy that disables the enabled command family and revokes outstanding authority.

#### Scenario Contract
Prompt: "Run the kill switch mutation regression and confirm the disabled request carries the disable reason and revokes outstanding authority with no failures."

#### Test Execution
> **Feature File:** [PR-017](approval-and-mutation/kill-switch.md)
> **Catalog:** [approval-and-mutation/kill-switch.md](../feature-catalog/approval-and-mutation/kill-switch.md)

---

### PR-018 | Mutation containment

#### Description
Verify the extension boundary that blocks protected tool calls before execution and the loopback authority routes that back it.

#### Scenario Contract
Prompt: "Run the mutation-containment regression and confirm the final boundary blocks protected tool calls before anything executes."

#### Test Execution
> **Feature File:** [PR-018](approval-and-mutation/mutation-containment.md)
> **Catalog:** [approval-and-mutation/mutation-containment.md](../feature-catalog/approval-and-mutation/mutation-containment.md)

---

## 10. COMMAND AND PUSH (`PR-019..PR-021`)

### PR-019 | Attention inbox

#### Description
Verify a bounded in-app attention list that resolves hints to current relay state.

#### Scenario Contract
Prompt: "Run the push regression and confirm the attention inbox still resolves hints to current relay state through the push service."

#### Test Execution
> **Feature File:** [PR-019](command-and-push/attention-inbox.md)
> **Catalog:** [command-and-push/attention-inbox.md](../feature-catalog/command-and-push/attention-inbox.md)

---

### PR-020 | Prompt steering transport

#### Description
Verify steering prompt submission through the supervised RPC child with redacted projection.

#### Scenario Contract
Prompt: `"Run the prompt steering transport regression and confirm the prompt command routes through the RPC child and commits only the redacted transcript projection back toward the ledger."`

#### Test Execution
> **Feature File:** [PR-020](command-and-push/prompt-steering-transport.md)
> **Catalog:** [command-and-push/prompt-steering-transport.md](../feature-catalog/command-and-push/prompt-steering-transport.md)

---

### PR-021 | VAPID content-free push

#### Description
Verify web Push delivery of content-free attention hints with encrypted stored subscriptions.

#### Scenario Contract
Prompt: "Run the VAPID content-free push regression and confirm the relay sends only a lookup id and attention class, with subscriptions stored encrypted and delivery suppressed for foreground devices and toggled-off classes."

#### Test Execution
> **Feature File:** [PR-021](command-and-push/vapid-content-free-push.md)
> **Catalog:** [command-and-push/vapid-content-free-push.md](../feature-catalog/command-and-push/vapid-content-free-push.md)

---

## 11. PWA (`PR-022..PR-025`)

### PR-022 | Approval card

#### Description
Verify the review view that presents exact-action approvals with decision and grant actions.

#### Scenario Contract
Prompt: `Run the approval-card regression and confirm the review view renders each exact-action approval with redacted input, digest, countdown, and all decision and grant actions.`

#### Test Execution
> **Feature File:** [PR-022](pwa/approval-card.md)
> **Catalog:** [pwa/approval-card.md](../feature-catalog/pwa/approval-card.md)

---

### PR-023 | Compose box

#### Description
Verify the prompt composer that submits steering input with optimistic blocks and retry.

#### Scenario Contract
Prompt: "Run the compose-box regression and confirm submit, optimistic block, commit, and rejection-restore-with-retry all behave as designed."

#### Test Execution
> **Feature File:** [PR-023](pwa/compose-box.md)
> **Catalog:** [pwa/compose-box.md](../feature-catalog/pwa/compose-box.md)

---

### PR-024 | Session list

#### Description
Verify the Home view that lists opaque session cards from the relay catalog.

#### Scenario Contract
Prompt: `Run the session-list regression and confirm the Home view renders session cards from the catalog, hydrates before the relay list arrives, and keeps device footer actions working.`

#### Test Execution
> **Feature File:** [PR-024](pwa/session-list.md)
> **Catalog:** [pwa/session-list.md](../feature-catalog/pwa/session-list.md)

---

### PR-025 | Typed-block transcript

#### Description
Verify the live transcript view that renders typed, revisable blocks from sync messages.

#### Scenario Contract
Prompt: "Run the typed-block transcript regression and confirm the transcript state normalizes, reconciles across epoch changes, virtualizes long lists, and renders all block kinds."

#### Test Execution
> **Feature File:** [PR-025](pwa/typed-block-transcript.md)
> **Catalog:** [pwa/typed-block-transcript.md](../feature-catalog/pwa/typed-block-transcript.md)

---

## 12. RELEASE (`PR-026..PR-029`)

### PR-026 | Numeric thresholds

#### Description
Verify declared numeric limits for release metrics with machine and operator measurement sources.

#### Scenario Contract
Prompt: "Run the numeric-threshold gate and confirm every metric carries a finite threshold and that a missing machine measurement fails while a missing operator measurement stays pending."

#### Test Execution
> **Feature File:** [PR-026](release/numeric-thresholds.md)
> **Catalog:** [release/numeric-thresholds.md](../feature-catalog/release/numeric-thresholds.md)

---

### PR-027 | Rollback drill

#### Description
Verify an executable drill that exercises authority drain, backup restore, and down-migration on disposable state.

#### Scenario Contract
Prompt: "Run the rollback drill and confirm the kill switch drains authority, the damaged backup restores, and the down-migration preserves session and indeterminate rows."

#### Test Execution
> **Feature File:** [PR-027](release/rollback-drill.md)
> **Catalog:** [release/rollback-drill.md](../feature-catalog/release/rollback-drill.md)

---

### PR-028 | Staged rollout

#### Description
Verify a staged rollout policy that marks stages ready only on complete evidence.

#### Scenario Contract
Prompt: "Run the staged rollout regression and confirm a stage only goes ready once every required evidence claim passes."

#### Test Execution
> **Feature File:** [PR-028](release/staged-rollout.md)
> **Catalog:** [release/staged-rollout.md](../feature-catalog/release/staged-rollout.md)

---

### PR-029 | Whole-gate runner

#### Description
Verify the release verification runner that executes the full gate sequence and writes evidence.

#### Scenario Contract
Prompt: `Run the whole-gate runner regression and confirm the gate sequence runs and no absolute path reaches the evidence document.`

#### Test Execution
> **Feature File:** [PR-029](release/whole-gate-runner.md)
> **Catalog:** [release/whole-gate-runner.md](../feature-catalog/release/whole-gate-runner.md)

---

## 13. MOBILE UI FEATURES (`PR-030..PR-039`)

### PR-030 | Ask Question

#### Description
Verify redacted inline AskQuestionCard renders agent prompts in the transcript's chronological flow with full-row option buttons and optional free text, submitting only via a one-use ticketed mutation.

#### Scenario Contract
Prompt: "Run the ask-question regression and confirm the card renders full-row options, keeps interaction card-local, and only submits through the one-use ticketed mutation."

#### Test Execution
> **Feature File:** [PR-030](mobile-ui-features/ask-question.md)
> **Catalog:** [mobile-ui-features/ask-question.md](../feature-catalog/mobile-ui-features/ask-question.md)

---

### PR-031 | Change Effort

#### Description
Verify lets the operator change the host-confirmed thinking effort through one canonical Model and Effort sheet.

#### Scenario Contract
Prompt: "Run the Change Effort regression and confirm that the Model and Effort sheet replaces the old nested effort Select, requests one fresh ticketed mutation, and stays visually unselected until Pi confirms."

#### Test Execution
> **Feature File:** [PR-031](mobile-ui-features/change-effort.md)
> **Catalog:** [mobile-ui-features/change-effort.md](../feature-catalog/mobile-ui-features/change-effort.md)

---

### PR-032 | Change Model

#### Description
Verify browses the host-confirmed model catalog and stages a model in a bottom sheet, committed only via a one-use ticketed Switch action.

#### Scenario Contract
Prompt: "Run the change-model regression and confirm the ModelSwitcherSheet test passes, so staging stays read-only and the header only updates on a ticketed switch."

#### Test Execution
> **Feature File:** [PR-032](mobile-ui-features/change-model.md)
> **Catalog:** [mobile-ui-features/change-model.md](../feature-catalog/mobile-ui-features/change-model.md)

---

### PR-033 | File Preview

#### Description
Verify a compact in-thread file card that opens a history-backed full-screen read-only viewer for the exact immutable relay-issued snapshot.

#### Scenario Contract
Prompt: `Run the ArtifactViewer regression and confirm the viewer freezes the immutable relay-issued snapshot with typed renderers and explicit missing/concealed/stale/oversized/corrupt states.`

#### Test Execution
> **Feature File:** [PR-033](mobile-ui-features/file-preview.md)
> **Catalog:** [mobile-ui-features/file-preview.md](../feature-catalog/mobile-ui-features/file-preview.md)

---

### PR-034 | Inbound Media

#### Description
Verify pi or an approved host extension surfaces a screenshot or raster image as a promoted, metadata-only inbound_image transcript block backed by the shared F6 artifact store.

#### Scenario Contract
Prompt: "Run the Inbound Media validation and confirm the promoted inbound_image card renders its inline preview, opens the exact immutable revision over read-only no-store reads, and exposes no media actions."

#### Test Execution
> **Feature File:** [PR-034](mobile-ui-features/inbound-media.md)
> **Catalog:** [mobile-ui-features/inbound-media.md](../feature-catalog/mobile-ui-features/inbound-media.md)

---

### PR-035 | Media Upload

#### Description
Verify stage up to four photo previews plus a caption locally, then send them to Pi Remote as validated, sanitized images via revision-bound upload tickets.

#### Scenario Contract
Prompt: `Run the attachment submission test and confirm the named test file passes with 0 failures.`

#### Test Execution
> **Feature File:** [PR-035](mobile-ui-features/media-upload.md)
> **Catalog:** [mobile-ui-features/media-upload.md](../feature-catalog/mobile-ui-features/media-upload.md)

---

### PR-036 | Plan Mode Tab

#### Description
Verify a persistent composer-adjacent control that presents only host-confirmed build/plan mode and atomically executes reviewed plans under a one-use ticket.

#### Scenario Contract
Prompt: `"Run the Plan Mode Tab regression and confirm the button reflects only host-confirmed build/plan mode with no contradictory signals."`

#### Test Execution
> **Feature File:** [PR-036](mobile-ui-features/plan-mode-tab.md)
> **Catalog:** [mobile-ui-features/plan-mode-tab.md](../feature-catalog/mobile-ui-features/plan-mode-tab.md)

---

### PR-037 | Rich Content Blocks

#### Description
Verify renders three typed read-only projections of already-redacted transcript envelopes.

#### Scenario Contract
Prompt: "Run the Rich Content Router regression and confirm all three card types render with bounded previews and correct Copy behavior."

#### Test Execution
> **Feature File:** [PR-037](mobile-ui-features/rich-content-blocks.md)
> **Catalog:** [mobile-ui-features/rich-content-blocks.md](../feature-catalog/mobile-ui-features/rich-content-blocks.md)

---

### PR-038 | Slash Commands

#### Description
Verify typing a leading / in the composer opens a nonmodal autocomplete that inserts a relay-filtered canonical command; Send is the only execution path.

#### Scenario Contract
Prompt: "Run the slash-command regression and confirm that composer autocomplete only inserts relay-filtered canonical command text with Send as the only submission path."

#### Test Execution
> **Feature File:** [PR-038](mobile-ui-features/slash-commands.md)
> **Catalog:** [mobile-ui-features/slash-commands.md](../feature-catalog/mobile-ui-features/slash-commands.md)

---

### PR-039 | Todos

#### Description
Verify a read-only TodoPanel that renders the host's redacted Pi todo plan as an inline, always-visible parchment block.

#### Scenario Contract
Prompt: "Run the TodoPanel regression and confirm the panel renders the redacted todo plan inline, stays visible when surrounding activity collapses, and exposes no checkpoint or mutation controls."

#### Test Execution
> **Feature File:** [PR-039](mobile-ui-features/todos.md)
> **Catalog:** [mobile-ui-features/todos.md](../feature-catalog/mobile-ui-features/todos.md)

---

## 14. DESIGN SYSTEM (`PR-040..PR-043`)

### PR-040 | Component Migration

#### Description
Verify migrates the app's hand-styled components onto semantic, per-surface tokens from the token library so every surface resolves the frozen ink-on-parchment palette through the semantic layer.

#### Scenario Contract
Prompt: "Run the contrast regression and confirm every migrated surface still resolves the semantic palette with no failing contrast checks."

#### Test Execution
> **Feature File:** [PR-040](design-system/component-migration.md)
> **Catalog:** [design-system/component-migration.md](../feature-catalog/design-system/component-migration.md)

---

### PR-041 | Designer Editability

#### Description
Verify audited design-system editability for low-code designer tasks, and the shipped designer guide covering editable seams and hard limits.

#### Scenario Contract
Prompt: "Run the design-system contrast regression and confirm the accessibility pass still holds with 0 failures."

#### Test Execution
> **Feature File:** [PR-041](design-system/designer-editability.md)
> **Catalog:** [design-system/designer-editability.md](../feature-catalog/design-system/designer-editability.md)

---

### PR-042 | sk-code Mobile-CLI Surface

#### Description
Verify read-only sk-code surface that routes app code work to pi-remote-web's design system, carryings its token library, ds-grammar, and guardrails.

#### Scenario Contract
Prompt: `Run the app's web suite and confirm the design-system value-preservation and contrast gate this surface documents passes with 0 failures.`

#### Test Execution
> **Feature File:** [PR-042](design-system/sk-code-mobile-cli-surface.md)
> **Catalog:** [design-system/sk-code-mobile-cli-surface.md](../feature-catalog/design-system/sk-code-mobile-cli-surface.md)

---

### PR-043 | Token Library

#### Description
Verify three-layer design-token library: frozen primitive palette, semantic roles, and per-surface component tokens read at runtime.

#### Scenario Contract
Prompt: `Run the token-library contrast regression and confirm the full test file passes with zero failures.`

#### Test Execution
> **Feature File:** [PR-043](design-system/token-library.md)
> **Catalog:** [design-system/token-library.md](../feature-catalog/design-system/token-library.md)

---

## 15. AUTOMATED TEST CROSS-REFERENCE

| Test Module | Coverage | Playbook Overlap |
|---|---|---|
| `.opencode/skills/sk-code/sk-code-mobile-cli/references/verification.md` | regression/validation | PR-042 |
| `apps/pi-remote-relay/tests/approval.test.ts` | regression/validation | PR-013, PR-014, PR-015, PR-016, PR-017, PR-022 |
| `apps/pi-remote-relay/tests/ask-question.test.ts` | regression/validation | PR-030 |
| `apps/pi-remote-relay/tests/attachments.test.ts` | regression/validation | PR-035 |
| `apps/pi-remote-relay/tests/auth.test.ts` | regression/validation | PR-007, PR-008, PR-009, PR-010, PR-011, PR-012 |
| `apps/pi-remote-relay/tests/authority-loop.test.ts` | regression/validation | PR-018 |
| `apps/pi-remote-relay/tests/commands.test.ts` | regression/validation | PR-038 |
| `apps/pi-remote-relay/tests/inbound-media-publish.test.ts` | regression/validation | PR-034 |
| `apps/pi-remote-relay/tests/integration/recorded-fixture-flow.test.ts` | regression/validation | PR-005, PR-020, PR-025 |
| `apps/pi-remote-relay/tests/kill-points/recovery.test.ts` | regression/validation | PR-002, PR-003, PR-004 |
| `apps/pi-remote-relay/tests/plan-control.test.ts` | regression/validation | PR-036 |
| `apps/pi-remote-relay/tests/prompt.test.ts` | regression/validation | PR-004, PR-020, PR-023 |
| `apps/pi-remote-relay/tests/push.test.ts` | regression/validation | PR-019, PR-021 |
| `apps/pi-remote-relay/tests/redaction.test.ts` | regression/validation | PR-001 |
| `apps/pi-remote-relay/tests/rpc.test.ts` | regression/validation | PR-002, PR-004 |
| `apps/pi-remote-relay/tests/security/negative-controls.test.ts` | regression/validation | PR-001, PR-005, PR-007, PR-008, PR-009, PR-010, PR-011, PR-012, PR-014, PR-015, PR-016, PR-017, PR-021 |
| `apps/pi-remote-relay/tests/store.test.ts` | regression/validation | PR-003, PR-024 |
| `apps/pi-remote-relay/tests/sync.test.ts` | regression/validation | PR-005 |
| `apps/pi-remote-relay/tests/todo-projection.test.ts` | regression/validation | PR-039 |
| `apps/pi-remote-relay/tests/transcript-projector.test.ts` | regression/validation | PR-006 |
| `apps/pi-remote-web/tests/App.test.tsx` | regression/validation | PR-006, PR-019, PR-020, PR-022, PR-023, PR-024, PR-025 |
| `apps/pi-remote-web/tests/ArtifactCard.test.tsx` | regression/validation | PR-033 |
| `apps/pi-remote-web/tests/ArtifactViewer.test.tsx` | regression/validation | PR-033 |
| `apps/pi-remote-web/tests/AttachmentRail.test.tsx` | regression/validation | PR-035 |
| `apps/pi-remote-web/tests/AttachmentSubmission.test.tsx` | regression/validation | PR-035 |
| `apps/pi-remote-web/tests/CodeCard.test.tsx` | regression/validation | PR-037 |
| `apps/pi-remote-web/tests/CommandOutputCard.test.tsx` | regression/validation | PR-037 |
| `apps/pi-remote-web/tests/ComposerCommandAutocomplete.test.tsx` | regression/validation | PR-038 |
| `apps/pi-remote-web/tests/EffortRadioGroup.test.tsx` | regression/validation | PR-031 |
| `apps/pi-remote-web/tests/InboundImageCard.test.tsx` | regression/validation | PR-034 |
| `apps/pi-remote-web/tests/ModelSwitcherSheet.test.tsx` | regression/validation | PR-032 |
| `apps/pi-remote-web/tests/PlanModeButton.test.tsx` | regression/validation | PR-036 |
| `apps/pi-remote-web/tests/RichContentRouter.test.tsx` | regression/validation | PR-037 |
| `apps/pi-remote-web/tests/SessionHeader.test.tsx` | regression/validation | PR-032 |
| `apps/pi-remote-web/tests/TodoPanel.test.tsx` | regression/validation | PR-039 |
| `apps/pi-remote-web/tests/ask-question-card.test.tsx` | regression/validation | PR-030 |
| `apps/pi-remote-web/tests/contrast.test.tsx` | regression/validation | PR-040, PR-041, PR-043 |
| `apps/pi-remote-web/tests/effort-sheet-a11y.test.tsx` | regression/validation | PR-031 |
| `apps/pi-remote-web/tests/inbound-image-states.test.tsx` | regression/validation | PR-034 |
| `apps/pi-remote-web/tests/model-catalog.test.ts` | regression/validation | PR-032 |
| `apps/pi-remote-web/tests/runtime-issues.test.ts` | regression/validation | PR-031 |
| `apps/pi-remote-web/tests/submitSlashDraft.test.ts` | regression/validation | PR-038 |
| `apps/pi-remote-web/tests/todo-state.test.ts` | regression/validation | PR-039 |
| `apps/pi-remote-web/tests/useArtifactResource.test.ts` | regression/validation | PR-033 |
| `apps/pi-remote-web/tests/usePlanModeShortcut.test.tsx` | regression/validation | PR-036 |
| `extensions/pi-remote-approval/tests/final-boundary.test.ts` | regression/validation | PR-018 |
| `packages/pi-rpc-protocol/tests/ask-question.test.ts` | regression/validation | PR-030 |
| `tests/rollback-drill.test.ts` | regression/validation | PR-003, PR-017, PR-027, PR-029 |
| `tests/rollout-gate.test.mjs` | regression/validation | PR-028, PR-029 |
| `tests/threshold-gate.test.mjs` | regression/validation | PR-026, PR-029 |

---

## 16. FEATURE CATALOG CROSS-REFERENCE INDEX

| Feature ID | Feature Name | Category | Feature File |
|---|---|---|---|
| PR-001 | Canonical redaction | TRANSPORT AND STATE | [PR-001](transport-and-state/canonical-redaction.md) |
| PR-002 | LF JSONL framing and demux | TRANSPORT AND STATE | [PR-002](transport-and-state/lf-jsonl-framing-and-demux.md) |
| PR-003 | Redacted durable ledger | TRANSPORT AND STATE | [PR-003](transport-and-state/redacted-durable-ledger.md) |
| PR-004 | RPC supervision | TRANSPORT AND STATE | [PR-004](transport-and-state/rpc-supervision.md) |
| PR-005 | Sync and replay barrier | TRANSPORT AND STATE | [PR-005](transport-and-state/sync-replay-barrier.md) |
| PR-006 | Transcript projection | TRANSPORT AND STATE | [PR-006](transport-and-state/transcript-projection.md) |
| PR-007 | Application sessions | AUTH AND BOUNDARY | [PR-007](auth-and-boundary/application-sessions.md) |
| PR-008 | Default-deny authorization | AUTH AND BOUNDARY | [PR-008](auth-and-boundary/default-deny-authorization.md) |
| PR-009 | Device enrollment | AUTH AND BOUNDARY | [PR-009](auth-and-boundary/device-enrollment.md) |
| PR-010 | One-use tickets | AUTH AND BOUNDARY | [PR-010](auth-and-boundary/one-use-tickets.md) |
| PR-011 | Revocation | AUTH AND BOUNDARY | [PR-011](auth-and-boundary/revocation.md) |
| PR-012 | Serve-identity anchor | AUTH AND BOUNDARY | [PR-012](auth-and-boundary/serve-identity-anchor.md) |
| PR-013 | Accept-edits grants | APPROVAL AND MUTATION | [PR-013](approval-and-mutation/accept-edits-grants.md) |
| PR-014 | CAS decision settle | APPROVAL AND MUTATION | [PR-014](approval-and-mutation/cas-decision-settle.md) |
| PR-015 | Exact-action leases | APPROVAL AND MUTATION | [PR-015](approval-and-mutation/exact-action-leases.md) |
| PR-016 | Final-gate digest | APPROVAL AND MUTATION | [PR-016](approval-and-mutation/final-gate-digest.md) |
| PR-017 | Kill switch | APPROVAL AND MUTATION | [PR-017](approval-and-mutation/kill-switch.md) |
| PR-018 | Mutation containment | APPROVAL AND MUTATION | [PR-018](approval-and-mutation/mutation-containment.md) |
| PR-019 | Attention inbox | COMMAND AND PUSH | [PR-019](command-and-push/attention-inbox.md) |
| PR-020 | Prompt steering transport | COMMAND AND PUSH | [PR-020](command-and-push/prompt-steering-transport.md) |
| PR-021 | VAPID content-free push | COMMAND AND PUSH | [PR-021](command-and-push/vapid-content-free-push.md) |
| PR-022 | Approval card | PWA | [PR-022](pwa/approval-card.md) |
| PR-023 | Compose box | PWA | [PR-023](pwa/compose-box.md) |
| PR-024 | Session list | PWA | [PR-024](pwa/session-list.md) |
| PR-025 | Typed-block transcript | PWA | [PR-025](pwa/typed-block-transcript.md) |
| PR-026 | Numeric thresholds | RELEASE | [PR-026](release/numeric-thresholds.md) |
| PR-027 | Rollback drill | RELEASE | [PR-027](release/rollback-drill.md) |
| PR-028 | Staged rollout | RELEASE | [PR-028](release/staged-rollout.md) |
| PR-029 | Whole-gate runner | RELEASE | [PR-029](release/whole-gate-runner.md) |
| PR-030 | Ask Question | MOBILE UI FEATURES | [PR-030](mobile-ui-features/ask-question.md) |
| PR-031 | Change Effort | MOBILE UI FEATURES | [PR-031](mobile-ui-features/change-effort.md) |
| PR-032 | Change Model | MOBILE UI FEATURES | [PR-032](mobile-ui-features/change-model.md) |
| PR-033 | File Preview | MOBILE UI FEATURES | [PR-033](mobile-ui-features/file-preview.md) |
| PR-034 | Inbound Media | MOBILE UI FEATURES | [PR-034](mobile-ui-features/inbound-media.md) |
| PR-035 | Media Upload | MOBILE UI FEATURES | [PR-035](mobile-ui-features/media-upload.md) |
| PR-036 | Plan Mode Tab | MOBILE UI FEATURES | [PR-036](mobile-ui-features/plan-mode-tab.md) |
| PR-037 | Rich Content Blocks | MOBILE UI FEATURES | [PR-037](mobile-ui-features/rich-content-blocks.md) |
| PR-038 | Slash Commands | MOBILE UI FEATURES | [PR-038](mobile-ui-features/slash-commands.md) |
| PR-039 | Todos | MOBILE UI FEATURES | [PR-039](mobile-ui-features/todos.md) |
| PR-040 | Component Migration | DESIGN SYSTEM | [PR-040](design-system/component-migration.md) |
| PR-041 | Designer Editability | DESIGN SYSTEM | [PR-041](design-system/designer-editability.md) |
| PR-042 | sk-code Mobile-CLI Surface | DESIGN SYSTEM | [PR-042](design-system/sk-code-mobile-cli-surface.md) |
| PR-043 | Token Library | DESIGN SYSTEM | [PR-043](design-system/token-library.md) |
