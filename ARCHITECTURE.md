---
title: Pi Remote System Architecture
description: Reference architecture for the Pi Remote loopback relay, wire protocol package, installable PWA, and pinned approval extension.
trigger_phrases:
  - 'pi remote system architecture'
  - 'mutation authority loop'
  - 'typed event envelope'
  - 'sync replay barrier'
  - 'redaction containment boundaries'
  - 'approval lease consume'
  - 'loopback relay components'
  - 'validation checkpoints'
importance_tier: normal
contextType: general
version: 1.0.0.0
---

# Pi Remote System Architecture

Reference architecture for the Pi Remote app as built, covering four components, one typed event envelope, a default-deny mutation authority loop, and the sync replay barrier. The document is current behavior only and names exact modules, types, and functions.

---

## 1. OVERVIEW

### Purpose

Document the whole Pi Remote system so that a reader can trace any durable event from a Pi RPC child through redaction, persistence, replay, and phone delivery, and can trace any protected tool call through the approval loop to execution.

### When to Use

- Trace one approval from a Pi tool call to execution under the final gate
- Diagnose a replay gap, an epoch change, or a cursor failure in the sync barrier
- Change the wire contract in packages/pi-rpc-protocol
- Prepare operator evidence for the rollout stages in release/rollout.json

### Core Principle

The relay persists only redacted envelopes before it broadcasts anything, and mutation authority is default-deny until a phone decision settles a one-use lease.

### Key Sources

- app-relay/src/index.ts (`runRelay`, `publishPiEvent`, `bindPushNotifications`, `mutationPiArguments`)
- packages/pi-rpc-protocol/src/types.ts (`Envelope`, `SyncMessage`, `ApprovalAction`, `ApprovalDecisionCommand`)
- app-relay/src/store/relay-store.ts (`appendEnvelope`, `createSyncPlan`)
- app-relay/src/replay/sync.ts (`SyncHub.publish`, `SyncHub.subscribe`)
- app-relay/src/store/redaction.ts (`redactEnvelope`)
- app-relay/src/approval/approval-service.ts (`request`, `decide`, `consume`)
- app-relay/src/approval/final-gate.ts (`verifyFinalGate`)
- app-relay/src/http/server.ts (`startReadOnlyServer`, `handleExtensionAuthority`)
- extensions/pi-remote-approval/src/index.ts (`createFinalBoundaryHandler`, `createRelayLeaseAuthorizer`)
- app-mobile/src/shared/data/state.ts (`transcriptReducer`), app-mobile/src/shared/data/relay.ts, app-mobile/src/shared/data/cache.ts
- deploy/containment/pi-remote.sb
- docs/security.md, docs/release-verification.md, docs/setup.md

### Prerequisites

- Follow docs/security.md for the four posture boundaries and the approval contracts
- Follow docs/release-verification.md for the machine gates and operator evidence rules
- Follow docs/setup.md for the Tailscale Serve deployment shape and the pinned live Pi version

---

## 2. COMPONENTS AND RUNTIME SHAPE

### The Four Components

| Component                 | Location                      | Role                                                                                                                                                   |
| ------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Loopback relay            | app-relay          | Owns one Pi RPC child, the SQLite redacted ledger, the loopback API, approval leases, push delivery, and prompt steering                               |
| Wire protocol package     | packages/pi-rpc-protocol      | Shared TypeScript contract for commands, events, browser DTOs, approval actions, sync messages, and runtime guards                                     |
| Installable PWA           | app-mobile            | Enrollment, opaque session catalog, typed transcript rendering, exact-action review UI, Attention Inbox, push preferences, and a stale read-only cache |
| Pinned approval extension | extensions/pi-remote-approval | Final protected-tool boundary inside the Pi process, requests and consumes leases over a per-process loopback channel                                  |

### Runtime Zone Diagram

```text
Phone PWA (app-mobile)
  | HTTPS / WSS through Tailscale Serve, secret-prefixed path
  v
Loopback relay (127.0.0.1, app-relay)
  | SQLite redacted ledger (WAL, numbered migrations)
  | strict LF-delimited JSONL over stdin and stdout
  v
One owned Pi RPC child (pi --mode rpc --no-session)
```

The deployment script serves the built PWA from a second loopback process on `127.0.0.1:4173`. The browser never receives the secret relay path prefix used by Serve.

### Connection Facts

- `runRelay` constructs `RelayStore`, `SessionCatalog`, `SyncHub`, `PushService`, `MutationPolicy`, `ApprovalService`, `RpcSupervisor`, `PromptService`, and `TranscriptProjector` in dependency order
- `RpcSupervisor` owns exactly one Pi child. The default launch uses `--mode rpc --no-session --no-tools --no-extensions` (fail-closed steering only). An allowlisted mutation family replaces that argument set, and the operator-only full-access posture (`PI_REMOTE_FULL_ACCESS=1`) instead launches `--mode rpc --no-session --approve` with every built-in tool and no approval extension. Only the host selects full access; the phone can never enable it
- `startReadOnlyServer` binds IPv4 loopback only and rejects a non-loopback bind
- `deploy/setup-tailscale-serve.sh` starts the relay on `127.0.0.1:4310` and the PWA preview on `127.0.0.1:4173`. It routes `/` to the preview and routes `/api` plus `/health` to the relay through the secret prefix
- `StrictJsonlDecoder` decodes Pi stdout as UTF-8 JSONL with LF-only delimiters and a one-megabyte record limit. `RpcDemultiplexer` correlates responses by request id while asynchronous Pi events are delivered independently. `supervisor.send` serializes writes to Pi stdin

---

## 3. WIRE PROTOCOL AND EVENT ENVELOPE

### The Protocol Package

- `PROTOCOL_VERSION` is `1`
- Guards such as `isEnvelope`, `isSyncMessage`, `isApprovalDecisionCommand`, `isApprovalAuthorityRequest`, and `isPromptSubmitCommand` narrow untrusted wire values before any consumer uses them
- `approval.ts` provides `canonicalizeJson`, `canonicalizeApprovalAction`, `approvalActionDigest`, and `sha256`. The SHA-256 implementation is browser-safe and does not depend on a host crypto module
- `auth.ts` provides `enrollmentProof` and `sessionProof` for the byte-stable device proof statements

### The Typed Event Envelope

Every durable or synchronized event uses protocol version `1` and this envelope:

| Field                                 | Meaning                                                                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `v`                                   | Envelope version, fixed at 1                                                                                                        |
| `eventId`                             | Opaque deduplication identifier                                                                                                     |
| `kind`                                | Typed event name, for example `pi.agent_start`, `transcript.block`, `approval.requested`, `approval.result`, or `attention.changed` |
| `hostId`, `workspaceRef`, `sessionId` | Server-owned opaque stream identity                                                                                                 |
| `epoch`                               | Restart generation, opaque, must begin at sequence 1                                                                                |
| `seq`                                 | Strictly increasing per-epoch sequence                                                                                              |
| `occurredAt`                          | ISO timestamp                                                                                                                       |
| `causedBy`                            | Optional opaque causal identifier                                                                                                   |
| `payload`                             | Typed JSON payload                                                                                                                  |
| `redaction`                           | `policyVersion`, `fieldsRedacted`, and sorted `reasons`                                                                             |
| `replay`                              | `eligible` and `snapshotEligible` flags                                                                                             |

The runtime entrypoint uses the fixed identities `host_local`, `workspace_default`, and `session_local`. It is not a multi-host or arbitrary Pi-session browser.

### Framing And Correlation

```markdown
IF a stdout record is a PiRpcResponse:
→ resolve the pending request with the matching id
→ an unknown or missing id is a protocol error

IF a stdout record is a PiRpcEvent:
→ deliver to event listeners without correlation

OTHERWISE:
→ report a protocol error and reject every pending response
```

---

## 4. MUTATION AUTHORITY LOOP

### Default-Deny Kill Switch

`MutationPolicy.isAllowed` returns false until `setEnabled(true)` runs. The entrypoint enables it only when `PI_REMOTE_MUTATION_ENABLED=1` and `PI_REMOTE_MUTATION_FAMILY` selects exactly one implemented family.

| Family       | Protected tool names |
| ------------ | -------------------- |
| `filesystem` | `edit`, `write`      |
| `process`    | `bash`               |
| `network`    | `fetch`              |

```markdown
IF mutation is off:
→ the relay starts Pi with --no-tools --no-extensions
→ no extension authority secret exists
→ /api/extension/approval/request and /api/extension/approval/consume stay unavailable

IF mutation is on with one valid family:
→ the relay starts Pi with read, grep, find, ls plus the family tools
→ it loads extensions/pi-remote-approval/dist/index.js by explicit path
→ it passes a random per-process capability only to the owned Pi child
→ it exposes the two authority endpoints on the IPv4 loopback listener only

IF full access is selected by the host (--full-access / PI_REMOTE_FULL_ACCESS=1):
→ the relay starts Pi with --mode rpc --no-session --approve and every built-in tool
→ no approval extension loads and no per-action gate applies (desktop parity)
→ mutation stays off, so no extension authority secret exists
→ only the host can select this; the phone can never enable it
```

Disabling the switch or changing the family emits a reason through `MutationPolicy.onDisable`. `ApprovalService` revokes pending and approved leases, marks grants revoked, and aborts tracked in-flight work through their `AbortSignal`.

### The Authority Loop

```text
Pi tool call
  → extension final boundary handler (createFinalBoundaryHandler)
  → approvalActionDigest over the canonical action
  → authorizer.request POST /api/extension/approval/request (Bearer capability)
  → handleExtensionAuthority validates capability, principal, session, epoch, policy version, digest
  → ApprovalService.request creates a durable approval_leases row with status pending
  → approval.requested event via SyncHub
  → bindPushNotifications publishes attention.changed and a content-free push hint
  → phone review UI sends approval.decide to /api/approval/decide
  → ApprovalService.decide settles with a compare-and-swap on status plus revision
  → extension polls consume every 50 ms
  → ApprovalService.consume runs verifyFinalGate and marks the lease consumed
  → one-shot authority returns, Pi executes under deploy/containment/pi-remote.sb
```

Step by step in the current code:

1. Pi reaches a protected tool call and the extension final boundary handler runs
2. `createFinalBoundaryHandler` rebuilds the `ApprovalAction` from the final tool name and input and computes `approvalActionDigest`
3. `authorizer.request` POSTs the action and digest to `/api/extension/approval/request` with the Bearer capability and a two-second timeout
4. `handleExtensionAuthority` checks the capability with `timingSafeEqual`, checks principal, session, epoch, and policy version through `matchesAuthorityAction`, and verifies `body.digest === approvalActionDigest(body.action)`
5. `ApprovalService.request` rejects revoked principals and disabled families, then `createLease` inserts a durable `approval_leases` row with status `pending` and publishes the `approval.requested` event with redacted canonical arguments
6. `bindPushNotifications` publishes `attention.changed` with class `needs_input` and the push service sends a content-free hint to non-foreground devices
7. The phone shows the exact-action review UI and POSTs an `approval.decide` command to `/api/approval/decide`
8. `ApprovalService.decide` settles the lease with `UPDATE ... WHERE approval_id = ? AND status = 'pending' AND revision = ?`. One racing decision wins and the idempotency key rejects replay
9. The extension polls `consume` while the lease is pending. `ApprovalService.consume` runs `verifyFinalGate` and marks the lease `consumed` before returning authority
10. The handler returns `undefined` and Pi executes the tool under the macOS sandbox profile

### The Final Gate

`verifyFinalGate` recomputes the digest from the live action and checks in this order:

```markdown
IF policy.isAllowed(tool) is false: → deny policy-disabled
IF lease status is restart-invalidated: → deny restart-invalidated
IF lease status is revoked: → deny revoked
IF lease status is consumed: → deny duplicate
IF lease status is not approved: → deny not-approved
IF expiresAt is in the past: → deny expired
IF action or lease epoch differs from current: → deny stale-epoch
IF principal differs: → deny principal-mismatch
IF session differs: → deny session-mismatch
IF policy version differs: → deny policy-version-mismatch
IF recomputed digest differs from the lease: → deny digest-mismatch
OTHERWISE: → allow with the digest
```

Successful consumption arms an `AbortSignal` that fires on `lease-expired`. `ApprovalService.revoke` aborts the tracked in-flight execution, and `ApprovalService.finish` aborts when the caller reports execution settled. Relay loss, denial, expiry, malformed responses, and final-gate failure all block the tool.

### Accept-Edits Grants

`createAcceptEditsGrant` binds one principal, session, epoch, explicit enabled tool list, at most `MAX_GRANT_ACTIONS` (10) actions, and at most `MAX_GRANT_TTL_MS` (10 minutes). Every action still creates and consumes its own exact-action lease through `requestFromGrant`. A prior denial of the same exact action takes precedence through `hasDeniedExactAction`.

---

## 5. SYNC AND REPLAY BARRIER

### Subscription Flow

1. The PWA calls `establishSession` and POSTs `/api/auth/ticket` for a one-use ticket with a 20-second lifetime
2. It opens `/api/sync` over WebSocket and sends one `subscribe` message with the session id and an optional cursor
3. `SyncHub.subscribe` asks `store.createSyncPlan` for a plan frozen at one committed high-water barrier
4. The plan messages are sent, then only queued live envelopes above the barrier are released in sequence order

### Barrier Decision Logic

```markdown
IF the stream has no state:
→ send sync.gap with reason unknown-session only

IF no cursor is provided:
→ send sync.snapshot through the barrier

IF the cursor epoch differs from the current epoch:
→ send sync.gap with reason epoch, then an authoritative snapshot

IF the cursor seq is below the retention floor:
→ send sync.gap with reason retention, then an authoritative snapshot

IF the cursor seq is above the high-water:
→ send sync.gap with reason ahead, then an authoritative snapshot

OTHERWISE:
→ send sync.delta strictly after the cursor through the barrier
```

Events committed while the initial plan is sent are queued on the subscription. After the snapshot or replay completes, only queued envelopes with `seq` above the barrier are released in ascending sequence order.

### Persist Before Broadcast

`SyncHub.publish` calls `store.appendEnvelope` first. `appendEnvelope` validates with `isEnvelope`, runs `redactEnvelope`, and commits inside one transaction before any subscriber is notified. `findDuplicate` suppresses an envelope whose `eventId` or whose stream sequence already exists. Every sequence must equal `highSeq + 1`. A new epoch must begin at sequence 1 and an ended epoch cannot be reused.

The ledger keeps the newest 1,000 envelopes per stream epoch by default and records `floor_seq` as the oldest replayable sequence. The session catalog stores only opaque session id, coarse status, update time, and message count.

### The PWA Side

`transcriptReducer` applies these rules:

```markdown
IF a sync.gap arrives:
→ reset to EMPTY_TRANSCRIPT
→ set awaitingSnapshot when the reason is not unknown-session

IF a delta arrives while awaitingSnapshot:
→ ignore the delta

IF a delta carries a different epoch:
→ reset and wait for an authoritative snapshot

IF a snapshot arrives:
→ replace blocks from the envelope list and clear awaitingSnapshot
```

`normalizeBlocks` keeps the highest revision per block id and sorts by sequence. The stale read-only cache in `cache.ts` retains at most eight transcripts, 500 blocks per transcript, for seven days, and is always marked stale when the relay is not live.

---

## 6. REDACTION AND CONTAINMENT

### The Canonical Redaction Pass

`redactEnvelope` is the only redaction allowed before persistence or broadcast. Policy version 1 replaces:

| Trigger                                                                            | Replacement               |
| ---------------------------------------------------------------------------------- | ------------------------- |
| `PATH_KEYS` (`cwd`, `fulloutputpath`, `path`, `sessionfile`, `workspacepath`)      | `[REDACTED_PATH]`         |
| `SECRET_KEYS` (`apikey`, `authorization`, `cookie`, `password`, `secret`, `token`) | `[REDACTED_SECRET]`       |
| `PRIVATE_TEXT_KEYS` (`prompt`)                                                     | `[REDACTED_PRIVATE_TEXT]` |
| `SECRET_ASSIGNMENT_PATTERN`, `BEARER_PATTERN`, `TOKEN_PATTERN`                     | `[REDACTED_SECRET]`       |
| `POSIX_PATH_PATTERN`, `WINDOWS_PATH_PATTERN`                                       | `[REDACTED_PATH]`         |

The pass records `policyVersion`, `fieldsRedacted`, and sorted `reasons`. Only the resulting envelope reaches SQLite, replay, snapshots, or live subscribers. Approval cards carry redacted canonical arguments. Push subscriptions are encrypted with AES-256-GCM before SQLite storage. Push hints contain exactly `lookupId` and `attentionClass`.

```text
Pi event → envelope candidate
  → redactEnvelope (policy version 1)
  → appendEnvelope transaction (dedup, sequence, retention floor)
  → broadcast to live subscribers and committed listeners only
```

### Containment Profile

`deploy/containment/pi-remote.sb` is a macOS `sandbox-exec` profile with default deny, workspace-scoped file access, denied network access, denied home and host writes, and a pinned runner executable. The production relay entrypoint does not invoke it. Loading the built extension in a live Pi, proving handler order, and running the escape suite remain operator-verified boundaries.

### The Four Posture Boundaries

| Boundary             | Current behavior                                                                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loopback             | The relay and PWA preview bind to IPv4 `127.0.0.1` only                                                                                                                                         |
| Tailnet-only Serve   | `deploy/setup-tailscale-serve.sh` disables Funnel and uses private HTTPS and WSS Serve routes with a secret-prefixed path                                                                       |
| Foreground authority | Authority comes from a current device proof, a short application session, the exact Tailscale principal, the exact Origin, and one-use action state. Push and cached content carry no authority |
| Redaction            | Redaction runs before persistence and broadcast, and push carries only an opaque lookup id plus one bounded attention class                                                                     |

---

## 7. DATA FLOWS

### Read-Only Streaming Flow

```text
┌──────────┐   ticket + subscribe    ┌─────────────────────┐
│ PWA      │ ──────────────────────► │ /api/sync WebSocket │
│ relay.ts │ ◄────────────────────── │ SyncHub.subscribe   │
└──────────┘  sync.snapshot / delta  └──────────┬──────────┘
                / sync.gap                      │ createSyncPlan
                                                ▼
                                        ┌─────────────────────┐
                                        │ RelayStore          │
                                        │ appendEnvelope      │
                                        │ SQLite redacted     │
                                        │ ledger              │
                                        └─────────────────────┘
```

### Prompt Steering Flow

```text
PWA ── ticket ──► /api/prompt/submit (default-deny prompt:submit)
                      │ PromptService.submit
                      ▼
              supervisor.send({"type":"prompt", ..., "streamingBehavior":"steer"})
                      │ one LF-framed write to the owned child
                      ▼
              Pi child (--no-tools --no-extensions, steering slice only)
                      │ ack
                      ▼
              TranscriptProjector.projectSubmittedPrompt
                      │ redact → persist → broadcast (transcript.block)
                      ▼
              PWA receives the user block
```

The prompt command itself is never persisted or replayed. Only the projected user transcript block enters the redact, persist, then broadcast pipeline.

### Approval Flow

```text
┌─────────────┐  tool_call   ┌──────────────────────────┐
│ Pi child    │ ───────────► │ createFinalBoundaryHandler│
└──────▲──────┘              └────────────┬─────────────┘
       │                                  │ request + digest
       │                                  ▼
       │                    ┌──────────────────────────┐
       │                    │ handleExtensionAuthority │
       │                    └────────────┬─────────────┘
       │                                  │ ApprovalService.request
       │                                  ▼
       │                    ┌──────────────────────────┐
       │                    │ approval_leases pending  │
       │                    │ approval.requested event │
       │                    └────────────┬─────────────┘
       │                                  │ SyncHub broadcast
       │                                  ▼
       │                    ┌──────────────────────────┐
       │  consume poll      │ phone push hint          │
       └────────────────────┤ /api/approval/decide     │
                            │ CAS settle → approved    │
                            └────────────┬─────────────┘
                                         │ verifyFinalGate
                                         ▼
                            ┌──────────────────────────┐
                            │ consumed → one-shot      │
                            │ authority → execute      │
                            └──────────────────────────┘
```

### Push Flow

```text
approval.requested or pi event
  → bindPushNotifications / attentionClassFor
  → attention.changed event
  → PushService.publish
  → attention_items row (subscriptions encrypted with AES-256-GCM)
  → Web Push hint { lookupId, attentionClass }
  → notification click on the phone
  → PWA /attention/<lookupId> → openAttentionHint → fresh authenticated fetch
```

---

## 8. VALIDATION CHECKPOINTS

### Machine Gates

Run from the Pi Remote app directory.

| Checkpoint          | Command                      | Pass condition                                                                                                                |
| ------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `typecheck_passes`  | `npm run typecheck`          | exits 0 across the protocol, relay, web, and extension workspaces                                                             |
| `tests_pass`        | `npm test`                   | exits 0 for the protocol, relay, extension, and root suites                                                                   |
| `web_tests_pass`    | `npm run test:web`           | exits 0 with the jsdom configuration                                                                                          |
| `build_passes`      | `npm run build`              | exits 0 in dependency order                                                                                                   |
| `whole_gate_passes` | `npm run release:verify`     | writes `release/evidence/release-verify-v1-<timestamp>.json` and reports `machineStatus` PASS                                 |
| `thresholds_pass`   | `npm run release:thresholds` | enforces `replaySnapshotBytes`, `storageGrowthBytes`, `restartRecoveryMs`, and `bundleGzipBytes` from release/thresholds.json |
| `rollout_readiness` | `npm run release:rollout`    | evaluates stages `read-only`, `protected-mutation`, and `optional-push` against release/rollout.json                          |

### Gate Decision Logic

```markdown
IF every runnable gate exits 0 AND rollout.machineStatus is PASS:
→ release:verify reports machineStatus PASS

IF any runnable gate exits non-zero:
→ release:verify exits non-zero

IF operator evidence is missing for a stage:
→ that stage stays NOT-READY and availability stays false

IF a protected-mutation claim requires live extension ordering:
→ machine evidence cannot satisfy it, operator evidence decides
```

### Operator-Verified Boundaries

The machine suite cannot prove:

- Live extension loading and final handler order on the pinned Pi version
- Actual protected tool execution inside `deploy/containment/pi-remote.sb`
- Tailscale Serve identity and Funnel absence on the target tailnet
- Physical device push delivery

Each of these is a separate evidence row in release/rollout.json. `npm run release:verify -- --measurements <relative-file> --operator-evidence <relative-file>` accepts schema-versioned operator measurements and evidence.

---

## 9. REFERENCES AND RELATED RESOURCES

- docs/security.md: Posture boundaries, exact-action approval, kill switch, containment, and redaction detail
- docs/release-verification.md: Machine gates, numeric thresholds, stage readiness, and rollback evidence
- docs/setup.md: Tailscale Serve deployment, phone enrollment, and the pinned live Pi version
- docs/operations.md: Runtime operations
- docs/incident-playbooks.md: Recovery procedures
- docs/platform-support.md: Notification and offline limits
- release/rollout.json: Stage definitions and kill switches
- release/thresholds.json: Numeric threshold authority
- deploy/containment/pi-remote.sb: macOS sandbox-exec containment profile
