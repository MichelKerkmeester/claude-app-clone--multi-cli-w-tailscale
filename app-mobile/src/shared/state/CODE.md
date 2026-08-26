# state/: reducers, host authority and read-only projections

---

## 1. OVERVIEW

`state/` is the app's state boundary between transport results and Svelte surfaces. Plain modules describe reducer transitions and projection rules. Runes modules own live effects, cancellation and Svelte context. The runtime module also keeps the narrow relay adapters needed for read-only hydration and guarded control calls close to its reducer.

Current state:

- `state.ts` handles connection, sessions and transcript state plus display-block normalization.
- `runtime.ts` models confirmed mode, pending intent, delivery uncertainty and plan review.
- `use-runtime.svelte.ts` adds request generations, deadlines, refresh coalescing and browser lifecycle.
- `app-state.svelte.ts` exposes the display stores and shell actions through context.
- `todo-state.ts` folds scoped sync data. `todo-model.ts` shapes it for display.
- `turns.ts` groups ordered blocks. `runtime-issues.ts` supplies bounded issue copy.

---

## 2. ARCHITECTURE

Transport messages enter reducer boundaries before components render them:

```text
Cache, relay pages and sync messages -> state.ts -> display reducers -> app-state.svelte.ts -> screens
Runtime snapshot and control outcome -> runtime.ts -> use-runtime.svelte.ts -> runtime controls
Todo snapshot and delta -> todo-state.ts -> todo-model.ts -> todo panel
Ordered transcript blocks -> turns.ts -> transcript rows
Issue code -> runtime-issues.ts -> bounded status copy
```

`state.ts` and the reducer portions of `runtime.ts` make transitions explicit. `app-state.svelte.ts` and `use-runtime.svelte.ts` own live reactive wiring. A component consumes the resulting value and decides how to render it.

---

## 3. PACKAGE TOPOLOGY

The package has reducer, projection and lifecycle zones:

```text
Protocol DTOs and transport results
             |
             v
state.ts, runtime.ts, todo-state.ts, turns.ts, runtime-issues.ts
             |
             +--> app-state.svelte.ts
             +--> use-runtime.svelte.ts
             +--> todo-model.ts
             |
             v
          Svelte screens
```

Allowed dependency direction:

- Reducers validate session, epoch, revision and authority before returning new state.
- `app-state.svelte.ts` composes display reducers and uses cache and theme helpers for initial browser state.
- `use-runtime.svelte.ts` calls the runtime read and mutation adapters and feeds responses to `runtimeReducer`.
- `todo-model.ts` reads a projection and returns display sections without changing it.
- Screens read state and dispatch through the context or lifecycle controls.

Disallowed dependency direction:

- Components must not duplicate reducer transitions or commit host-confirmed values locally.
- Todo display code must not create task mutations.
- Route-owned session identity must not move into `AppState`.
- A delivery-unknown mutation must not be retried by a reducer or component.

---

## 4. DIRECTORY TREE

The folder is flat:

| File | Responsibility |
|---|---|
| [`app-state.svelte.ts`](./app-state.svelte.ts) | App-shell context, reducer stores, auth, overlays and theme. |
| [`runtime-issues.ts`](./runtime-issues.ts) | Allowlisted runtime issue copy. |
| [`runtime.ts`](./runtime.ts) | Runtime reducer, mode authority, plan lifecycle and transport adapters. |
| [`state.ts`](./state.ts) | Connection, session and transcript reducers plus display parsing. |
| [`todo-model.ts`](./todo-model.ts) | Ordered todo sections, group runs and progress. |
| [`todo-state.ts`](./todo-state.ts) | Todo projection reducer and announcements. |
| [`turns.ts`](./turns.ts) | Conversational turn grouping. |
| [`unread-overlay.ts`](./unread-overlay.ts) | Device-local unread/seen overlay that never writes status. |
| [`use-runtime.svelte.ts`](./use-runtime.svelte.ts) | Live runtime refresh and mutation lifecycle. |
| [`README.md`](./README.md) | Feature orientation and reducer-versus-component guidance. |
| [`CODE.md`](./CODE.md) | This code-folder map. |

---

## 5. KEY FILES

| File | Responsibility |
|---|---|
| [`state.ts`](./state.ts) | Reconciles cache, page, snapshot, delta, gap and optimistic prompt actions into display transcript state. |
| [`runtime.ts`](./runtime.ts) | Keeps host-confirmed runtime data separate from pending intent and maps outcomes to phases. |
| [`use-runtime.svelte.ts`](./use-runtime.svelte.ts) | Coalesces read-only hydration, aborts stale generations and turns unresolved writes into delivery-unknown. |
| [`todo-state.ts`](./todo-state.ts) | Accepts only session and epoch-matching envelopes and asks for refresh on an unsafe delta chain. |
| [`todo-model.ts`](./todo-model.ts) | Sorts tasks, groups contiguous runs and calculates progress. |
| [`app-state.svelte.ts`](./app-state.svelte.ts) | Provides stable reducer dispatchers and shared shell state through Svelte context. |

---

## 6. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Session scope | Actions for another session return the current state and cannot write into the selected session. |
| Transcript epoch | A changed epoch clears the projection and waits for an authoritative snapshot. |
| Runtime authority | `state` changes only from hydrate or a typed host outcome. `pending` describes intent and never replaces it. |
| Todo revision | A delta must match the current plan and base revision. Otherwise the state requests a refresh. |
| Issue copy | Only allowlisted issue codes reach `runtimeIssueMessage`. |
| Component boundary | Components render state and dispatch actions. Reducers own transitions and invariants. |

Main flow:

```text
Sync message -> session and epoch guard -> transcriptReducer -> normalized blocks -> transcript surface
Runtime refresh -> hydrateSnapshot -> runtimeReducer -> modeAuthority -> controls
Runtime mutation -> pending state -> typed outcome -> accepted, stale, unsupported or delivery-unknown
Todo envelope -> plan and revision guard -> todoProjectionReducer -> buildTodoDisplayModel -> panel
```

---

## 7. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| `connectionReducer`, `sessionListReducer`, `transcriptReducer` | Reducers | Apply display state actions with session and sync guards. |
| `parseDisplayBlock` and `filePreviewAvailability` | Functions | Validate display blocks and resolve explicit or legacy preview availability. |
| `runtimeReducer` and `modeAuthority` | Reducer and projection | Track host-confirmed runtime state and expose the mode control contract. |
| `useRuntime` | Svelte lifecycle | Hydrate runtime state and run guarded model, effort, mode and plan controls. |
| `todoProjectionReducer` and `buildTodoDisplayModel` | Reducer and projection | Fold read-only todo data and shape it for display. |
| `groupBlocksIntoTurns` | Function | Group ordered transcript blocks around user prompts. |
| `createAppState`, `setAppState`, `getAppState` | Context functions | Create and retrieve the app-shell state context. |

---

## 8. VALIDATION

Run from the repository root:

```bash
node "$PWD/scripts/naming/scan-folder-docs.mjs"
```

The folder is healthy when both documents exist and the scan reports no broken references for this folder.

---

## 9. RELATED

- [`README.md`](./README.md)
- [Transport documentation](../transport/CODE.md)
- [Commands documentation](../commands/CODE.md)
- [Format documentation](../format/CODE.md)
- [Transcript documentation](../../pages/chat/transcript/CODE.md)
