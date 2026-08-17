# Implementation Summary — Phase 4 — Local Composer Draft, Preview, and Redacted-Card UI

## Final state

Complete and verified for this phase's scoped deliverables (automated web gate + Claude security review +
flag-off 390px light/dark CDP). This phase ships the capability-gated LOCAL iPhone draft experience: a `+`
photo menu (Photo Library / Take Photo), a ref-backed draft that keeps `File` objects and object URLs out
of serializable state, an ordered attachment rail + tiles, a full-screen preview reusing the 005 viewer
shell, redacted transcript-card rendering, service-worker/cache exclusion, and the a11y/responsive surface
— all local, with NO network request before Send. `PI_REMOTE_MEDIA_ENABLED` stays OFF (the App defaults to
a capability-off fixture); the photo UI is exercised via typed capability fixtures + component tests.
Implemented by GPT-5.6 Luna Max (via the Codex CLI); orchestrated, security-reviewed, and verified by
Claude on `main`.

## What shipped (apps/pi-remote-web)

- **`attachments/attachment-state.ts`** — the serializable draft reducer. `AttachmentDraftItem` carries only
  `{id, ordinal, label, status, preview, rejection}` — no `File`, filename, bytes, or object URL. Enforces
  the 4-item limit, local validation, capability/model blocking, and the six local states.
- **`attachments/AttachmentDraftProvider.tsx`** — ref-backed `storedRef` Map holds the real `File` + object
  URL (never React state). Object URLs are created locally and REVOKED on removal, acknowledgement, session
  switch, capability/model loss, logout, app-lock, pagehide, visibility-hidden, and unmount. HEIC/HEIF get
  no object URL (preview-unavailable).
- **`attachments/AttachmentRail.tsx` / `AttachmentTile.tsx` / `AttachmentPreviewDialog.tsx`** — ordered
  generic "Photo N" rail with 44×44 removal targets; tiles open a full-screen bone-canvas preview (reusing
  the 005 ArtifactViewer shell) with Close/Remove and focus restoration; HEIC shows "Photo · preview unavailable".
- **`SessionComposer.tsx`** — the capability-gated photo menu (before Mode/Commands) + local-storage
  disclosure + rail placement; existing caption/keyboard/IME/Mode/Commands semantics preserved (Return =
  newline, ⌘Enter = send, IME suppresses Send, Escape closes without discarding).
- **`App.tsx` / `state.ts`** — capability wiring (default-off fixture), redacted-card rendering
  ("Preview not retained"), unknown-block safety, model-change clearing, lifecycle cleanup.
- **`style.css`** — rail/tile/preview in the frozen tokens; safe-area/keyboard geometry; 320px/200% reflow;
  RTL; reduced motion; light/dark AA.
- **`public/service-worker.js` / `cache.ts`** — attachment requests served `no-store` (never enter the
  shell cache); attachment display blocks filtered out of the history cache.
- **`relay.ts`** — typed on/off media capability fixtures only (no real upload request).

## Verification (Claude, on `main`, OUTSIDE the codex sandbox)

- Scope: 5 new components + 3 new tests + modified composer/app/state/style/cache/SW/relay + 3 test files;
  all within the phase's allowed paths; no stray files; no dependency change.
- `npm run build` 0; `npm run typecheck` 0.
- `npm test` (backend) → **299 passed** (unchanged — backend untouched).
- `npm run test:web` → **572 passed / 47 files** (+27 over the 545 baseline).
- CDP (flag off): 390px light + dark → composer present, no horizontal overflow, **zero media affordances**
  — confirms "capability off ⇒ no photo group/rail, no decorative action".
- Security review (Claude read the security-critical diffs): capability gate = `enabled && imageIn`;
  serializable state carries no `File`/filename/URL (the only `.name` use is slash-command names); object
  URLs revoked on every lifecycle event + unmount; SW `no-store` + cache filter exclude attachment data; no
  filename/download/share/server-URL affordance; no fetch/XHR before Send (stubbed-and-asserted test).

## Operator-review (NOT fabricated)

- **Flag-ON pixel CDP captures are operator-visual-review.** The App receives media capability via a prop
  (default off); there is no demo query-param to enable it, and wiring one would be app code (the iron
  constraint forbids Claude editing `apps/`). The ON-state scenarios (menu-open, four-tile local-ready,
  preview, model-blocked, narrow/reflow) and DOM focus + horizontal-overflow checks are covered by the
  jsdom component tests at 390px/200%; a true pixel screenshot of the enabled photo UI awaits an operator
  or the Phase-5 end-to-end demo wiring. The flag-OFF no-affordance case is CDP-verified here.
- The installed-PWA physical-device pass (Safari standalone, VoiceOver, real camera/gallery, app-switcher
  thumbnail hiding) is operator-required.

## Frozen contracts

- Design: rail/tile/preview built in the frozen ink-on-parchment tokens, reusing the composer + 005 viewer
  language; no new accent/radius/motion vocabulary; AA + ≥44px targets (DOM-asserted).
- Security preserved: no network before Send; File/object-URL locality with full revocation; no filename/
  raw media in DOM/storage/cache/analytics/errors; capability-off hides the entire photo surface; image
  content grants no authority; read-only-by-default posture unchanged; flag stays OFF.
