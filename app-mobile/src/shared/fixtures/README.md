# Local preview fixtures

> Double-gated in-memory data that lets the browser exercise chat, artifacts and controls without a relay.

---

## 1. OVERVIEW

`fixtures/` keeps demonstration data out of runtime modules even though the module ships in the browser bundle. `demo.ts` supplies a local identity, transcript blocks, artifact bytes, fake HTTP responses and a socket-shaped read-only stream. The build flag and explicit query opt-in keep that behavior inert for a normal deployment.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Source files | One module, [`demo.ts`](./demo.ts) |
| Preview gate | `VITE_PI_DEMO=1` plus `?demo=1` |
| Sessions | One idle session and one running session |
| State coverage | Rich content, artifacts, media, questions, todos, model controls and failure outcomes |

The separation matters because a fixture can simulate an accepted control or a live socket without becoming evidence that the real host accepted anything. Production transport and state remain the authority boundaries.

---

## 2. FEATURES

### Key Features

| Feature | What It Does |
|---|---|
| Explicit preview gate | Enables the demo only for a build carrying `VITE_PI_DEMO=1` and a client that opted in with `demo=1`. |
| Transcript fixtures | Covers a completed refactor turn, a running triage turn and rich-content variants. |
| Resource fixtures | Supplies text, code, image and PDF metadata plus deterministic bytes and digest checks. |
| Boundary states | Selects empty, withheld, missing, denied, corrupt, expired, unsupported and delivery-unknown cases by query. |
| Fake relay | Answers the same read and control paths used by the app and keeps mutable runtime values in memory. |
| Read-only socket | Emits a sync delta so the local app can enter its live display state without sending upstream. |

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Build flag | `VITE_PI_DEMO=1` | Without it, `isDemoMode` always returns false. |
| Browser opt-in | `?demo=1` | The choice is remembered in local storage until `?demo=0` clears it. |
| Browser APIs | `window`, `localStorage`, `TextEncoder`, `WebSocket` shape and binary helpers | The fixture is a browser preview path, not a server data source. |
| Runtime consumers | Auth and relay modules that check `isDemoMode` | Those consumers route requests to the local fixture only after the gate passes. |

---

## 4. STRUCTURE

| File | Role |
|---|---|
| [`demo.ts`](./demo.ts) | Holds descriptors, block data, fake responses, artifact bytes, runtime simulation and the demo socket. |

---

## 5. IMPLEMENTATION BOUNDARIES

`demo.ts` is the complete preview boundary. It gates activation, selects fixture data and supplies the fake transport behavior while consumers keep their normal interfaces.

| Boundary | Rule |
|---|---|
| Activation | `isDemoMode` requires `VITE_PI_DEMO=1` and the client opt-in. A query alone cannot enable the fixture. |
| Local responses | `demoPostJson`, `demoArtifactBytes` and `demoSocket` return in-memory protocol-shaped values. They do not contact the relay or create host credentials. |
| Consumer boundary | Auth and relay consumers switch to these helpers only after `isDemoMode` passes. Reducers and Svelte surfaces receive the same shapes as the normal paths. |
| Runtime state | Model, effort and mode changes stay in the current tab. The fake socket emits read-only state and ignores upstream sends. |

Put preview data, query cases and fake endpoint changes in `demo.ts`. Put the runtime branch that checks `isDemoMode` in its owning auth or relay consumer. Do not use fixtures as evidence of host behavior.

Run `node scripts/naming/scan-folder-docs.mjs` from the repository root to verify folder coverage and local references.

---

## 6. USAGE EXAMPLES

| Situation | Query or behavior |
|---|---|
| Inspect a diff | Use `?demo=1&fixture=diff` to add the deterministic policy diff block. |
| Inspect artifact availability | Use `?demo=1&fixture=artifact-states` for ready, withheld, missing, denied and unsupported cards. |
| Inspect rich content | Use `?demo=1&fixture=rich-core` or `?demo=1&fixture=rich-release` for tool lifecycle and redaction cases. |
| Inspect todo projection | Use `?demo=1&fixture=todos&state=grouped`, `all-done`, `empty` or `unsupported`. |
| Inspect inbound image lifecycle | Use `?demo=1&fixture=inline-card&state=inline-ready` or another state from `DEMO_INBOUND_IMAGE_CARD_FIXTURE`. |
| Exercise local controls | The fake runtime keeps model, effort and mode changes in memory for the current tab. |

---

## 7. TROUBLESHOOTING

| What You See | Cause | Fix |
|---|---|---|
| The normal relay page appears | The build flag is absent or the client has not opted in. | Run a demo build and open the page with `?demo=1`. |
| The demo remains active after removing the query | The opt-in is persisted for the installed preview. | Open the page with `?demo=0` to clear the local choice. |
| A fixture URL shows the default session | The query uses an unknown fixture or state value. | Use the descriptors exported from `demo.ts` as the supported names. |
| An artifact preview reports a digest or size failure | The fixture bytes intentionally exercise validation or the selected block is unavailable. | Choose a ready artifact state before treating the validator result as a defect. |
| A command or control change disappears on reload | Demo runtime state is tab-local and in memory. | Reload the selected fixture and treat the host as the source of truth outside preview mode. |

---

## 8. FAQ

**Q: Does demo mode contact the real relay?**

A: No. Auth, HTTP responses, artifact reads and the sync socket use local in-memory helpers after the gate passes.

**Q: Why do fixtures ship to the browser?**

A: The preview must render the same Svelte surfaces and validation paths as the app. The explicit build and query gates keep the data out of ordinary behavior.

---

## 9. RELATED RESOURCES

| Document | Purpose |
|---|---|
| [Transport documentation](../transport/README.md) | Auth, relay calls, artifact reads and sync socket consumers. |
| [State documentation](../state/README.md) | Reducers that consume fixture pages and sync messages. |
| [Catalog documentation](../catalog/README.md) | Model and surface data used by the demo controls. |
