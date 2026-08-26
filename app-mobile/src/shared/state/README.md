# Host state and projections

> Reducers and Svelte stores that turn relay data into displayable app state without inventing host authority.

---

## 1. OVERVIEW

`state/` owns the values screens read after transport has delivered cache, page, socket or control data. It contains connection and transcript reducers, the non-optimistic runtime machine, read-only todo projections, conversational turn grouping and the Svelte context stores that connect them to the app shell.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Modules | Eight flat TypeScript and Svelte runes modules |
| State families | Connection, sessions, transcript, runtime, todos and app-shell context |
| Authority rule | Pending intent stays separate from host-confirmed state |
| Projection rule | Transcript turns and todo data are read-only views |

### Change Ownership

| Change | Edit here or in the component |
|---|---|
| A state transition, revision guard, scope check or announcement | Change the reducer or pure helper in `state/`. |
| A runtime mutation deadline, refresh or cancellation rule | Change the matching state lifecycle module. |
| Markup, layout, disclosure or local pointer behavior | Change the consuming Svelte component. |
| A wire shape or response contract | Change the protocol or transport boundary first, then update the reducer adapter. |

---

## 2. FEATURES

### Key Features

| Feature | What It Does |
|---|---|
| Display reducers | Track connection, session-list and transcript state with cache, relay, optimistic and gap handling. |
| Runtime authority | Keeps host-confirmed model, effort and mode state separate from pending and delivery-unknown outcomes. |
| Plan lifecycle | Retains the current valid plan, bounded history, live token and review state for execution. |
| Todo projection | Folds scoped snapshots and revision-matched deltas into a read-only display model with concise announcements. |
| App context | Exposes reducer stores, auth state, overlay flags and theme preference through Svelte context. |
| Turn grouping | Groups ordered transcript blocks by user prompt without dropping evidence or changing its order. |

The component decides how a state value looks. The reducer decides when that value changes and which authority checks must pass first.

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Protocol input | Typed session, transcript, runtime, sync and todo DTOs | The reducers reject wrong session, epoch or revision data by returning the current state. |
| Svelte context | `setAppState` and `getAppState` for shell consumers | The route supplies selected session identity outside this store. |
| Runtime reads | Relay state and model catalog endpoints | `useRuntime` hydrates before enabling a mutation. |
| Browser state | Cache and theme helpers when the app runs in a browser | Server evaluation uses safe defaults. |

---

## 4. STRUCTURE

| File | Role |
|---|---|
| [`state.ts`](./state.ts) | Connection, session-list and transcript reducers, display parsing and media defaults. |
| [`runtime.ts`](./runtime.ts) | Runtime reducer, mode authority, plan lifecycle and narrow relay adapters. |
| [`use-runtime.svelte.ts`](./use-runtime.svelte.ts) | Runes lifecycle for hydration, cancellation, mutation deadlines and plan execution. |
| [`app-state.svelte.ts`](./app-state.svelte.ts) | App-shell context with reducer stores, auth, overlays and theme. |
| [`todo-state.ts`](./todo-state.ts) | Read-only todo snapshot and delta reducer. |
| [`todo-model.ts`](./todo-model.ts) | Ordered todo display sections, groups and progress. |
| [`turns.ts`](./turns.ts) | Conversational turn grouping for ordered transcript blocks. |
| [`unread-overlay.ts`](./unread-overlay.ts) | Device-local unread/seen overlay that never writes status. |
| [`favorite-preference.ts`](./favorite-preference.ts) | Device-local pin set that only reorders this device's roster. |
| [`runtime-issues.ts`](./runtime-issues.ts) | Local copy for allowlisted runtime issue codes. |
| [`CODE.md`](./CODE.md) | Reducer topology, flow and edit boundaries. |

---

## 5. USAGE EXAMPLES

| Situation | Read or call |
|---|---|
| A route changes session | Dispatch `select` to the relevant reducer and let stale-session actions become no-ops. |
| A sync snapshot arrives | Dispatch `snapshot` to `transcriptReducer` or `todoProjectionReducer` and replace the scoped projection. |
| A sync delta arrives | Dispatch `delta` and let epoch, cursor, plan or revision checks decide whether to fold it. |
| A runtime control starts | Use `useRuntime` or `runtimeReducer` so pending intent appears without changing the confirmed state. |
| A delivery result is uncertain | Keep `deliveryUnknown` true and reconcile with a read-only hydrate before another mutation. |
| A transcript surface needs turn rows | Call `groupBlocksIntoTurns` after normalization. It keeps original block order. |
| A todo panel needs sections | Call `buildTodoDisplayModel` and render its ordered state sections without adding a write path. |

---

## 6. TROUBLESHOOTING

| What You See | Cause | Fix |
|---|---|---|
| A control looks changed before the host accepts it | A component wrote its own optimistic value or skipped the runtime reducer. | Render `pending` separately and wait for `hydrated` or an accepted control outcome. |
| A delta does not change the transcript | The session differs, the reducer awaits a snapshot or the epoch changed. | Request and apply an authoritative snapshot before displaying new deltas. |
| A todo panel asks for refresh | The delta has no base snapshot, a different plan or a non-matching revision. | Keep the projection read-only and refresh its scoped snapshot. |
| A second session shows the first session's rows | An async action dispatched after the session changed without checking its session id. | Keep the session guard in the reducer and pass the originating id into the action. |
| A component has complicated state rules | Behavior was placed in markup instead of the reducer or helper. | Move transitions and authority checks into `state/`. Keep the component focused on rendering and local interaction. |

---

## 7. FAQ

**Q: Where does a behavior change belong, in the reducer or the component?**

A: Put state transitions, authority checks, revision handling and derived announcements in the reducer or its helper. Put markup, layout and local input behavior in the component.

**Q: Why does the runtime state keep `pending` and `state` separately?**

A: The host-confirmed snapshot is the only authority. Pending intent tells the UI what the user requested without claiming that the host accepted it.

**Q: Can the phone edit the todo projection?**

A: No. `todoProjectionReducer` consumes sync data and exposes refresh needs. It does not create task mutations.

---

## 8. RELATED RESOURCES

| Document | Purpose |
|---|---|
| [`CODE.md`](./CODE.md) | Reducer layers, runes lifecycles and state flow. |
| [Transport documentation](../transport/README.md) | Cache, relay payloads and sync messages consumed here. |
| [Commands documentation](../commands/README.md) | Composer bindings that depend on runtime and connection authority. |
| [Format documentation](../format/README.md) | Local copy and display helpers used by state consumers. |
| [Transcript documentation](../../pages/chat/transcript/README.md) | A consuming surface that groups and renders transcript state. |
