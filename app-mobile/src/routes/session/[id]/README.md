# Session route

> Render one live session at `/session/[id]`.

---

## 1. OVERVIEW

`/session/[id]` connects a URL session id to `pages/chat/screen-chat.svelte`. The `[id]` value comes
from the SvelteKit route and identifies the session to display. The route reads app context, looks up
the session status in the loaded roster and passes transcript, runtime, theme and overlay callbacks to
the chat screen.

The route does not own the socket, composer or transcript reducers. Those remain in the chat page and
the shared state and transport folders.

---

## 2. FEATURES

| Feature | What it does |
|---|---|
| Session selection | Uses `[id]` as the URL source of truth for the active session. |
| Live screen wiring | Passes connection, transcript, todo, media and question state to the chat screen. |
| Shell actions | Sends Back, Inbox, Review and theme changes to the app shell. |

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Parameter | A non-empty `id` | SvelteKit matches this folder only when the session id exists. |
| App context | `getAppState` and `getAppActions` | The layout installs both before the route reads them. |
| Session page | `pages/chat/screen-chat.svelte` | The route passes the complete page input contract. |

---

## 4. STRUCTURE

This folder has one source file:

| File | Role |
|---|---|
| [`+page.svelte`](./+page.svelte) | Reads `[id]`, derives status and renders the chat screen. |

---

## 5. IMPLEMENTATION BOUNDARIES

This route is an adapter between the URL, app context and the chat screen.

| Boundary | Rule |
|---|---|
| URL | `+page.svelte` reads `$page.params.id` and keeps that value as the source of truth for the active session. |
| App context | `getAppState` supplies roster, connection, transcript, todo, media, question and theme state. `getAppActions` supplies shell navigation and overlay callbacks. |
| Chat screen | [`pages/chat/screen-chat.svelte`](../../../pages/chat/screen-chat.svelte) receives the complete page input contract and owns socket, composer and transcript presentation. |
| Fallback | The route derives `unknown` when the roster has no status for the URL id. It still passes the URL id to the chat screen. |

Put URL and prop-wiring changes in `+page.svelte`. Put session rendering changes in `pages/chat/screen-chat.svelte`. Put socket, reducer and relay changes in the shared state and transport modules.

Run the folder scan and the web typecheck from the repository root:

```bash
node scripts/naming/scan-folder-docs.mjs
npm run typecheck -w @pi-remote/web
```

---

## 6. USAGE EXAMPLES

| Situation | Result |
|---|---|
| A person selects a session on `/` | Navigation encodes the id and opens `/session/[id]`. |
| The roster has no matching status | The route passes `unknown` while the chat screen still receives the URL id. |
| Back is selected | The shell navigates to `/`. |
| Inbox or Review is selected | The shell opens the corresponding overlay without changing session ownership. |

---

## 7. TROUBLESHOOTING

| What you see | Cause | Fix |
|---|---|---|
| The session shows `unknown` status | The roster does not contain the URL id yet. | Check roster loading and the exact encoded session id. |
| The route renders the enrollment screen | The shell has no authenticated device session. | Follow [`shared/transport/auth.ts`](../../../shared/transport/auth.ts). |
| The page has no live transcript | Socket and transcript work belong to the chat page and shared transport. | Inspect [`pages/chat/README.md`](../../../pages/chat/README.md) and `shared/transport/relay.ts`. |

---

## 8. RELATED RESOURCES

| Document | Purpose |
|---|---|
| [`Routes README`](../../README.md) | URL surface and app shell behavior. |
| [`Chat README`](../../../pages/chat/README.md) | Session screen behavior and sub-areas. |
| [`pages/chat/screen-chat.svelte`](../../../pages/chat/screen-chat.svelte) | Page component receiving the route props. |
