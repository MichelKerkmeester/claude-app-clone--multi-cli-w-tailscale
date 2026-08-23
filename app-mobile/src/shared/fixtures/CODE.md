# fixtures/: deterministic local relay and display data

---

## 1. OVERVIEW

`fixtures/` has one module. It provides the local inputs needed to render the mobile app without a relay, including session cards, transcript blocks, artifact metadata, binary preview bytes, runtime controls and a WebSocket-shaped stream.

Current state:

- `isDemoMode` requires both the build flag and the client opt-in.
- `blocksFor` chooses a session's base blocks and appends the selected fixture family.
- `demoPostJson` answers session, transcript, runtime, command, prompt and question paths in memory.
- `demoArtifactBytes` and `demoInboundArtifactResource` expose deterministic bytes only for selected ready resources.
- `demoSocket` emits a read-only sync message and ignores upstream sends.

---

## 2. ARCHITECTURE

Runtime consumers keep their normal interfaces while the fixture module supplies local responses:

```text
Build flag + URL query -> isDemoMode
                              |
                 +------------+------------+
                 v                         v
Auth and relay request paths           Chat and catalog consumers
                 |                         |
                 v                         v
demoPostJson, demoArtifactBytes, demoSocket -> reducers and Svelte surfaces
```

Fixture selection happens from the browser query. The response helpers do not use the real relay, and the fake socket only feeds the read model needed for preview.

---

## 3. KEY FILES

The folder is a one-file package:

| File | Responsibility |
|---|---|
| [`demo.ts`](./demo.ts) | All fixture descriptors, data builders, query routing, fake endpoints, binary resources and socket behavior. |
| [`README.md`](./README.md) | Feature orientation and supported preview cases. |
| [`CODE.md`](./CODE.md) | This code-folder map. |

---

## 4. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Preview activation | `isDemoMode` is false without `VITE_PI_DEMO=1`, even when a URL contains a demo query. |
| Persistent opt-in | `demo=1` stores a local opt-in. `demo=0` clears it. No fixture response becomes host credentials. |
| Fake HTTP | `demoPostJson` returns local protocol-shaped values. Unknown paths return an empty object for best-effort calls. |
| Fake resources | Bytes remain in memory and are validated by the same digest and size checks used for relay resources. |
| Fake socket | `demoSocket` emits a sync delta and ignores `send`, so preview cannot mutate a host. |

Main flow:

```text
URL query -> fixtureName -> blocksFor(sessionId) -> transcript page
URL query -> demoTodoProjection or demoInboundImageState -> selected boundary state
Runtime request -> demoPostJson -> mutable tab-local model, effort or mode result
Artifact block -> demoArtifactBytes -> digest and size validation -> viewer input
Socket open -> demoSocket -> sync delta -> connection and projection reducers
```

---

## 5. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| `isDemoMode` | Function | Applies the build and client opt-in gates. |
| `DEMO_IDENTITY` | Data | Supplies a stable local identity for preview authentication. |
| `DEMO_DIFF_FIXTURE`, `DEMO_ARTIFACT_STATES_FIXTURE`, `DEMO_INBOUND_MEDIA_FIXTURE`, `DEMO_INBOUND_IMAGE_CARD_FIXTURE`, `DEMO_ASK_QUESTION_FIXTURE`, `DEMO_TODO_FIXTURE` | Data | Describe supported fixture query names and state values. |
| `demoPostJson` | Function | Returns in-memory responses for the relay's JSON paths. |
| `demoArtifactBytes` | Function | Returns deterministic bytes for selected artifact blocks. |
| `demoInboundArtifactResource` | Async function | Returns a validated inbound image resource for the ready state. |
| `demoSocket` | Function | Returns a read-only WebSocket-shaped demo stream. |

---

## 6. VALIDATION

Run from the repository root:

```bash
node "$PWD/scripts/naming/scan-folder-docs.mjs"
```

The folder is healthy when both documents exist and the scan reports no broken references for this folder.

---

## 7. RELATED

- [`README.md`](./README.md)
- [Transport documentation](../transport/CODE.md)
- [State documentation](../state/CODE.md)
- [Catalog documentation](../catalog/CODE.md)
