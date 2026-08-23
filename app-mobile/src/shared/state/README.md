# State

The app's runtime and display state: reducers, host-authoritative controls, todo projections, conversational turns, and the Svelte context stores that screens read. This folder changes when a state transition, authority rule, or display projection changes, not when a wire request merely changes shape.

## What lives here

- **`state.ts`** — connection, session-list, and transcript state types and reducers, display-block parsing, media capability defaults, and the composer keyboard preference.
- **`runtime.ts` / `use-runtime.svelte.ts`** — the non-optimistic runtime state machine and its Svelte runes twin. Confirmed host state, pending intent, delivery uncertainty, plan review, and execution stay distinct.
- **`app-state.svelte.ts`** — the app-shell context with connection, session, transcript, and todo reducer stores plus auth, overlay, and theme state.
- **`todo-state.ts` / `todo-model.ts`** — the read-only todo projection reducer and its grouped display model, progress, ordering, and concise announcements.
- **`turns.ts`** — `groupBlocksIntoTurns`, which groups normalized transcript blocks without dropping or rewriting them.
- **`runtime-issues.ts`** — the bounded local catalog that maps protocol issue codes to visible and accessible copy.

## Why it's shaped this way

- **Transitions are explicit.** Reducers make connection, session, transcript, runtime, and todo changes reviewable without a component or browser DOM.
- **Host authority is not optimistic.** A control request records pending intent; confirmed runtime state moves only after a host snapshot or accepted outcome supplies it.
- **Pure state and live reactivity have a twin boundary.** Plain TypeScript owns transitions and can be tested without a DOM; `.svelte.ts` modules own `$state`, effects, cancellation, and context.
- **Projections stay read-only.** Todo data and transcript turns are derived views of host data. They do not become a second mutation path.

Structure, reducer boundaries, and reactivity do-nots are in `CODE.md`.
