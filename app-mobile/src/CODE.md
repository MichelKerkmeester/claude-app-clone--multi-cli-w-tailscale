# src/: route adapters, pages and shared runtime

---

## 1. OVERVIEW

`src/` is the browser client boundary. `routes/` owns URL entrypoints and the app shell. `pages/`
owns screen composition. `shared/` owns state, transport, formatting, primitives, catalogs and
fixtures. The root files provide the global stylesheet, document shell and SvelteKit type namespace.

Current state:

- The shell in [`routes/+layout.svelte`](./routes/+layout.svelte) establishes app context and chooses the auth, overlay or page branch.
- The route adapters pass URL-derived values and app state into the screen components under `pages/`.
- Shared transport includes [`shared/transport/auth.ts`](./shared/transport/auth.ts), [`shared/transport/cache.ts`](./shared/transport/cache.ts), [`shared/transport/relay.ts`](./shared/transport/relay.ts) and socket sync.
- Component-only styling stays in each Svelte file. Global tokens and shared surfaces stay in [`app.css`](./app.css).

---

## 2. ARCHITECTURE

```text
Browser document
       |
       v
routes/+layout.svelte
       |
       +--> shared/state/app-state.svelte.ts
       +--> shared/transport/auth.ts, relay.ts and cache.ts
       +--> Enrollment, Review and Inbox branches
       |
       +--> routes/+page.svelte ----------------------> pages/home/
       +--> routes/session/[id]/+page.svelte ----------> pages/chat/
       `--> routes/attention/[lookupId]/+page.svelte --> shared/format/attention.ts
                                                        |
                                                        `--> goto destination
```

A routed page receives state and actions from the shell. Screens compose shared primitives and call
shared transport or state modules through their page-level contracts. The relay client and socket
sync code never belong in a route adapter.

---

## 3. PACKAGE TOPOLOGY

```text
src/
+-- routes/                 # URL adapters and shell lifecycle
+-- pages/                  # screen composition
|   +-- home/
|   +-- chat/
|   +-- enrollment/
|   +-- inbox/
|   `-- review/
+-- shared/                 # reusable logic and UI support
|   +-- catalog/
|   +-- chrome/
|   +-- commands/
|   +-- fixtures/
|   +-- format/
|   +-- primitives/
|   +-- state/
|   +-- transport/
|   `-- viewport/
+-- app.css                 # global tokens and shared CSS
+-- app.html                # document shell
`-- app.d.ts                # application type namespace
```

Allowed direction:

```text
routes/ -> pages/ and shared/
pages/  -> shared/
shared/state/ -> shared/transport/ and shared/format/
shared/transport/ -> protocol package and browser network APIs
```

Disallowed direction:

```text
routes/ -> direct relay fetches or socket construction
pages/  -> duplicate app-wide auth or cache stores
components -> global CSS for a rule used by one component
```

---

## 4. DIRECTORY TREE

```text
src/
+-- routes/
|   +-- +layout.svelte
|   +-- +layout.ts
|   +-- +page.svelte
|   +-- attention/[lookupId]/+page.svelte
|   `-- session/[id]/+page.svelte
+-- pages/
|   +-- chat/
|   +-- enrollment/
|   +-- home/
|   +-- inbox/
|   `-- review/
+-- shared/
|   +-- catalog/
|   +-- chrome/
|   +-- commands/
|   +-- fixtures/
|   +-- format/
|   +-- primitives/
|   +-- state/
|   +-- transport/
|   `-- viewport/
+-- app.css
+-- app.html
`-- app.d.ts
```

---

## 5. KEY FILES

| File | Responsibility |
|---|---|
| [`routes/+layout.svelte`](./routes/+layout.svelte) | App state setup, auth retry, roster fetch, cache persistence, overlays and child outlet. |
| [`routes/+layout.ts`](./routes/+layout.ts) | Client-only SvelteKit rendering flags. |
| [`shared/state/app-state.svelte.ts`](./shared/state/app-state.svelte.ts) | Context-backed runes state and stable app actions. |
| [`shared/state/state.ts`](./shared/state/state.ts) | Connection, roster and transcript reducers and parsers. |
| [`shared/transport/auth.ts`](./shared/transport/auth.ts) | Device enrollment, session restoration, logout and revocation. |
| [`shared/transport/cache.ts`](./shared/transport/cache.ts) | Bounded read-only local snapshot load and save. |
| [`shared/transport/relay.ts`](./shared/transport/relay.ts) | Typed relay requests, runtime operations, artifact reads and sync socket setup. |
| [`app.css`](./app.css) | Design tokens, theme remaps, resets and shared surfaces. |
| [`app.html`](./app.html) | Metadata, manifest link, icon link and SvelteKit body slot. |

---

## 6. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| URL to page | `routes/` reads URL parameters and passes them to the page component. |
| Page to logic | `pages/` composes views and uses shared contracts. It does not create a second app-wide state store. |
| State to transport | `shared/state/` models display state. `shared/transport/` talks to the relay and browser storage. |
| Styles | `app.css` owns global tokens and styles shared by multiple surfaces. Component-only CSS stays scoped. |
| Offline data | `shared/transport/cache.ts` stores a read-only projection. It never becomes a mutation source. |

Main flow:

```text
app.html
    |
    v
routes/+layout.svelte
    |
    +--> establishSession -> app state -> Enrollment or authenticated shell
    +--> fetchSessions -> roster and connection reducers
    +--> child route -> page component -> shared runtime and transport
    `--> saveCache -> read-only browser snapshot
```

---

## 7. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| [`routes/+layout.svelte`](./routes/+layout.svelte) | Module | First file to read for the browser lifecycle and shell branches. |
| [`routes/+page.svelte`](./routes/+page.svelte) | Route module | Home roster entrypoint. |
| [`shared/state/app-state.svelte.ts`](./shared/state/app-state.svelte.ts) | Module | Context entrypoint for app state and shell actions. |
| [`shared/transport/relay.ts`](./shared/transport/relay.ts) | Module | Relay request and socket entrypoint for live data. |
| [`app.html`](./app.html) | Document | Browser metadata and SvelteKit document wrapper. |

---

## 8. VALIDATION

Run from the repository root:

```bash
node scripts/naming/scan-folder-docs.mjs
npm run typecheck -w @pi-remote/web
```

Expected result: every source folder has both document types, references resolve and the web package
typecheck passes.

---

## 9. RELATED

- [`README.md`](./README.md)
- [`routes/CODE.md`](./routes/CODE.md)
- [`shared/README.md`](./shared/README.md)
- [`pages/chat/README.md`](./pages/chat/README.md)
- [`pages/home/README.md`](./pages/home/README.md)
