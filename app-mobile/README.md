---
title: 'Pi Remote Web: Installable PWA Client'
description: 'Svelte 5 / SvelteKit SPA (client-side only) that reads redacted Pi sessions from the relay and keeps an offline read-only cache.'
trigger_phrases:
  - 'pi remote web'
  - '@pi-remote/web'
---

# Pi Remote Web: Installable PWA Client

---

## 1. OVERVIEW

`app-mobile/` is the `@pi-remote/web` package, a **Svelte 5 / SvelteKit SPA** (client-side only) served by the relay. It renders redacted session transcripts, an exact-action review queue, an attention inbox, and device enrollment. Normal reads stay read-only. The service worker caches the app shell, and `src/shared/data/cache.ts` keeps a bounded offline read-only snapshot.

Current state:

- Svelte 5 (runes) with **Bits UI** accessible primitives and `@tanstack/svelte-virtual`
- SvelteKit in SPA/CSR mode — `adapter-static`, `ssr = false`, `prerender = false`
- Tailwind CSS 4 through the `@tailwindcss/vite` plugin
- WebSocket sync with the relay through `src/shared/data/relay.ts`
- Service worker registered from `src/routes/+layout.svelte` (production only)
- Dev and preview servers proxy `/api` and `/health` to `http://127.0.0.1:4310`

---

## 2. ARCHITECTURE

```text
╭──────────────────────────────────────────────────────────────────╮
│                          app-mobile                              │
╰──────────────────────────────────────────────────────────────────╯

┌──────────────┐      ┌────────────────┐      ┌──────────────────┐
│ Browser      │ ───▶ │ Service worker │ ───▶ │ Relay            │
│ PWA install  │      │ shell cache    │      │ /api  /api/sync  │
└──────┬───────┘      └────────────────┘      └──────────────────┘
       │
       ▼
┌────────────────┐      ┌────────────────┐
│ src/           │ ───▶ │ localStorage   │
│ Svelte SPA     │      │ read-only cache│
└────────────────┘      └────────────────┘
```

The relay serves the built app, the manifest, and the service worker. The dev server proxies the same API to a local relay at port 4310.

---

## 3. DIRECTORY TREE

```text
app-mobile/
├─ src/
│  ├─ routes/         # SvelteKit routes (3 URLs + the +layout shell)
│  ├─ pages/          # one folder per screen (home, chat, review, inbox, enrollment)
│  ├─ shared/         # primitives (a11y UI), chrome, data (logic layer)
│  ├─ app.css         # global foundation: tokens, @font-face, theme blocks, resets
│  └─ app.html        # SPA shell document
├─ static/            # manifest, service worker, icons (served as-is)
├─ tests/             # Vitest + @testing-library/svelte component suite
├─ svelte.config.js   # adapter-static, CSP, SPA fallback
├─ vite.config.ts     # SvelteKit + Tailwind plugins, relay proxy
├─ package.json
└─ README.md
```

Each `src/` folder carries its own `README.md` (what/why) and, where it earns one, a `CODE.md` (structure/logic). Start at `src/README.md` for the route→folder→file screen map.

---

## 4. KEY FILES

| File | Responsibility |
|------|----------------|
| `src/routes/+layout.svelte` | The app shell: context providers, theme, service-worker registration, Review/Inbox overlays |
| `src/routes/+layout.ts` | `ssr = false; prerender = false` — pure client render |
| `src/pages/chat/Chat.svelte` | The conversation view (socket, virtualizer, composer); the largest screen |
| `src/shared/data/` | The logic layer — relay client, auth, reducers, runes stores |
| `svelte.config.js` · `vite.config.ts` | Adapter/CSP/SPA config; plugin setup + dev relay proxy |

---

## 5. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|------------|------|---------|
| `npm run dev` | Script | Vite dev server with relay proxy |
| `npm run build` | Script | `vite build` (SvelteKit static SPA into `dist/`) |
| `npm run preview` | Script | Serve the built app with the relay proxy |
| `src/routes/+layout.svelte` | Module | First file to read for the app shell + bootstrap |

---

## 6. VALIDATION

Run from the repository root.

```bash
npm run test:web
npm run typecheck -w @pi-remote/web   # svelte-check
npm run build -w @pi-remote/web
```

Expected result: the web suite passes, `svelte-check` reports no errors, and `dist/` contains the built app with the copied `static/` assets.

---

## 7. RELATED

- [`src/` README (screen map)](./src/README.md)
- [`tests/` README](./tests/README.md)
