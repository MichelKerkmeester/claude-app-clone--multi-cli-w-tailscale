# routes/: URL adapters and app shell

---

## 1. OVERVIEW

`routes/` owns the SvelteKit entrypoints for the three browser URLs. `+layout.svelte` creates the
shared app state, runs authentication and relay lifecycle work, and chooses between Enrollment,
Review, Inbox and the routed child. The child route files only translate URL parameters and context
state into page component props.

Current state:

- [`+layout.ts`](./+layout.ts) exports client-only rendering flags.
- [`+layout.svelte`](./+layout.svelte) owns the shell lifecycle and renders `children` inside the active shell branch.
- [`+page.svelte`](./+page.svelte) wires `/` to [`pages/home/screen-home.svelte`](../pages/home/screen-home.svelte).
- The parameterized route files wire a session id or attention lookup to the existing page and shared logic.

---

## 2. ARCHITECTURE

The shell runs before every child route. The URL remains the source of truth for the selected session.

```text
Browser URL
    |
    v
+layout.ts
    |
    v
+layout.svelte
    |
    +--> auth and app state --> Enrollment or the authenticated shell
    +--> Review and Inbox overlays
    |
    +--> +page.svelte --------------------> pages/home/screen-home.svelte
    +--> session/[id]/+page.svelte --------> pages/chat/screen-chat.svelte
    `--> attention/[lookupId]/+page.svelte -> openAttentionHint -> goto
```

The layout supplies `getAppState` and `getAppActions`. The home route passes roster state into the
home screen. The session route derives `sessionId` and status from `$page.params` and passes transcript,
runtime and overlay callbacks into the chat screen. The attention route waits for authentication,
opens the lookup, then redirects with `replaceState`.

---

## 3. PACKAGE TOPOLOGY

```text
routes/
+-- +layout.svelte                         # shell lifecycle and child outlet
+-- +layout.ts                             # client-only configuration
+-- +page.svelte                            # home adapter
+-- attention/[lookupId]/+page.svelte       # attention resolver
`-- session/[id]/+page.svelte                # session adapter
```

Allowed direction:

```text
+layout.svelte -> shared/state, shared/transport, shared/format, shared/chrome, pages/
child route    -> shared/state, shared/format, pages/
pages/         -> shared/
```

The route folder does not own reducers, relay requests, socket lifecycles or screen markup. Keep those
changes in `shared/` or the relevant `pages/` folder.

---

## 4. DIRECTORY TREE

```text
routes/
+-- +layout.svelte
+-- +layout.ts
+-- +page.svelte
+-- attention/
|   `-- [lookupId]/+page.svelte
`-- session/
    `-- [id]/+page.svelte
```

---

## 5. KEY FILES

| File | Responsibility |
|---|---|
| [`+layout.svelte`](./+layout.svelte) | Creates app state, starts auth and roster effects, persists relay data and hosts overlays. |
| [`+layout.ts`](./+layout.ts) | Sets `ssr` and `prerender` to `false`. |
| [`+page.svelte`](./+page.svelte) | Passes home roster state and device actions to the home screen. |
| [`attention/[lookupId]/+page.svelte`](./attention/[lookupId]/+page.svelte) | Resolves a lookup and redirects to Review or a session. |
| [`session/[id]/+page.svelte`](./session/[id]/+page.svelte) | Finds the route session and passes live state to the chat screen. |

---

## 6. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| URL state | `$page.params.id` selects the session. Do not add a second selected-session store in the route layer. |
| Context | Child routes read `getAppState` and `getAppActions` installed by the layout. |
| Network | Auth, roster fetches, attention resolution and sockets stay in shared transport or format modules. |
| View ownership | Home and chat markup stays in `pages/`. Review, Inbox and Enrollment stay layout-owned branches. |
| Navigation | Route changes use `goto` with encoded ids and replace state for resolved attention links. |

Main flow:

```text
app.html
    |
    v
+layout.svelte
    |
    +--> establishSession -> app state -> authenticated shell
    +--> fetchSessions -> session roster and connection state
    `--> child route -> page component -> shared state and transport
```

---

## 7. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| [`+layout.svelte`](./+layout.svelte) | Module | First route file to inspect for auth, global state and overlay behavior. |
| [`+layout.ts`](./+layout.ts) | Configuration | Selects client-only SvelteKit rendering. |
| [`+page.svelte`](./+page.svelte) | Route module | Renders the home roster at `/`. |
| [`session/[id]/+page.svelte`](./session/[id]/+page.svelte) | Route module | Renders one live session at `/session/[id]`. |
| [`attention/[lookupId]/+page.svelte`](./attention/[lookupId]/+page.svelte) | Route module | Resolves an attention lookup without rendering a route-specific view. |

---

## 8. VALIDATION

Run from the repository root:

```bash
node scripts/naming/scan-folder-docs.mjs
npm run typecheck -w @pi-remote/web
```

Expected result: the folder scan reports route coverage and no unresolved references. The web package
typecheck reports no Svelte or TypeScript errors.

---

## 9. RELATED

- [`README.md`](./README.md)
- [`src/README.md`](../README.md)
- [`pages/chat/README.md`](../pages/chat/README.md)
- [`pages/home/README.md`](../pages/home/README.md)
- [`shared/README.md`](../shared/README.md)
