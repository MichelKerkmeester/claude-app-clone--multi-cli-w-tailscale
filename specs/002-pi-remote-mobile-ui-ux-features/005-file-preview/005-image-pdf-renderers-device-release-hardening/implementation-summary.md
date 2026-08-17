# Implementation Summary — Phase 4 — Image/PDF renderers and device release hardening

## Final state

Complete and verified (automated gates); the physical-device pass is operator-required. Typed previews now cover sanitized raster PNG images and controlled PDF.js rendering, with binary Share, memory budgets, revocation/bfcache lifecycle, PWA safe-area, and cache-exclusion hardening. This completes FEATURE 005 (file-preview) — all four phases. Implemented by GPT-5.6 Luna Max (via the Cursor CLI, `--force`, after opencode-go capped and Devin's quota was exhausted); orchestrated and verified by Claude.

## What shipped (relay + web)

- **Relay binary sanitizer** (`store/artifact-sanitizer.ts`, `artifact-store.ts`, `http/server.ts`): images sanitized PNG-only via full decode → re-encode from raw RGBA (strips EXIF/color-profiles/ancillary chunks); thumbnails derived only from sanitized pixels; other image MIME types withheld. PDFs are admitted `textLayerSafe` ONLY when a header + active-content scan (JS/actions, `Annots/Link/Widget/3D`, `Metadata/PieceInfo`) finds nothing unsafe — otherwise `withheld` (fail-closed). Range responses keep exact digest/ETag identity; invalid ranges → 416.
- **`ImagePreview.tsx`** (new): renders sanitized raster in a carbon stage with bounded 1×–4× zoom, fit/double-tap/pan, and visible Zoom out/Fit/Zoom in controls (never gesture-only); no metadata surface (the bytes are already stripped server-side).
- **`PdfPreview.tsx`** (new): lazy PDF.js with a SELF-HOSTED worker (Vite `?url`, no CDN), `annotationMode: 0` (no annotations/links), `enableXfa: false`, `disableAutoFetch`/`disableStream`, `stopAtErrors`; renders only adjacent pages, bounded pages/canvases/pixels/dimensions; page labels, Previous/Next, Fit-width/zoom; selection/search only when `block.textLayerSafe === true` — unsafe/unverified PDFs never create a text layer and stay `withheld`.
- **Lifecycle/memory** (`ArtifactViewerProvider.tsx`, `ArtifactViewerHost.tsx`, `useArtifactResource.ts`): close/revoke/expiry/visibility/bfcache abort work and dispose workers/canvases/documents/blob-URLs; `getPdfPreviewRuntimeMetrics()` exposes live worker/canvas counts for a memory test proving no monotonic growth across repeated open/close. The Phase-3 exact-revision digest-verify-before-commit and generation-based A/B race isolation are preserved unchanged.
- **Binary Share** (`artifact-share.ts`): prepares only the displayed exact sanitized bytes as a `File` and shares `{ title, files:[file] }` — no `url`, no host handoff; requires policy + `navigator.canShare({ files })`; safe filename; bytes zeroed after copy; cancellation is a no-op.
- **App/state/cache/PWA** (`App.tsx`, `state.ts`, `cache.ts`, `main.tsx`, `index.html`, `style.css`, `public/service-worker.js`): `pageshow`/bfcache revalidation, heartbeat offline mapping, no persistence of bodies/Files/blob-URLs, safe-area, revocation behavior, 320/200%/RTL/reduced-motion; artifact routes stay excluded from Cache Storage + the service worker.
- **Dependency**: `pdfjs-dist@6.2.108` pinned exactly (no range) in `apps/pi-remote-web/package.json` + root `package-lock.json`; the build emits a local `pdf.worker` asset via `vite.config.ts`.

## Verification (Claude, in the worktree, OUTSIDE the cursor session)

- Blast check: the main checkout is untouched (cursor ran `--force --sandbox disabled` inside the worktree; RM-8 mitigation held — prompt guards, worktree isolation, committed baseline `adf1db3`).
- `npm run build` → exit 0 (PDF.js worker bundles); `npm run typecheck` → exit 0.
- `npm test` → exit 0, **246 passed (32 files)** (+9: binary sanitizer, image/PDF relay, range/redaction).
- `npm run test:web` → exit 0, **511 passed (34 files)** (+10: ImagePreview, PdfPreview, artifact-memory, binary-share). Phase 1/2/3 unchanged.
- CDP: `file-preview-cdp.mjs --fixture image-pdf-release --theme {light,dark}` → both exit 0, exactly 390 CSS px, no horizontal overflow; screenshots inspected — an unsafe PDF renders the fail-closed `withheld` card ("The relay withheld this preview") in both themes.
- Security review (Claude read the diffs): self-hosted PDF worker + annotations/XFA disabled + text-layer only when attested safe; image decode/re-encode strips metadata; unsafe PDFs withheld; binary Share is files-only with `canShare({files})` and mints no URL; resource-hook digest-verify + race isolation intact; artifacts excluded from every cache.

## Frozen contracts

- Design: locked ink-on-parchment tokens only, Inter + Source Serif 4, ≥44px targets; no new colors/typeface.
- Security preserved/strengthened: sanitized binary only, no active PDF content, fail-closed withholding, exact-revision + immutable-identity reads, no URL/host-handoff/mutation, bounded memory, cache exclusion, read-only-by-default and Plan mode intact.

## Deferred / operator-required (NOT fabricated)

- The installed-PWA physical-device pass on the oldest supported iPhone — portrait/landscape, VoiceOver, rotation, app-switcher exposure, bfcache resume, relay-loss, repeated open/close, safe areas, 200% text, reduced motion, Safari + standalone — CANNOT run headlessly and is operator-required. The code plus automated axe/DOM/memory/CDP checks are in place; no device/VoiceOver evidence is claimed.
