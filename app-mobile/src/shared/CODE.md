# `shared/data/` — structure & logic

Editor-facing map. For *what it's for and why*, see `README.md`.

## The twin pattern (read this first)

The core stateful logic is split in two:

- a **pure module** (plain `.ts`) — types, reducers, and pure functions, no Svelte, no DOM, fully unit-tested; and
- a **runes twin** (`.svelte.ts`) — the live reactive lifecycle that drives the pure logic and owns effects/resources.

| Pure module | Runes twin | Owns |
|-------------|-----------|------|
| `runtime.ts` | `useRuntime.svelte.ts` | Non-optimistic runtime control machine + its live fetch/reconnect lifecycle. |
| `commands.ts` | `hostCommandCatalog.svelte.ts` | Host-command catalog types + fail-closed binding; its session-scoped fetch/refresh lifecycle. |
| `state.ts` | `app-state.svelte.ts` | The four display reducers; the app-shell runes stores over them. |

The twin holds its **own** working state — it does not import the pure module's runtime state, only its reducers/types/pure helpers. Keep the pure half framework-agnostic (that's what makes it testable); put every `$state`/`$effect`/`$derived` in the `.svelte.ts` half.

## File groups

- **Clients (IO):** `relay.ts`, `attention.ts`, `auth.ts`, `cache.ts`
- **Reducers / machines (pure):** `state.ts`, `runtime.ts`, `commands.ts`, `turns.ts`
- **Runes lifecycles (`.svelte.ts`):** `app-state`, `useRuntime`, `useSyncSocket`, `hostCommandCatalog`, `useVisualViewportAnchor`
- **Slash / composer (pure):** `insertSlashCommand`, `submitSlashDraft` (fail-closed), `useSlashTrigger`, `rankHostCommands`, `planModeShortcut`
- **Catalogs / copy:** `effort`, `model-catalog`, `runtime-issues`, `catalog-registry`, `model-switcher-strings`
- **Todo:** `todo-model`, `todo-state`
- **Misc helpers:** `format`, `view-helpers`, `demo` (offline preview fixtures)

## The reactivity gotcha every editor must know

A runes `$effect` that **synchronously dispatches a reducer which reads and then writes the same `$state`** self-invalidates: the sync read makes that state a dependency, the write re-triggers the effect, and an async twin's cleanup can cancel its own in-flight work. This has bitten this codebase repeatedly (mount/reconnect double-fetches, oscillating rosters, frozen auth).

**Fix:** wrap the dispatch in `untrack(...)`, and keep only the values you *want* to react to (e.g. `getSessionId()`) tracked outside it. When you touch any `.svelte.ts` effect here, trace what its dispatch reads/writes before trusting it — and remember one file can hold more than one effect, so fixing one doesn't clear the file.

## Do-not

- **No reactivity in the pure `.ts` modules** — they must stay DOM-free and unit-testable; reactivity belongs in the `.svelte.ts` twin.
- **Don't weaken the security posture** — relay loopback, ticketed fail-closed mutations, read-only cache, content-free push are frozen invariants.
- **Don't assume the twin re-uses the pure module's state** — it keeps its own; a reducer lives in both, intentionally.
- Seven files still lack a `// MODULE:` banner (`format`, `model-catalog`, `model-switcher-strings`, `todo-model`, `todo-state`, `view-helpers`) — backfill one when you next touch them.
