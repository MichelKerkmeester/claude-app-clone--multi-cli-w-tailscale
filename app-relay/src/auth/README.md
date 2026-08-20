---
title: 'auth: device enrollment, app sessions and default-deny actions'
description: 'Coordinates device proof, short-lived sessions, one-use tickets and revocation for the relay loopback API.'
trigger_phrases:
  - enrollment
  - session challenge
  - one-use ticket
  - authorized actions
---

# auth: Device Enrollment, App Sessions and Default-Deny Actions

---

## 1. OVERVIEW

`auth/` owns the trust chain from QR enrollment to application sessions. `AuthService` holds session challenges, sessions and WebSocket tickets in memory, while `EnrollmentRegistry` stores enrolled device public keys as JWK. `policy.ts` allowlists actions, and `rate-limit.ts` bounds repeated ingress attempts.

Current state:

- device enrollment consumes a pairing challenge only after verifying a signature over `enrollmentProof`
- session creation verifies a signature over `sessionProof`, then issues a session token valid for 15 minutes
- WebSocket tickets are one-use and expire after 20 seconds
- `authorizeAction` denies every action not on a 13-entry allowlist
- revoking a device or session invalidates its tickets and notifies listeners
- all state is in memory, nothing is persisted

---

## 2. ARCHITECTURE

```text
╭──────────────────────────────────────────────────────────────────╮
│                            [AUTH]                                 │
╰──────────────────────────────────────────────────────────────────╯

┌──────────────┐      ┌──────────────────┐      ┌─────────────────┐
│ HTTP server  │ ───▶ │ AuthService      │ ───▶ │ Enrollment      │
│ ingress      │      │ challenges       │      │ Registry        │
└──────────────┘      │ sessions tickets │      │ device keys     │
                      └────────┬─────────┘      └─────────────────┘
                               │
                               ▼
                       ┌───────────────┐
                       │ policy.ts     │  authorizeAction
                       │ rate-limit.ts │  FixedWindowRateLimiter
                       └───────────────┘
```

Dependency direction:

```text
auth-service.ts ──▶ enrollment.ts ──▶ node:crypto verify
auth-service.ts ──▶ policy.ts
auth-service.ts ──▶ rate-limit.ts (used by the HTTP layer)
```

`enrollment.ts`, `policy.ts` and `rate-limit.ts` import no sibling modules.

---

## 3. KEY FILES

| File              | Responsibility                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| `auth-service.ts` | Session challenges, application sessions, one-use tickets, revocation listeners, metrics counters |
| `enrollment.ts`   | Pairing challenges, enrolled device JWK keys, `hostFingerprint`, `verifyDeviceSignature`          |
| `policy.ts`       | `authorizeAction` default-deny allowlist of 13 actions                                            |
| `rate-limit.ts`   | `FixedWindowRateLimiter` fixed-window counters without request payload retention                  |

---

## 4. BOUNDARIES AND FLOW

| Boundary    | Rule                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| Imports     | Protocol helpers from `@pi-remote/pi-rpc-protocol` only, plus `node:crypto`                               |
| Exports     | `AuthService`, `EnrollmentRegistry`, `verifyDeviceSignature`, `authorizeAction`, `FixedWindowRateLimiter` |
| Persistence | None, in-memory maps only, pruned on every call                                                           |
| Revocation  | `onRevocation` listeners receive `deviceId` and optional `sessionToken`                                   |

Enrollment flow:

```text
createChallenge() ──▶ QR payload with pairingId and hostFingerprint
enroll()          ──▶ verify signature over enrollmentProof
                 ──▶ consume challenge, store device key
```

Session flow:

```text
createSessionChallenge() ──▶ one-use challenge, 60 second TTL
createSession()          ──▶ verify signature over sessionProof
                         ──▶ issue 15 minute session token
issueTicket()            ──▶ one-use ticket, 20 second TTL
consumeTicket()          ──▶ re-authenticate session, delete ticket
```

---

## 5. ENTRYPOINTS

| Entrypoint                  | Type     | Purpose                                                     |
| --------------------------- | -------- | ----------------------------------------------------------- |
| `AuthService.enroll`        | Method   | Register a device after signature proof                     |
| `AuthService.createSession` | Method   | Exchange a signed challenge for a session                   |
| `AuthService.authenticate`  | Method   | Check token, origin, principal, expiry and action allowlist |
| `AuthService.consumeTicket` | Method   | Redeem a one-use WebSocket ticket                           |
| `AuthService.revokeDevice`  | Method   | Revoke the device and all its sessions and tickets          |
| `authorizeAction`           | Function | Default-deny action predicate                               |

---

## 6. VALIDATION

Run from the Pi Mobile repository root.

```bash
npx vitest run apps/pi-remote-relay/tests/auth.test.ts
```

Expected result: enrollment, session, ticket and revocation cases pass.
