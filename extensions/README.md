---
title: 'Pi Remote Extensions: The Three Host-Boundary Extensions'
description: 'Map of the three Pi extensions that enforce approval, inbound-media and plan-mode boundaries between Pi and the relay.'
trigger_phrases:
  - 'pi remote extensions'
  - 'extensions map'
---

# Pi Remote Extensions

---

## 1. OVERVIEW

`extensions/` holds the three Pi extensions that sit at the boundary between Pi and the relay. Each one
enforces a single safety rule: nothing a mutating tool does, no image, and no plan step reaches the
outside without passing the boundary that owns it. Every extension is a workspace package under
`@pi-remote/*` and ships its own README.

---

## 2. THE EXTENSIONS

| Extension | Package | What it enforces |
|---|---|---|
| [`pi-remote-approval/`](./pi-remote-approval/README.md) | `@pi-remote/approval-extension` | Blocks protected tool calls until the relay atomically consumes the same approved action lease. |
| [`pi-remote-inbound-media/`](./pi-remote-inbound-media/README.md) | `@pi-remote/inbound-media-extension` | Publishes only allowlisted, capability-gated inbound images to the relay; never hands Pi a transport writer. |
| [`pi-remote-plan/`](./pi-remote-plan/README.md) | `@pi-remote/plan-extension` | Adds a `plan` command and read-only plan mode, blocking mutation-capable tools until an execution lease is granted. |

---

## 3. SHARED SHAPE

Each extension is one small package: a `src/` with the boundary logic, a `tests/` proving the boundary
holds (including negative controls), and a `package.json`. They depend on the shared
[`pi-rpc-protocol`](../packages/pi-rpc-protocol/README.md) for types and guards, and they talk to the
relay, never to each other.

---

## 4. RELATED

| Path | Purpose |
|---|---|
| [`../packages/README.md`](../packages/README.md) | The shared packages the extensions build on. |
| [`../app-relay/README.md`](../app-relay/README.md) | The relay the extensions hand off to. |
