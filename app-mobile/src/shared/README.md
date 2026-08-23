# Shared data & logic layer

Everything the app *does* that isn't markup: the relay socket, device enrollment, the read-only cache, the display-state reducers, the slash-command logic, and the reactive stores the screens read from. If a screen needs behaviour, it comes from here — the `.svelte` files stay thin.

## What lives here

- **Network & IO clients** — `relay.ts` (the WebSocket sync client), `attention.ts` (attention + push), `auth.ts` (device enrollment), `cache.ts` (read-only cache).
- **State machines & reducers** — `state.ts` (the display reducers), `runtime.ts` (the non-optimistic runtime control machine), `commands.ts` (host-command catalog + fail-closed binding), `turns.ts` (derived conversational turns).
- **Reactive stores** (`*.svelte.ts`) — the live, runes-based lifecycles the UI subscribes to: `app-state`, `useRuntime`, `useSyncSocket`, `hostCommandCatalog`, `useVisualViewportAnchor`.
- **Composer / slash-command logic** — `insertSlashCommand`, `submitSlashDraft`, `useSlashTrigger`, `rankHostCommands`, `planModeShortcut`.
- **Catalogs & copy** — `effort.ts`, `model-catalog.ts`, `runtime-issues.ts`, `catalog-registry.ts`, plus `todo-*`, `demo.ts`, `format.ts`.

## Why it's shaped this way

- **Logic out of components.** Screens describe *what* renders; this layer owns *how* state moves. That's what keeps a component file openable and editable in one sitting.
- **The twin split (the key idea).** The core logic is a pure, framework-agnostic module (plain `.ts`: types + reducers + pure functions) paired with a `.svelte.ts` **runes twin** that owns the live reactivity and side-effects. The pure half is exhaustively unit-tested without a DOM; the runes half wires it into Svelte. See `CODE.md` for the twin table.
- **Security posture is partly enforced here** and is frozen: the relay is loopback-only, mutations are ticketed and fail-closed, the cache is read-only, push is content-free. Changing any of these is out of scope — stop and escalate.

Structure, the twin map, and the reactivity gotcha every editor must know are in **`CODE.md`**.
