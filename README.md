---
title: Pi Remote
description: Private installable PWA that remote-controls the Pi coding agent from an enrolled phone over a Tailscale tailnet.
trigger_phrases:
  - 'pi remote'
  - 'tailscale serve deployment'
  - 'approval extension'
  - 'enroll the phone'
  - 'install the pwa'
---

# Pi Remote

> Pi Remote is a private installable PWA that remote-controls the Pi coding agent from an enrolled phone over a Tailscale tailnet.

---

## 1. OVERVIEW

Pi Remote runs a loopback relay next to the Pi coding agent on one host. The relay owns one Pi RPC child, stores a bounded redacted event ledger, and serves an installable PWA to a phone on the same tailnet. Tailscale Serve is the only ingress. Nothing listens on a public interface.

Four components make up the system: the loopback relay, the shared wire protocol package, the installable PWA, and the pinned approval extension for protected tool calls. [Architecture](ARCHITECTURE.md) traces any event from Pi through redaction, persistence, replay, and phone delivery, and any protected call through the approval loop to execution.

### Key Statistics

| Metric          | Value                                                                      |
| --------------- | -------------------------------------------------------------------------- |
| Status          | Private deployment with operator-verified boundaries                       |
| Version         | 0.1.0                                                                      |
| Main audience   | One operator controlling Pi from an enrolled phone                         |
| Operating modes | Read-only default, protected mutation, operator full-access, optional push |

### How This Compares

| Capability      | Pi Remote                           | Pi CLI               |
| --------------- | ----------------------------------- | -------------------- |
| Control surface | Phone PWA over tailnet HTTPS        | Local terminal       |
| Ingress         | Tailscale Serve only                | None                 |
| Tool access     | Read tools plus one optional family | All tools            |
| Activity view   | Redacted replayed transcript        | Full terminal output |

---

## 2. QUICK START

```bash
npm ci
npm run build
sh deploy/setup-tailscale-serve.sh
```

Expected result: the relay runs on `127.0.0.1:4310`, the PWA preview on `127.0.0.1:4173`, and Serve exposes only the `/`, `/api` and `/health` HTTPS routes to the tailnet. The relay prints one short-lived enrollment payload at startup.

Prepare `deploy/serve.env` first as described in [Install And Onboarding](.opencode/skills/sk-code/sk-code-mobile-cli/references/app-guide/install-and-onboarding.md). That guide also covers the operator checks the repository cannot run itself.

---

## 3. FEATURES

### Key Features

| Feature                  | What It Does                                                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Redacted live transcript | Streams Pi activity with paths, secrets and private text replaced before persistence or broadcast                                                   |
| Prompt steering          | Sends one steering prompt to the owned Pi child as a single write                                                                                   |
| Protected tool approval  | Requests an exact-action lease for `edit`, `write`, `bash` or `fetch`, waits for a phone decision, and consumes the approved lease before execution |
| Opaque session catalog   | Lists sessions with coarse status, update time and message count only                                                                               |
| Attention Inbox          | Flags inputs that need a decision and offers optional content-free push hints                                                                       |
| Sync replay barrier      | Delivers a snapshot or delta from one committed high-water barrier with a retention floor                                                           |
| Installable PWA          | Offline shell with a stale read-only cache after enrollment                                                                                         |

---

## 4. REQUIREMENTS

| Requirement | Minimum                             | Notes                                                                                                                |
| ----------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Node.js     | 22                                  | Runs all four workspaces                                                                                             |
| npm         | 10                                  | Workspace scripts                                                                                                    |
| Pi          | 0.84.1                              | Pinned live target for the approval extension. The relay falls back to its recorded fixture when `pi` is unavailable |
| Tailscale   | Signed in with Serve permission     | Private HTTPS and WSS ingress for the phone                                                                          |
| Phone       | Browser on the same tailnet         | Enrolls once and keeps a non-extractable P-256 key in IndexedDB                                                      |
| macOS       | Only for protected-tool containment | `sandbox-exec` profile in `deploy/containment/pi-remote.sb`                                                          |

---

## 5. STRUCTURE

```text
Pi Mobile/
+-- packages/pi-rpc-protocol/        # Shared wire contracts and runtime guards
+-- apps/pi-remote-relay/            # Pi supervision, SQLite ledger, auth, sync, approval, push
+-- apps/pi-remote-web/              # React PWA, offline cache, review UI, Attention Inbox
+-- extensions/pi-remote-approval/   # Pi final-boundary extension
+-- deploy/                          # Tailscale Serve and macOS containment assets
+-- docs/                            # Operator documentation and runbooks
+-- release/                         # Thresholds, rollout policy and generated evidence
+-- scripts/                         # Release gate and rollback drill entrypoints
`-- tests/                           # Release-readiness tests
```

| Path                            | Purpose                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `packages/pi-rpc-protocol`      | Shared TypeScript contract for commands, events, browser DTOs and runtime guards                   |
| `apps/pi-remote-relay`          | Owns the Pi child, the redacted SQLite ledger, the loopback API, approval leases and push delivery |
| `apps/pi-remote-web`            | Enrollment, transcript rendering, exact-action review UI and Attention Inbox                       |
| `extensions/pi-remote-approval` | Final protected-tool boundary inside the Pi process                                                |
| `deploy`                        | Serve deployment script, `serve.env.example` and the macOS containment profile                     |
| `docs`                          | Architecture, security, setup and runbooks                                                         |
| `release`                       | Thresholds, rollout stages and generated evidence                                                  |

---

## 6. CONFIGURATION

The deployment reads `deploy/serve.env`, copied from `deploy/serve.env.example`.

| Option                       | Default        | Purpose                                            |
| ---------------------------- | -------------- | -------------------------------------------------- |
| `PI_REMOTE_PUBLIC_ORIGIN`    | None, required | Exact HTTPS origin assigned by Tailscale Serve     |
| `PI_REMOTE_RELAY_PORT`       | `4310`         | Loopback port for the relay                        |
| `PI_REMOTE_WEB_PORT`         | `4173`         | Loopback port for the PWA preview                  |
| `PI_REMOTE_PRINT_ENROLLMENT` | `1`            | Print one enrollment payload at startup            |
| `PI_REMOTE_MUTATION_ENABLED` | Off            | Enables one protected tool family when set to `1`  |
| `PI_REMOTE_MUTATION_FAMILY`  | None           | Selects `filesystem`, `process` or `network`       |
| Push variables               | None           | All four values must be present before push starts |

---

## 7. USAGE EXAMPLES

```bash
# Typecheck all workspaces
npm run typecheck

# Run the protocol, relay, extension and root suites
npm test

# Start only the relay, which requires the deployment environment
npm run start -w @pi-remote/relay

# Preview the PWA against the live relay
npm run preview -w @pi-remote/web

# Run the release gate
npm run release:verify
```

Result: `npm run release:verify` writes a timestamped evidence file under `release/evidence/` and reports `machineStatus` PASS when every runnable gate passes. Numeric limits come from `release/thresholds.json` and stage readiness from `release/rollout.json`.

---

## 8. TROUBLESHOOTING

| What You See                          | Cause                             | Fix                                                                              |
| ------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------- |
| `Missing deploy/serve.env`            | Config file absent                | Copy `deploy/serve.env.example` and set the exact tailnet origin                 |
| `PI_REMOTE_PUBLIC_ORIGIN is required` | Origin unset or wrong             | Read the origin from `tailscale serve status` and update `deploy/serve.env`      |
| Enrollment fails                      | Payload expired, edited or reused | Restart the foreground deployment to print a fresh payload                       |
| Funnel shows a public listener        | Public surface enabled            | Run `tailscale funnel --https=443 off` and verify with `tailscale funnel status` |
| Direct relay request returns `403`    | Loopback-only bind                | Use the Serve HTTPS origin, never `127.0.0.1:4310` directly                      |
| Protected tool stays blocked          | Lease not approved or expired     | Decide from the Attention Inbox before the lease expires                         |

---

## 9. FAQ

**Q: Can I use Pi Remote without Tailscale?**

A: No. The relay binds to loopback only and Tailscale Serve is the supported ingress. See [Security](.opencode/skills/sk-code/sk-code-mobile-cli/references/app-guide/security.md).

**Q: Does Pi Remote store my prompts or file contents?**

A: No. Redaction replaces paths, secrets and private text before persistence or broadcast. Push hints carry only a lookup id and an attention class.

**Q: When does the approval extension load?**

A: Only in the allowlisted mutation posture — `PI_REMOTE_MUTATION_ENABLED=1` with exactly one family set. The relay runs three distinct postures. The safe default starts Pi with `--no-tools --no-extensions` (steering only, fail-closed). The mutation posture adds the approval extension over an allowlisted tool family. The operator-only full-access posture (`--full-access` / `PI_REMOTE_FULL_ACCESS=1`) starts Pi with `--mode rpc --no-session --approve` and every built-in tool, with no approval extension — desktop parity. Only the host selects full access; the phone can never enable it.

**Q: What happens when I interrupt the deployment script?**

A: The cleanup trap removes the Serve routes and stops both loopback processes. Pi sessions and the redacted ledger stay untouched.

---

## 10. RELATED RESOURCES

### Related Documents

The Pi Remote app documentation — install & onboarding, security, operations, incident playbooks,
rollback, platform support, release verification, the feature catalog, quality baselines, and design
reference — now lives in the **sk-code skill** as the single source of truth for the Pi Remote app:
[`.opencode/skills/sk-code/sk-code-mobile-cli/references/app-guide/`](.opencode/skills/sk-code/sk-code-mobile-cli/references/app-guide/).

| Document                                           | Purpose                                                     |
| -------------------------------------------------- | ----------------------------------------------------------- |
| [Architecture](ARCHITECTURE.md)                    | Relay, protocol, ledger, synchronization, PWA and extension |
| [Deploy README](deploy/README.md)                  | Serve deployment mechanics                                  |
| [Containment README](deploy/containment/README.md) | macOS sandbox profile verification                          |
