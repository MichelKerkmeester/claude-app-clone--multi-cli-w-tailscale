# Routes

> The SvelteKit URL adapters and app shell for the web client.

---

## 1. OVERVIEW

`routes/` maps the browser URL to a page component and keeps the cross-route lifecycle in
`+layout.svelte`. The client has three URLs: `/`, `/session/[id]` and `/attention/[lookupId]`.
Review and Inbox are overlays hosted by the layout. Enrollment is the authentication branch shown
before a routed page renders.

Routes read state and actions from `shared/state/app-state.svelte.ts`. They do not open the relay
socket or fetch session data themselves. That split keeps the URL contract visible here while page
behavior and network work stay in their owning folders.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Status | Shipped SvelteKit SPA route layer |
| URL surface | `/`, `/session/[id]` and `/attention/[lookupId]` |
| Shared shell | Authentication, theme, cache, relay roster and overlays |
| Render mode | Client-side only through `+layout.ts` |

---

## 2. FEATURES

| Feature | What it does |
|---|---|
| Home route | Passes the session roster and shell actions to `pages/home/screen-home.svelte`. |
| Session route | Reads `[id]`, finds its roster status and passes live state to `pages/chat/screen-chat.svelte`. |
| Attention deep link | Reads `[lookupId]`, resolves the attention item and replaces the URL with the review or session destination. |
| App shell | Keeps enrollment, relay bootstrap, theme updates, cache writes, Review and Inbox outside individual pages. |

The route files stay thin on purpose. A change to what a person sees belongs in the page folder. A
change to relay or state behavior belongs in `shared/`.

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Browser runtime | SvelteKit client rendering | `+layout.ts` exports `ssr` and `prerender` as `false`. |
| App context | `getAppState` and `getAppActions` | The layout installs the context before child routes read it. |
| Page components | Home and chat screen components | Routes pass state and callbacks into the page API. |

---

## 4. STRUCTURE

```text
routes/
+-- +layout.svelte                         # app shell and child rendering
+-- +layout.ts                             # client-only route configuration
+-- +page.svelte                            # /
+-- attention/[lookupId]/+page.svelte       # attention deep-link resolver
`-- session/[id]/+page.svelte                # live session page
```

| Path | Role |
|---|---|
| [`+layout.svelte`](./+layout.svelte) | Creates app state, runs auth and relay lifecycle effects, and hosts overlays. |
| [`+layout.ts`](./+layout.ts) | Disables server rendering and prerendering for the browser client. |
| [`+page.svelte`](./+page.svelte) | Connects `/` to the home screen. |
| [`attention/[lookupId]/+page.svelte`](./attention/[lookupId]/+page.svelte) | Resolves an attention lookup and redirects. |
| [`session/[id]/+page.svelte`](./session/[id]/+page.svelte) | Connects a session id to the chat screen. |

---

## 5. USAGE EXAMPLES

| Need | Start here |
|---|---|
| Change the home URL | [`+page.svelte`](./+page.svelte), then [`pages/home/README.md`](../pages/home/README.md) for screen behavior. |
| Change session route wiring | [`session/[id]/+page.svelte`](./session/[id]/+page.svelte), then [`pages/chat/README.md`](../pages/chat/README.md). |
| Change an attention deep link | [`attention/[lookupId]/+page.svelte`](./attention/[lookupId]/+page.svelte), then [`attention/[lookupId]/README.md`](./attention/[lookupId]/README.md). |
| Change enrollment or overlay order | [`+layout.svelte`](./+layout.svelte) and [`shared/README.md`](../shared/README.md). |

---

## 6. TROUBLESHOOTING

| What you see | Cause | Fix |
|---|---|---|
| A route renders the enrollment screen | The layout has not established a device session. | Follow the auth path in [`shared/transport/auth.ts`](../shared/transport/auth.ts). |
| A session page shows `unknown` status | The id is not present in the loaded session roster. | Check the roster and the `[id]` value before changing the route adapter. |
| An attention URL stays on the Inbox | The lookup failed or the relay rejected it. | Inspect [`shared/format/attention.ts`](../shared/format/attention.ts) and the relay response state. |
| The page has no server-rendered HTML | This package is a client-only SPA by design. | Run the web package in a browser and check `+layout.ts`. |

---

## 7. RELATED RESOURCES

| Document | Purpose |
|---|---|
| [`CODE.md`](./CODE.md) | Import boundaries, route flow and entrypoints. |
| [`src/README.md`](../README.md) | Source-root map for routes, pages and shared logic. |
| [`attention/[lookupId]/README.md`](./attention/[lookupId]/README.md) | Meaning and behavior of the attention parameter. |
| [`session/[id]/README.md`](./session/[id]/README.md) | Meaning and behavior of the session parameter. |
| [`shared/README.md`](../shared/README.md) | State, transport, formatting and primitive ownership. |
