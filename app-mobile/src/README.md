---
title: 'Web source: screen map (routes → pages → shared)'
description: 'The canonical route→folder→file map for the Svelte SPA: where each screen lives and how the shell, pages, and shared layers fit together.'
trigger_phrases:
  - 'pi remote web source'
  - 'svelte screen map'
  - 'where does this screen live'
---

# Web source — screen map

`src/` is the browser client for `@pi-remote/web`: a **Svelte 5 / SvelteKit SPA** (client-side only — `ssr = false`, `prerender = false`). Every screen and component is one `.svelte` file (markup + scoped `<style>` + typed `<script>`); all logic lives in `shared/data/`.

Open a screen by following the route to its page folder to the component file. This document is that map.

## The URL surface (`routes/`)

Only **three URLs** exist; Review and Inbox are overlays, and Enrollment is an auth branch (not a route).

| URL | Route file | Renders |
|-----|-----------|---------|
| `/` | `routes/+page.svelte` | `pages/home/Home.svelte` (session roster) |
| `/session/[id]` | `routes/session/[id]/+page.svelte` | `pages/chat/Chat.svelte` (the conversation) |
| `/attention/[lookupId]` | `routes/attention/[lookupId]/+page.svelte` | resolves the lookup, then redirects to the Review overlay or the target session |

- `routes/+layout.svelte` is the **app shell**: it mounts the context providers, theme, and service-worker registration, and hosts the **Review / Inbox overlays** above the routed page.
- `routes/+layout.ts` pins `ssr = false; prerender = false`.
- Pages read state + actions from the shell via context (`getAppState` / `getAppActions` from `shared/data/app-state.svelte.ts`); they don't fetch directly.

> The conversation view's file is `pages/chat/Chat.svelte`. The `/session/[id]` route and the internal session-protocol names are unchanged — the route still imports it as `Session`.

## Folder layout

```text
src/
├─ routes/            SvelteKit route files (the 3 URLs + the shell layout)
├─ pages/             one folder per screen
│  ├─ home/           Home (roster) + EmptyState, Freshness, PushSettings
│  ├─ chat/           Chat.svelte + its sub-areas:
│  │  ├─ artifacts/     artifact/image/pdf/code viewers
│  │  ├─ attachments/   attachment drafts + preview
│  │  ├─ chrome/        composer, header, runtime strip, plan-mode, palette
│  │  ├─ features/ask-question/   the ask-question card flow
│  │  ├─ rich-content/  markdown/rich block rendering
│  │  └─ transcript/    the transcript list + block rendering
│  ├─ review/         Review overlay
│  ├─ inbox/          Attention inbox overlay
│  └─ enrollment/     device-enrollment auth gate
├─ shared/
│  ├─ primitives/     accessible UI primitives (Button + Bits UI wrappers) — see its README
│  ├─ chrome/         shared chrome bits (Header, StatusPill, ThemeControl, …)
│  └─ data/           the logic layer (relay, auth, reducers, runes stores) — see its README
├─ app.css            global foundation: tokens, @font-face, theme blocks, resets
└─ app.html           the SPA shell document
```

Each folder carries its own `README.md` (what/why) and, where it earns one, a `CODE.md` (structure/logic).

## Boundaries

- **Screens are thin.** A page renders; it takes state/actions via `$props()` or shell context. Behaviour lives in `shared/data/`.
- **One socket, one cache, one auth store.** All relay traffic is in `shared/data/relay.ts`; storage in `cache.ts` (read-only snapshot) and `auth.ts` (device key). Don't open sockets or touch storage from a component.
- **Styling is co-located.** A component's CSS is in its own scoped `<style>`; only genuinely shared/global rules live in `app.css`.

## Validate (from repo root)

```bash
npm run build
npm run typecheck   # svelte-check
npm run test:web
```

## Related

- [Package README](../README.md) · [`shared/primitives/README.md`](./shared/primitives/README.md) · [`shared/data/README.md`](./shared/data/README.md)
