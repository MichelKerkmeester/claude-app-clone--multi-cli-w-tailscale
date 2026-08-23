# `state/` — structure & logic

Editor map. For *what/why*, see `README.md`.

## Shape

- **`state.ts`** — `connectionReducer`, `sessionListReducer`, `transcriptReducer`, `parseDisplayBlock`, `filePreviewAvailability`, and the display state types.
- **`runtime.ts`** — `RuntimeUiState`, `RuntimeAction`, `runtimeReducer`, `modeAuthority`, `runtimeAnnouncement`, `hydrateSnapshot`, and `planExecutionTransport`.
- **`use-runtime.svelte.ts`** — `useRuntime`; read-only hydrate coalescing, generation guards, mutation deadlines, control wrappers, plan review, and execution.
- **`app-state.svelte.ts`** — `createAppState`, `setAppState`, `getAppState`, `setAppActions`, and `getAppActions`; route-owned session identity remains outside this store.
- **`todo-state.ts` / `todo-model.ts`** — `todoProjectionReducer` and `buildTodoDisplayModel`; snapshots and deltas are folded only when their session, epoch, plan, and revision match.
- **`turns.ts` / `runtime-issues.ts`** — `groupBlocksIntoTurns` and `runtimeIssueMessage`; one derives grouping, the other provides bounded issue copy.

## Do-not

- **Don't commit pending intent as confirmed runtime state.** `control-start` shows pending; only a settled host response or hydrate may replace the confirmed snapshot.
- **Don't retry an ambiguous mutation.** Delivery-unknown is a terminal client outcome until a fresh read-only reconcile establishes authority.
- **Don't put the selected session id in app-shell state.** The SvelteKit route is the URL authority; `AppState` receives a session id through its consumers.
- **Don't let raw host issue text reach UI copy.** Use `RUNTIME_ISSUE_COPY` and `runtimeIssueMessage` for runtime failures.
- **Don't make todo projections writable from the phone.** `todoProjectionReducer` consumes sync data and exposes refresh needs; it does not create task mutations.
- **Don't collapse the pure reducer and its runes twin.** Keep DOM-free transitions in `.ts` and lifecycle, cancellation, and `$state` wiring in `.svelte.ts`.
