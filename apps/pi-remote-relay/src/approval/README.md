---
title: 'approval: one-decision mutation leases and grants'
description: 'Owns exact-action approval leases, CAS settlement and accept-edits grants for the Pi Remote relay.'
trigger_phrases:
  - approval service
  - final gate
  - accept-edits grant
  - mutation lease
---

# approval: One-Decision Mutation Leases and Grants

---

## 1. OVERVIEW

`approval/` owns one-decision approval state and one-shot execution authority for mutation commands. `ApprovalService` persists leases in SQLite through `RelayStore`, publishes `approval.requested` and `approval.result` envelopes on `SyncHub`, and checks every execution against `MutationPolicy`.

Current state:

- `request()` creates a pending lease with a canonical action digest, default TTL of 60 seconds
- `decide()` settles a lease with a compare-and-swap UPDATE that requires `status = 'pending'` and the exact `revision`
- `consume()` runs `verifyFinalGate`, then marks the lease `consumed`, so one lease authorizes one execution
- `accept_edits_grants` bound to 10 actions and 10 minutes maximum
- relay restart invalidates every outstanding lease and active grant
- `MutationPolicy` disable revokes all leases and aborts in-flight executions

---

## 2. ARCHITECTURE

```text
╭──────────────────────────────────────────────────────────────────╮
│                         [APPROVAL]                                │
╰──────────────────────────────────────────────────────────────────╯

┌──────────────┐     ┌───────────────────┐     ┌──────────────────┐
│ Extension    │ ──▶ │ ApprovalService   │ ──▶ │ RelayStore       │
│ HTTP server  │     │ leases + grants   │     │ SQLite tables    │
└──────┬───────┘     └────────┬──────────┘     └──────────────────┘
       │                      │
       │                      ▼
       │              ┌───────────────┐
       │              │ SyncHub       │  approval.requested
       └─────────────▶│ publish       │  approval.result
                      └───────────────┘

Consume path:
consume() ──▶ verifyFinalGate ──▶ CAS consumed UPDATE ──▶ AbortSignal
```

Dependency direction:

```text
approval-service.ts ──▶ final-gate.ts
approval-service.ts ──▶ policy/mutation-policy.ts (read only)
approval-service.ts ──▶ replay/sync.ts (publish)
approval-service.ts ──▶ store/relay-store.ts (database handle)
```

`final-gate.ts` imports no sibling module and mutates no state.

---

## 3. KEY FILES

| File                  | Responsibility                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `approval-service.ts` | Leases, grants, CAS settlement, expiry, revocation, audit rows, in-flight abort signals                      |
| `final-gate.ts`       | Pure `verifyFinalGate` that recomputes the action digest and checks epoch, policy version, expiry and status |

---

## 4. BOUNDARIES AND FLOW

| Boundary    | Rule                                                                             |
| ----------- | -------------------------------------------------------------------------------- |
| Persistence | `approval_leases`, `accept_edits_grants`, `approval_audit` in the store database |
| Policy      | Every request and every consume checks `policy.isAllowed(tool)`                  |
| Identity    | Principal references are stored as SHA-256 hashes, never raw device IDs          |
| Publish     | Only `approval.requested` and `approval.result` envelopes leave this folder      |

Main flow:

```text
request() ──▶ lease pending with digest
decide()   ──▶ CAS approve or deny, revision guarded
consume()  ──▶ verifyFinalGate recomputes digest
           ──▶ status consumed, AbortSignal returned
finish()   ──▶ aborts the signal after execution settles
```

Exact-action matching is enforced twice. `approvalActionDigest` hashes the canonical action at request time and `verifyFinalGate` recomputes it at consume time, so the executed action must equal the approved action. A denied lease with the same tool and digest in the same epoch also blocks later accept-edits requests.

---

## 5. ENTRYPOINTS

| Entrypoint                               | Type     | Purpose                                             |
| ---------------------------------------- | -------- | --------------------------------------------------- |
| `ApprovalService.request`                | Method   | Create a pending explicit lease                     |
| `ApprovalService.decide`                 | Method   | Settle a lease from a device decision command       |
| `ApprovalService.consume`                | Method   | One-shot execution authority with abort signal      |
| `ApprovalService.createAcceptEditsGrant` | Method   | Bounded grant with tool allowlist and action budget |
| `verifyFinalGate`                        | Function | Pure final-boundary digest and state check          |

---

## 6. VALIDATION

Run from the Pi Mobile repository root.

```bash
npx vitest run apps/pi-remote-relay/tests/approval.test.ts
```

Expected result: all approval lease, grant and kill-switch cases pass.
