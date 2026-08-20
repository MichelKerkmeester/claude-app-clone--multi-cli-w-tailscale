---
title: 'http: loopback read-only API and sync socket'
description: 'Serves the loopback HTTP and WSS surface with a secret-prefix path guard and Origin anchor.'
trigger_phrases:
  - loopback server
  - serve secret
  - sync socket
  - read-only API
---

# http: Loopback Read-Only API and Sync Socket

---

## 1. OVERVIEW

`http/server.ts` exposes `startReadOnlyServer`, the fail-closed API that binds only to `127.0.0.1`. Every request must carry the `/_serve/{serveSecret}` path prefix, an `Origin` equal to `publicOrigin`, and a `tailscale-user-login` principal header. The server accepts POST only and upgrades WebSockets only at `/api/sync` with a one-use ticket.

Current state:

- default port 4310, loopback host only
- path guard compares the prefix with `timingSafeEqual`
- identity headers are deleted after the principal is read
- request limiter 120 per minute, enrollment limiter 10 per minute, prompt limiter 20 per minute
- 32 sockets maximum, 4 per device
- HTTP bodies capped at 16 KiB, WebSocket messages at 64 KiB
- responses carry `no-store`, `default-src 'none'` and `nosniff`

---

## 2. ARCHITECTURE

```text
╭──────────────────────────────────────────────────────────────────╮
│                         [HTTP]                                    │
╰──────────────────────────────────────────────────────────────────╯

┌────────────────┐      ┌──────────────────┐      ┌───────────────┐
│ Tailscale      │ ───▶ │ authenticate     │ ───▶ │ AuthService   │
│ ingress        │      │ Ingress          │      │ sessions      │
└────────────────┘      │ secret prefix    │      └───────┬───────┘
                        │ origin + header  │              │
                        └────────┬─────────┘              ▼
                                 │                ┌───────────────┐
                                 ▼                │ SyncHub       │
                         ┌───────────────┐        │ subscribe     │
                         │ handleHttp    │ ─────▶ │ WSS /api/sync │
                         │ route table   │        └───────────────┘
                         └───────────────┘
                                 │
                                 ▼
                         ┌───────────────┐
                         │ approvals     │
                         │ prompts       │
                         │ push          │
                         │ store         │
                         └───────────────┘
```

Dependency direction:

```text
server.ts ──▶ auth/ ──▶ enrollment, policy, rate-limit
server.ts ──▶ approval/, prompt/, push/, sessions/, store/, replay/
```

`server.ts` is the only module that wires the loopback surface together.

---

## 3. KEY FILES

| File        | Responsibility                                                                                |
| ----------- | --------------------------------------------------------------------------------------------- |
| `server.ts` | `startReadOnlyServer`, ingress guard, HTTP routes, WSS upgrade, extension authority endpoints |

---

## 4. BOUNDARIES AND FLOW

| Boundary            | Rule                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bind                | `127.0.0.1` only, never a wildcard interface                                                                                                                        |
| Path                | Every route sits under `/_serve/{serveSecret}`, compared with constant-time equality                                                                                |
| Origin              | Must equal `publicOrigin` exactly                                                                                                                                   |
| Principal           | Read from `tailscale-user-login`, 1 to 320 characters, headers then deleted                                                                                         |
| Method              | POST only, any other method gets 405 `read_only`                                                                                                                    |
| Extension authority | `POST /api/extension/approval/request` and `consume` accept a Bearer secret checked with `timingSafeEqual` and a fixed principal, session, epoch and policy version |

Main request flow:

```text
request ──▶ extension authority check (loopback only)
        ──▶ authenticateIngress (secret prefix, origin, principal)
        ──▶ rate limiter
        ──▶ method must be POST
        ──▶ session cookie or ticket
        ──▶ route handler or 404
```

Main socket flow:

```text
upgrade ──▶ ingress guard, path must be /api/sync
        ──▶ rate limiter
        ──▶ consume one-use ticket
        ──▶ capacity check (32 total, 4 per device)
        ──▶ one subscribe message with sessionId and optional cursor
        ──▶ close on session expiry or revocation
```

Routes include `/api/auth/enroll`, `/api/auth/challenge`, `/api/auth/session`, `/api/auth/ticket`, `/api/auth/logout`, `/api/auth/revoke-device`, `/health`, `/api/sessions`, `/api/sessions/{id}/transcript`, `/api/attention`, `/api/push/*`, `/api/approvals`, `/api/approval/decide`, `/api/accept-edits` and `/api/prompt/submit`.

---

## 5. ENTRYPOINTS

| Entrypoint                                  | Type     | Purpose                                                                                            |
| ------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `startReadOnlyServer`                       | Function | Start the loopback server and return `RunningReadOnlyServer` with `stop` and `foregroundDeviceIds` |
| `RunningReadOnlyServer.foregroundDeviceIds` | Getter   | Devices with an open sync socket                                                                   |

---

## 6. VALIDATION

Run from the Pi Mobile repository root.

```bash
npx vitest run apps/pi-remote-relay/tests/auth.test.ts apps/pi-remote-relay/tests/authority-loop.test.ts apps/pi-remote-relay/tests/security/negative-controls.test.ts
```

Expected result: loopback auth, extension authority and negative-control cases pass.
