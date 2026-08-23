# Routes — the URL surface

The SvelteKit route files. This app is a **client-side SPA** (`+layout.ts` sets `ssr = false; prerender = false`) with only three URLs; Review and Inbox are overlays and Enrollment is an auth branch, so they have no route of their own.

## Files

| File | Role |
|------|------|
| `+layout.svelte` | The **app shell**: context providers, theme, service-worker registration, and the Review/Inbox overlays hosted above the routed page. |
| `+layout.ts` | `ssr = false; prerender = false` — pure client render. |
| `+page.svelte` | `/` → renders `pages/home/screen-home.svelte`. |
| `session/[id]/+page.svelte` | `/session/[id]` → renders `pages/chat/screen-chat.svelte`. |
| `attention/[lookupId]/+page.svelte` | `/attention/[lookupId]` → resolves the lookup, then redirects to the Review overlay or the target session. |

## Rules

- **Routes are thin adapters.** They pull state/actions from the shell (`getAppState` / `getAppActions`) and hand them to a page component — no business logic here.
- **The routing contract is frozen:** these exact three URLs, Review/Inbox as overlays, Enrollment as an auth branch. Changing routing behaviour is out of scope — stop and escalate.
- Navigation uses `goto` / `$app/navigation`, never manual `pushState`/`popstate`.
