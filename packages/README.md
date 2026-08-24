---
title: 'Pi Remote Packages: Shared Workspace Libraries'
description: 'Map of the shared workspace packages both apps and the extensions depend on. Today it holds the pi-rpc-protocol wire contract.'
trigger_phrases:
  - 'pi remote packages'
  - 'shared packages'
---

# Pi Remote Packages

---

## 1. OVERVIEW

`packages/` holds the shared workspace libraries that the relay, the web client and the extensions all
build on. Code here has no side of its own — it is the common contract and helpers that keep the two apps
and the three extensions speaking the same language.

---

## 2. THE PACKAGES

| Package | Name | What it provides |
|---|---|---|
| [`pi-rpc-protocol/`](./pi-rpc-protocol/README.md) | `@pi-remote/pi-rpc-protocol` | The shared, typed wire contract for Pi Remote traffic — the envelope and message types, runtime type guards, and stable digest and proof helpers. |

---

## 3. WHY IT IS SHARED

The relay and the web client sit on opposite ends of the same wire, and the extensions ride it too. A
message type, a guard or a digest that lived in one of them would drift from the others. Keeping the
contract in one package means a change to the wire is made once and typechecked against every consumer.

---

## 4. RELATED

| Path | Purpose |
|---|---|
| [`../extensions/README.md`](../extensions/README.md) | The extensions that depend on the protocol. |
| [`../app-relay/README.md`](../app-relay/README.md) | The relay end of the wire. |
| [`../app-mobile/README.md`](../app-mobile/README.md) | The web-client end of the wire. |
