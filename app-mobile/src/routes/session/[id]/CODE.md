# session/[id]/: session route adapter

---

## 1. OVERVIEW

`+page.svelte` is the adapter between `$page.params.id`, app context and
`pages/chat/screen-chat.svelte`. It derives the current session status from the roster and passes the
live state and shell callbacks required by the chat page.

The route does not create a socket or reduce transcript events. It hands those responsibilities to the
chat screen and the shared state and transport modules.

---

## 2. ARCHITECTURE

```text
$page.params.id
       |
       v
  +page.svelte
       |
       +--> getAppState -> roster status, connection, transcript, theme
       +--> getAppActions -> Back, Inbox and Review callbacks
       |
       v
pages/chat/screen-chat.svelte
       |
       v
shared state and transport -> socket, runtime and transcript updates
```

The route keeps the id in the URL. It passes the same id to the chat screen and derives the roster
status with `unknown` as the fallback when the session has not entered the roster yet.

---

## 3. KEY FILES

| File | Responsibility |
|---|---|
| [`+page.svelte`](./+page.svelte) | Reads the id, derives status and passes the chat page props. |

---

## 4. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| URL | `$page.params.id` selects the session. Do not mirror it in route-local state. |
| State | `getAppState` supplies connection, transcript, todo, theme and capability values. |
| Actions | `getAppActions` supplies navigation and overlay callbacks. |
| Page ownership | `pages/chat/screen-chat.svelte` owns the socket, composer and transcript presentation. |
| Transport | Relay requests and sync socket code stay in `shared/transport/`. |

---

## 5. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| [`+page.svelte`](./+page.svelte) | Route module | Renders one live session for `/session/[id]`. |

---

## 6. VALIDATION

Run from the repository root:

```bash
node scripts/naming/scan-folder-docs.mjs
npm run typecheck -w @pi-remote/web
```

Expected result: the scan resolves this folder's references and the web package typecheck passes.

---

## 7. RELATED

- [`README.md`](./README.md)
- [`Routes CODE.md`](../../CODE.md)
- [`pages/chat/screen-chat.svelte`](../../../pages/chat/screen-chat.svelte)
- [`shared/state/app-state.svelte.ts`](../../../shared/state/app-state.svelte.ts)
- [`shared/transport/relay.ts`](../../../shared/transport/relay.ts)
