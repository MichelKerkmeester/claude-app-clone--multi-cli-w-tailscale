---
title: 'policy: default-off mutation kill switch'
description: 'Owns the default-off mutation policy and the exactly-one enabled command family.'
trigger_phrases:
  - mutation policy
  - kill switch
  - command family
  - mutation enabled
---

# policy: Default-Off Mutation Kill Switch

---

## 1. OVERVIEW

`policy/mutation-policy.ts` owns the default-deny mutation policy. `MutationPolicy` starts disabled, so no mutation tool passes until the relay enables it. It keeps exactly one command family enabled at a time, and every disable transition notifies subscribers.

Current state:

- `enabled` defaults to `false`, `isAllowed` returns `false` for every tool while disabled
- `setEnabled(false)` emits a `kill-switch` reason to all listeners
- `enableFamily` clears all families, then adds the new one, so at most one family is active
- `disableFamily` removes a family and emits `family-disabled`
- `status()` returns `{ enabled, family }`
- `ApprovalService` subscribes with `onDisable` and revokes all leases and grants on any disable

---

## 2. ARCHITECTURE

```text
╭──────────────────────────────────────────────────────────────────╮
│                         [POLICY]                                  │
╰──────────────────────────────────────────────────────────────────╯

┌──────────────────┐      ┌────────────────────┐      ┌────────────┐
│ index.ts         │ ───▶ │ MutationPolicy     │ ───▶ │ Approval  │
│ env wiring       │      │ enabled flag       │      │ Service   │
│                   │      │ family set         │      │ revokeAll │
└──────────────────┘      └─────────┬──────────┘      └────────────┘
                                    │
                                    ▼
                            ┌───────────────┐
                            │ FAMILY_TOOLS  │
                            │ tool check    │
                            └───────────────┘
```

Dependency direction:

```text
index.ts ──▶ mutation-policy.ts
approval/approval-service.ts ──▶ mutation-policy.ts (read only)
mutation-policy.ts ──▶ no sibling imports
```

The policy has no knowledge of the HTTP layer or the database.

---

## 3. KEY FILES

| File                 | Responsibility                                    |
| -------------------- | ------------------------------------------------- |
| `mutation-policy.ts` | `MutationPolicy` class and the `FAMILY_TOOLS` map |

---

## 4. BOUNDARIES AND FLOW

| Boundary    | Rule                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------- |
| Families    | `filesystem` owns `edit` and `write`, `process` owns `bash`, `network` owns `fetch`          |
| Enablement  | Exactly one family, set via `enableFamily` which clears first                                |
| Kill switch | Any disable emits a reason to `onDisable` listeners, the approval service reacts by revoking |
| Env wiring  | `index.ts` reads `PI_REMOTE_MUTATION_FAMILY` and `PI_REMOTE_MUTATION_ENABLED=1`              |

Main flow:

```text
index.ts reads PI_REMOTE_MUTATION_FAMILY
enableFamily(family) clears and adds one family
setEnabled(PI_REMOTE_MUTATION_ENABLED === '1' and family set)
ApprovalService.request and consume call isAllowed(tool)
setEnabled(false) emits kill-switch, approval service revokes all
```

A denied tool at request time throws `Mutation command family is disabled` from `ApprovalService`, and a disable mid-flight aborts every in-flight execution signal.

---

## 5. ENTRYPOINTS

| Entrypoint                    | Type   | Purpose                                                           |
| ----------------------------- | ------ | ----------------------------------------------------------------- |
| `MutationPolicy.isAllowed`    | Method | Default-deny tool check                                           |
| `MutationPolicy.setEnabled`   | Method | Global kill switch with `kill-switch` reason on disable           |
| `MutationPolicy.enableFamily` | Method | Select the single active family                                   |
| `MutationPolicy.onDisable`    | Method | Subscribe to disable transitions, returns an unsubscribe function |

---

## 6. VALIDATION

Run from the Pi Mobile repository root.

```bash
npx vitest run apps/pi-remote-relay/tests/approval.test.ts apps/pi-remote-relay/tests/kill-points/recovery.test.ts
```

Expected result: default-deny, family switching and kill-switch revocation cases pass.
