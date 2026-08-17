# Implementation Summary — 008 Phase 5 (fullscreen viewer, privacy lifecycle, accessibility)

## Final state — CODE-COMPLETE + automated-verified; one operator-only P0 pending (CHK-012)

The shared artifact viewer now completes the inbound-image fullscreen lifecycle: exact-identity opening, a
synchronous privacy purge state machine, integrity-gated full pixels, accessible zoom/pan with keyboard/single-
pointer alternatives, and honest per-state copy. Built by GPT-5.6 Luna Max (Codex CLI); orchestrated, security-
reviewed, and independently verified by Claude on `main` outside the codex sandbox. The inbound-media
capability stays OFF. **The manual Safari / installed-PWA physical-device matrix (CHK-012) is operator-only and
remains pending** — it cannot be automated and is a Phase-6 enablement prerequisite (capability stays OFF until
the operator signs it off).

## What shipped (web only — the SHARED viewer was extended, not replaced)

- **`ArtifactViewerProvider.tsx`** — the privacy state machine. New phases (full-fetching, viewer-ready,
  full-degraded, stalled, offline-loaded, offline-unavailable, stale, revoked, privacy-covered, closing,
  aborted) and dismissal reasons (privacy-purge, pagehide, logout, session-switch, revoked,
  transcript-superseded). `close(reason)` SYNCHRONOUSLY: shows an opaque carbon curtain (`showPrivacyCurtain`,
  `z-index:10000; inset:0; background:#24221f; opacity:1`), strips `src`/`srcset` from `.artifact-viewer-dialog
  img` + `[data-verified-image]` (`purgeViewerPixelNodes`), clears the resource store (revoking object URLs),
  and bumps the generation — before any exit timer. Wired to `visibilitychange:hidden`, `pagehide`, `pageshow`
  (bfcache reconcile), and namespaced+bare custom events (privacy-cover/logout/session-switch/artifact-revoked/
  app-lock/transcript-superseded). `capturePreview` deep-freezes the exact id/revision/digest/artifact.
  `markViewerOpen` blurs the composer.
- **`ArtifactViewerHost.tsx`** — inbound-image branch: `requireImageDecode:true`; `viewer-ready` only when
  `resource.objectUrl !== null` (post-decode/digest); thumbnail retained during full load; `canCopy` and
  `canShare` are `inbound === null`-gated → FALSE for images (no copy/share/download/export — only
  close/zoom/pan/fit/details); state→phase mapping for every lifecycle state.
- **`useArtifactResource.ts`** — `purgeArtifactResourceStore` (cancels active requests + revokes all URLs),
  `clearArtifactFullResourceStore` (drops full, keeps verified thumbnail), bounded foreground-only offline
  retention, tightened integrity (revision + contentType + ETag/Content-Digest/SHA-256 + decode before object
  URL; a failed check commits zero full pixels).
- **`ArtifactHeader.tsx`, `PreviewControls.tsx`, `ArtifactDetails.tsx`** — safe heading focus, control wiring,
  Details; no image export affordance.
- **`App.tsx`** — lifecycle event wiring for the viewer.
- **`style.css`** — opaque carbon curtain, safe-area / visual-viewport / 100dvh-100svh geometry, focus rings,
  44px controls, reduced-motion, and a new `@media (prefers-contrast: more)` block — all within the frozen
  tokens.
- **`scripts/inbound-media-cdp.mjs`** — a `viewer-ready` fixture that opens the viewer from the inline card and
  asserts the dialog is open, has a Close control, exposes NO forbidden export controls, and is not
  privacy-covered.
- **Tests (new):** `InboundImageViewer.test.tsx`, `viewer-interaction.test.tsx`, `viewer-races.test.tsx`,
  `privacy-lifecycle.test.tsx`, `accessibility.test.tsx`.
- **Untouched (white-screen-risk):** `main.tsx`, `index.html`, `public/service-worker.js`,
  `useArtifactHistory.ts` — the RootErrorBoundary, CSP, and service-worker behavior are unchanged.

## Verification (Claude, on `main`, OUTSIDE the codex sandbox)

- **Scope:** only the plan's allowed paths (8 web files + the CDP harness + 5 new tests). No relay/protocol/
  main.tsx/index.html/service-worker.js/dependency touched.
- **Gates (final state):** `npm run build` 0; `npm run typecheck` 0; `npm run test:web` **613 passed / 60
  files** (+16 over 597); `npm test` **336 passed / 45 files** (clean).
- **Security sign-off (diffs read):**
  - CHK-004 integrity-before-pixels: `viewer-ready` requires `objectUrl !== null` (created only after length +
    revision + contentType + ETag/Content-Digest + local SHA-256 + decode); a failed check commits zero full
    pixels; the verified thumbnail remains.
  - CHK-008 synchronous purge: opaque curtain + `src`/`srcset` stripped + store cleared + generation bumped on
    background/pagehide/logout/session-switch/revocation/supersession/close — before the exit timer.
  - CHK-011 no export: `canCopy`/`canShare` false for inbound; the CDP `viewer-ready` fixture asserts zero
    forbidden controls in the opened dialog (both themes).
  - CHK-001/002 exact frozen identity + composer blur + focus/scroll restore on every close path.
- **CDP (390px, light + dark), `viewer-ready` fixture:** the fullscreen viewer OPENS from the card and asserts
  viewer-open + a Close control + no forbidden export controls + not privacy-covered — PASS both themes. (The
  saved PNG bytes remain unreliable in headless; the live DOM assertions are authoritative.)
- **Real-path (non-demo) mount check:** PASS — the built app mounts on `/` with zero uncaught exceptions
  (white-screen guard; the CSP/service-worker/main.tsx files were untouched this phase).

## Known gaps / notes

- **CHK-012 [P0] — OPERATOR-ONLY, PENDING:** the manual VoiceOver / Switch Control / Voice Control / edge-back /
  App-Switcher-cover / bfcache / landscape / RTL / 320px / 200%-text matrix on the oldest supported iPhone in
  Safari and installed-PWA standalone mode. Cannot be automated; a Phase-6 enablement prerequisite. Marked
  honestly as unchecked — not fabricated.
- **`contrast.test.tsx` not created:** the plan listed it, but codex added `@media (prefers-contrast: more)` to
  `style.css` (functional increased-contrast handling) and did not author a dedicated contrast unit test.
  Contrast is a token/media-query property that jsdom cannot meaningfully assert; the frozen AA token system is
  unchanged. Treated as a test-file coverage gap, not a functional gap. Flagged for optional follow-up.

## Continuation

Next: Phase 6 (`007-host-enablement-security-release`) — the operator-gated enablement (OCR engine + pinned
cli-pi seam + device matrix sign-off) that consumes this completed viewer lifecycle. The inbound-media
capability stays OFF until Phase 6 sign-off, which also consumes the CHK-012 device-matrix result.
