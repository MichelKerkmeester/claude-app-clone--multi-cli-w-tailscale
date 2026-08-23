# Web source: routes, screens and shared logic

> The SvelteKit source tree for the `@pi-remote/web` browser client.

---

## 1. OVERVIEW

`src/` contains the Svelte 5 browser client. `routes/` maps the three URLs to page components,
`pages/` owns screen markup and `shared/` owns state, transport, formatting, primitives and catalogs.
`app.css`, `app.html` and `app.d.ts` provide the global style foundation, document shell and type
augmentation.

The useful editing path is route to page to shared logic. A route supplies URL parameters and shell
callbacks. A page composes the view. Shared modules handle relay requests, device enrollment, the
read-only cache and state transitions.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Status | Shipped Svelte 5 and SvelteKit SPA source |
| URL surface | `/`, `/session/[id]` and `/attention/[lookupId]` |
| Screen groups | Home, chat, Review, Inbox and Enrollment |
| Offline behavior | Cached roster and transcript data stays read-only |

---

## 2. FEATURES

| Feature | What it does |
|---|---|
| Routed screens | Connects the URL to the home roster, one live session or an attention resolver. |
| Shared runtime | Keeps app state, reducers, relay sync, runtime controls and formatting outside route files. |
| Device access | Enrolls a device, restores its session and reports auth state to the shell. |
| Read-only cache | Seeds the first paint from local storage and writes only relay-sourced display data. |
| Global styling | Keeps tokens and shared surfaces in `app.css` while component-only rules stay scoped. |

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Web package | `@pi-remote/web` | Scripts live in `app-mobile/package.json`. |
| Runtime | Svelte 5 and SvelteKit | Components use Svelte markup, runes and scoped styles. |
| Live data | An enrolled browser and the relay | The cache can show a read-only snapshot before the relay responds. |

---

## 4. STRUCTURE

```text
src/
+-- routes/       # URL adapters and the app shell
+-- pages/        # Home, chat, Review, Inbox and Enrollment screens
+-- shared/       # State, transport, formatting, primitives and catalogs
+-- app.css       # Global tokens and shared surfaces
+-- app.html      # Browser document shell
`-- app.d.ts      # SvelteKit App namespace augmentation
```

| Folder or file | Role |
|---|---|
| [`routes/README.md`](./routes/README.md) | URL map and route behavior. |
| [`pages/`](./pages/) | Screen components and chat sub-areas. |
| [`shared/README.md`](./shared/README.md) | Shared state and logic map. |
| [`shared/state/`](./shared/state/) | Reducers, runes state and runtime state. |
| [`shared/transport/`](./shared/transport/) | Relay calls, socket sync, device auth and cache. |
| [`app.css`](./app.css) | Theme tokens, global resets and shared styling surfaces. |
| [`app.html`](./app.html) | HTML metadata, manifest and SvelteKit body slot. |

The source subfolders are `pages/chat`, `pages/enrollment`, `pages/home`, `pages/inbox`,
`pages/review`, `shared/catalog`, `shared/chrome`, `shared/commands`, `shared/fixtures`,
`shared/format`, `shared/primitives`, `shared/state`, `shared/transport` and `shared/viewport`.
Each source folder has a feature README. Larger folders also have a CODE document for code flow.

---

## 5. USAGE EXAMPLES

| Change you need | Start here |
|---|---|
| Change the home URL | [`routes/+page.svelte`](./routes/+page.svelte), then [`pages/home/README.md`](./pages/home/README.md). |
| Change session routing | [`routes/session/[id]/+page.svelte`](./routes/session/[id]/+page.svelte), then [`pages/chat/README.md`](./pages/chat/README.md). |
| Change the attention deep link | [`routes/attention/[lookupId]/+page.svelte`](./routes/attention/[lookupId]/+page.svelte), then [`shared/format/attention.ts`](./shared/format/attention.ts). |
| Change device enrollment | [`shared/transport/auth.ts`](./shared/transport/auth.ts) and [`pages/enrollment/screen-enrollment.svelte`](./pages/enrollment/screen-enrollment.svelte). |
| Change relay or socket behavior | [`shared/transport/relay.ts`](./shared/transport/relay.ts) and [`shared/transport/use-sync-socket.svelte.ts`](./shared/transport/use-sync-socket.svelte.ts). |
| Change cached first paint | [`shared/transport/cache.ts`](./shared/transport/cache.ts) and [`shared/state/app-state.svelte.ts`](./shared/state/app-state.svelte.ts). |

---

## 6. TROUBLESHOOTING

| What you see | Cause | Fix |
|---|---|---|
| A page cannot read app state | The route or page is outside the layout context. | Check [`routes/+layout.svelte`](./routes/+layout.svelte) and use the context accessors from [`shared/state/app-state.svelte.ts`](./shared/state/app-state.svelte.ts). |
| The first paint shows old sessions | The browser loaded the read-only cache before relay sync. | Check [`shared/transport/cache.ts`](./shared/transport/cache.ts), then wait for the roster fetch. |
| A component cannot reach the relay | Transport work was added to a view without the shared client path. | Move the request to [`shared/transport/relay.ts`](./shared/transport/relay.ts) and pass state into the page. |
| A style change affects every screen | The rule was placed in `app.css` instead of a component's scoped style. | Keep global tokens and shared surfaces in `app.css`. Put one-component rules beside that component. |

---

## 7. FAQ

**Q: Why do Review and Inbox have no route folder?**

A: `routes/+layout.svelte` renders them as authenticated overlays. Enrollment is the unauthenticated
branch in the same shell.

**Q: Where does the selected session id live?**

A: In the SvelteKit URL at `/session/[id]`. The app state stores the transcript and roster, not a
second selected-session value.

**Q: Which files hold device auth and cache behavior?**

A: [`shared/transport/auth.ts`](./shared/transport/auth.ts) owns device enrollment and sessions.
[`shared/transport/cache.ts`](./shared/transport/cache.ts) owns the bounded read-only snapshot.

---

## 8. RELATED RESOURCES

| Document | Purpose |
|---|---|
| [`CODE.md`](./CODE.md) | Source-root architecture, dependency direction and flow. |
| [`routes/README.md`](./routes/README.md) | URL surface and route-specific guidance. |
| [`routes/CODE.md`](./routes/CODE.md) | Route entrypoints and shell boundaries. |
| [`shared/README.md`](./shared/README.md) | Shared behavior and logic ownership. |
| [`pages/chat/README.md`](./pages/chat/README.md) | Chat screen and its sub-areas. |
