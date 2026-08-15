---
title: 'Deploy: Tailnet-Only Serve Deployment'
description: 'Loopback relay and PWA exposure through private Tailscale Serve routes with operator verification.'
trigger_phrases:
  - 'tailscale serve deployment'
  - 'setup-tailscale-serve.sh'
  - 'tailnet deployment'
---

# Deploy: Tailnet-Only Serve Deployment

---

## 1. OVERVIEW

`deploy/` owns the tailnet-only deployment path. It starts the loopback relay and PWA preview, disables the public Funnel surface, and configures private HTTPS Serve routes for `/`, `/api`, and `/health`. The relay still requires a signed device session. Mutation stays off unless the operator explicitly selects one family, in which case the production entrypoint loads the approval extension and exposes its capability-authenticated transport on loopback only.

Current state:

- `setup-tailscale-serve.sh` starts both loopback processes and configures the Serve routes
- The relay binds to `127.0.0.1:4310` and the web preview to `127.0.0.1:4173`, never to LAN or tailnet interfaces
- The script creates a fresh 256-bit Serve anchor for each run
- The cleanup trap removes the configured routes and stops both processes on exit

---

## 2. ARCHITECTURE

```text
╭──────────────────────────────────────────────────────────────────╮
│                         deploy/                                  │
╰──────────────────────────────────────────────────────────────────╯

┌─────────────┐      ┌──────────────────────┐      ┌───────────────┐
│ serve.env   │ ───▶ │ setup-tailscale-     │ ───▶ │ relay         │
│             │      │ serve.sh             │      │ 127.0.0.1:4310│
└─────────────┘      └──────────┬───────────┘      │ web preview   │
                                │                  │ 127.0.0.1:4173│
                                ▼                  └───────────────┘
                     ┌──────────────────────┐
                     │ tailscale serve      │
                     │ / /api /health       │
                     └──────────┬───────────┘
                                ▼
                     ┌──────────────────────┐
                     │ tailnet device       │
                     │ HTTPS + WSS          │
                     └──────────────────────┘
```

Control flow:

```text
serve.env ──▶ read and export ──▶ start relay and web preview
        ──▶ disable Funnel ──▶ add / /api /health Serve routes
        ──▶ wait on both processes
        ──▶ EXIT, INT or TERM ──▶ remove routes, kill processes
```

---

## 3. DIRECTORY TREE

```text
deploy/
+-- README.md                  # This guide
+-- setup-tailscale-serve.sh   # Serve route setup and process supervision
+-- serve.env.example          # Configuration template
`-- containment/               # macOS sandbox profile and escape test
```

---

## 4. KEY FILES

| File                          | Responsibility                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `setup-tailscale-serve.sh`    | Reads `serve.env`, starts relay and web preview, disables Funnel, adds the three Serve routes, installs the cleanup trap |
| `serve.env.example`           | Template for `deploy/serve.env` with the exact tailnet origin, ports, and the enrollment print flag                      |
| `containment/pi-remote.sb`    | macOS `sandbox-exec` profile for the protected runner                                                                    |
| `containment/escape-tests.sh` | Escape-class denial checks for that profile                                                                              |

---

## 5. BOUNDARIES AND FLOW

| Boundary       | Rule                                                                                               |
| -------------- | -------------------------------------------------------------------------------------------------- |
| Network        | Relay and PWA bind to `127.0.0.1` only, never to LAN or tailnet interfaces                         |
| Public surface | Funnel is explicitly disabled before Serve is enabled                                              |
| Identity       | `/api` and `/health` use the secret-prefixed loopback target `/_serve/<secret>/`                   |
| Enrollment     | The relay prints a one-time enrollment payload, transferred through an operator-controlled channel |
| Cleanup        | The trap removes all three Serve routes and kills both processes                                   |

The browser never receives the secret prefix. Direct requests to `127.0.0.1:4310`, requests through another proxy, and spoofed identity headers cannot satisfy the anchor.

Stopping the setup script removes the configured Serve routes and stops both loopback processes. It does not alter Pi sessions or the redacted relay database.

---

## 6. ENTRYPOINTS

| Entrypoint                           | Type  | Purpose                                                       |
| ------------------------------------ | ----- | ------------------------------------------------------------- |
| `sh deploy/setup-tailscale-serve.sh` | Shell | Start the deployment in the foreground                        |
| `tailscale serve status`             | CLI   | Verify only the HTTPS Serve routes for `/`, `/api`, `/health` |
| `tailscale funnel status`            | CLI   | Confirm no public listener                                    |

---

## 7. VALIDATION

Run from the app root:

```bash
npm install && npm run build
sh deploy/setup-tailscale-serve.sh
tailscale serve status
tailscale funnel status
```

Operator verification required before relying on the deployment:

- `tailscale serve status` shows only the HTTPS Serve routes for `/`, `/api`, `/health`
- `tailscale funnel status` shows no public listener
- The HTTPS PWA loads from the exact configured origin and can enroll once
- A second use of the same enrollment payload fails
- A direct request to `http://127.0.0.1:4310/api/sessions` fails with `403` even when Tailscale identity headers are supplied
- A revoked device loses HTTP access and its open WebSocket closes

This repository cannot unit-test the target host's Tailscale daemon or tailnet policy.

---

## 8. RELATED

- [`../README.md`](../README.md)
- [`containment/README.md`](containment/README.md)
- [`../docs/setup.md`](../docs/setup.md)
- [`../docs/security.md`](../docs/security.md)
