---
title: 'Pi Remote Web: Installable PWA Client'
description: 'Vite plus React 19 PWA that reads redacted Pi sessions from the relay and keeps an offline read-only cache.'
trigger_phrases:
  - 'pi remote web'
  - '@pi-remote/web'
---

# Pi Remote Web: Installable PWA Client

---

## 1. OVERVIEW

`apps/pi-remote-web/` is the `@pi-remote/web` package, a Vite plus React 19 single page app served by the relay. It renders redacted session transcripts, an exact-action review queue, an attention inbox and device enrollment. Normal reads stay read-only. The service worker caches the app shell, and `src/cache.ts` keeps a bounded offline read-only snapshot in localStorage.

Current state:

- React 19 with `react-aria-components` and `@tanstack/react-virtual`
- Tailwind CSS 4 through the `@tailwindcss/vite` plugin
- WebSocket sync with the relay through `src/relay.ts`
- Service worker registered from `src/main.tsx` only when `import.meta.env.PROD` is true
- Dev and preview servers proxy `/api` and `/health` to `http://127.0.0.1:4310`

---

## 2. ARCHITECTURE

```text
╭──────────────────────────────────────────────────────────────────╮
│                     apps/pi-remote-web                           │
╰──────────────────────────────────────────────────────────────────╯

┌──────────────┐      ┌────────────────┐      ┌──────────────────┐
│ Browser      │ ───▶ │ Service worker │ ───▶ │ Relay            │
│ PWA install  │      │ shell cache    │      │ /api  /api/sync  │
└──────┬───────┘      └────────────────┘      └──────────────────┘
       │
       ▼
┌────────────────┐      ┌────────────────┐
│ src/           │ ───▶ │ localStorage   │
│ React app      │      │ read-only cache│
└────────────────┘      └────────────────┘
```

The relay serves the built app, the manifest and the service worker. The dev server proxies the same API to a local relay at port 4310.

---

## 3. DIRECTORY TREE

```text
apps/pi-remote-web/
+-- src/             # App, state reducers, relay client, auth, cache
+-- public/          # Manifest, service worker, icon
+-- tests/           # Vitest component suite
+-- vite.config.ts   # React and Tailwind plugins, relay proxy
+-- package.json
`-- README.md
```

---

## 4. KEY FILES

| File             | Responsibility                                                        |
| ---------------- | --------------------------------------------------------------------- |
| `src/main.tsx`   | Mounts `App` into `#root`, registers the service worker in production |
| `src/App.tsx`    | Root component with Enrollment, Home, Session, Review and Inbox views |
| `vite.config.ts` | Plugin setup and dev relay proxy                                      |
| `package.json`   | Build, dev, preview and typecheck scripts                             |

---

## 5. ENTRYPOINTS

| Entrypoint        | Type   | Purpose                                    |
| ----------------- | ------ | ------------------------------------------ |
| `npm run dev`     | Script | Vite dev server with relay proxy           |
| `npm run build`   | Script | Typecheck with `tsc -b`, then `vite build` |
| `npm run preview` | Script | Serve the built app with the relay proxy   |
| `src/main.tsx`    | Module | First file to read for app bootstrap       |

---

## 6. VALIDATION

Run from the repository root (`Apps/Pi Mobile`).

```bash
npm run test:web
npm run typecheck -w @pi-remote/web
npm run build -w @pi-remote/web
```

Expected result: the web suite passes, TypeScript reports no errors, and `dist/` contains the built app with the copied `public/` assets.

---

## 7. RELATED

- [`src/` README](../src/README.md)
- [`public/` README](../public/README.md)
- [`tests/` README](../tests/README.md)
