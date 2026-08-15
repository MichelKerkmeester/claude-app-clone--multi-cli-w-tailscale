---
title: 'Web Public Assets: Manifest, Service Worker and Icon'
description: 'Static assets copied verbatim to the built app root by Vite.'
trigger_phrases:
  - 'pi remote web public'
  - 'service worker'
---

# Web Public Assets: Manifest, Service Worker and Icon

---

## 1. OVERVIEW

`public/` holds three static files that Vite copies verbatim to the `dist/` root. The manifest declares the installable PWA, the service worker caches the app shell and renders attention notifications, and the icon is the maskable app icon.

Current state:

- `manifest.webmanifest` declares `start_url` `/` with standalone display
- `service-worker.js` is plain JavaScript, not bundled or typechecked
- `main.tsx` registers `/service-worker.js` only when `import.meta.env.PROD` is true
- The worker never intercepts `/api/` or `/health` requests

---

## 2. KEY FILES

| File                   | Responsibility                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `manifest.webmanifest` | PWA name, display mode, theme color, icon reference                                                                |
| `service-worker.js`    | Shell cache, navigation fallback, push notification display, notification click routing to `/attention/<lookupId>` |
| `icon.svg`             | 512 by 512 maskable π icon used by the manifest, notifications and badges                                          |

Service worker behavior:

```text
install ──▶ cache /, /index.html, /manifest.webmanifest, /icon.svg
fetch   ──▶ cache-first for same-origin GET, network for /api/ and /health
push    ──▶ show notification only for valid two-field attention hints
click   ──▶ navigate or open /attention/<lookupId>
```

---

## 3. VALIDATION

The folder has no test of its own. The build copies it into `dist/`.

```bash
npm run build -w @pi-remote/web
```

Expected result: `dist/` contains `manifest.webmanifest`, `service-worker.js` and `icon.svg` next to the built app.

---

## 4. RELATED

- [`Package README`](../README.md)
- [`src/` README](../src/README.md)
