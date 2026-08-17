# Implementation Summary — 008 Phase 4 (transcript projection + inline image card)

## Final state — COMPLETE

The typed `inbound_image` block is now projected into the virtualized transcript as a standalone, contained
inline card with deferred, decode-verified loading and a complete, honest lifecycle state table. Built by
GPT-5.6 Luna Max (via the Codex CLI); orchestrated, security-reviewed, and independently verified by Claude
on `main`, outside the codex sandbox. The inbound-media capability stays OFF (this phase renders demo/typed
fixtures only; no live inbound bytes are accepted until host enablement in Phase 6). No frozen contract
weakened: read-only posture, exact-revision reads, metadata-only surface, and the ink-on-parchment token
system are all preserved.

## What shipped (web only)

- **`state.ts`** — promotes `inbound_image` from the honest "unknown/unsupported" placeholder to a
  first-class display block, so the new card renders it. Safe because the frozen Phase-1 exact-key guard
  (`isTranscriptBlock`/`isInboundImageReadyBlock`) already validates the block upstream; a malformed block is
  still dropped.
- **`App.tsx`** — places tool-origin cards as virtual siblings AFTER the activity disclosure (outside
  `ActivityGroup`/`DisclosurePanel`, so a collapse never hides them); contiguous images stack in
  `.inbound-image-stack`; assistant-origin cards preserve stream order; one aggregate "N new image(s) from pi"
  announcement; turn-end actions emitted once.
- **`artifacts/InboundImageCard.tsx`** (new) — the card shell. Renders only `displayName` (sanitized label),
  numeric `revision`, "Processed"/"Redactions applied"/terminal label — **no filename, digest, id, path, or
  raw object**. Exactly one React Aria `Button` (`aria-haspopup="dialog"`) and only in the openable
  `inline-ready` state; opens on release/Enter/Space; a >10px pointer drag cancels the press (scroll gesture
  never opens the viewer).
- **`artifacts/VerifiedImage.tsx`** (new) — near-two-viewport deferral (`IntersectionObserver`,
  `rootMargin: '200% 0px'`), one 750ms auto-retry, `requireImageDecode` gate; pixels render **only** when
  `status === 'ready' && objectUrl !== null` (object URL exists only after a successful decode); decorative
  `alt=""`, `draggable={false}` (no drag-export); an `onError` closes the resource and drops to `corrupt`
  (render failure ⇒ zero pixels).
- **`artifacts/ImageStatus.tsx`** (new) — the complete 28-state lifecycle table (copy, actions, `aria-busy`,
  role, `noPixels`, `noAspect`). The `noPixels` set — withheld, denied, expired, missing, revision-conflict,
  corrupt, revoked, unsupported, privacy-covered, **and stale** — routes to the pixel-free placeholder.
- **`artifacts/ImagePlaceholder.tsx`** (new) — the reserved, no-pixel geometry well.
- **`artifacts/InboundImageBlockView.tsx`** (new) — card/unsupported dispatch for the projected block.
- **`artifacts/useArtifactResource.ts`** — the image decode gate is HARDENED: `requireImageDecode` now runs on
  the actual bytes (`createImageBitmap`, else `Image.decode` via `FileReader`) and **throws** when no decode
  path exists (previously it silently `return`ed, skipping verification); decode precedes the binary/object-URL
  step. Demo-mode reads route to the deterministic demo resource.
- **`style.css`** — card, well, status, motion, focus, and 390px responsive styling within the fixed tokens.
- **`demo.ts`** — deterministic per-state fixtures behind `?fixture=inline-card&state=…`.
- **Tests (new):** `InboundImageCard.test.tsx`, `inbound-image-states.test.tsx`, `transcript-placement.test.tsx`,
  `disclosure-persistence.test.tsx`.
- **`scripts/inbound-media-cdp.mjs`** — adds the `inline-card` fixture + `--state` capture support.
- `turns.ts` and `ArtifactDetails.tsx` were reused unchanged.

## Two defects Claude found by independent (out-of-sandbox) CDP verification and had the model fix

codex cannot run the CDP/real-browser harness (its sandbox blocks binding `127.0.0.1`), and both defects slip
past the jsdom DOM tests because those render `<InboundImageCard>` directly, bypassing the strict transcript
projection guard.

1. **Empty `safeAlt` broke `inline-ready` end-to-end (fixture data).** `DEMO_INBOUND_MEDIA_READY_BLOCK` set
   `presentation: { safeAlt: '' }`. The frozen Phase-1 guard `isInboundSafeText` rejects an empty string, so
   `isInboundImagePresentation → isInboundImageReadyBlock → isTranscriptBlock` all returned false; the
   transcript projection dropped the block and rendered EMPTY ("No transcript blocks are available yet"). The
   card components were correct. Fix: a valid non-empty `safeAlt` (`'Shared screenshot preview'`).
2. **`stale` rendered pixels — a P0 spec violation.** The frozen SPEC requires the `stale` state to render NO
   pixels (spec.md:107 out-of-scope, spec.md:128 security posture, checklist CHK-009 [P0]), but the
   implementation treated `stale` as a pixel state in three places. Fix: `noPixels: true` on the `stale`
   status definition; removed `stale` from `InboundImageCard.PIXEL_STATES` and `VerifiedImage.showPixels`.
   Now covered by `inbound-image-states.test.tsx` (asserts 0 `<img>` for every `noPixels` state).

## Verification (Claude, on `main`, OUTSIDE the codex sandbox)

- **Scope:** only the plan's "Files to change" list (5 new components + 4 new tests + 6 edits + the CDP
  harness). No relay/protocol/`main.tsx`/service-worker/CSP/dependency file touched. `git status` clean of
  stray files.
- **Gates (final state):** `npm run build` 0; `npm run typecheck` 0; `npm run test:web` **597 passed / 55
  files** (+4 over the 593 baseline); `npm test` **336 passed / 45 files** (clean; the known `auth.test.ts`
  socket-teardown-race flake — a test-harness race where the client-side close resolves before the relay
  finishes server-side foreground teardown — blipped to 335/336 once mid-verification and passed clean on the
  final run; backend is byte-identical to the committed baseline, untouched by this web-only phase).
- **Security sign-off (diffs read):** decode-before-object-URL gate (hardened); metadata-free card (a fixture
  digest is asserted absent from the DOM); no-pixel terminal states incl. stale; deferred + decode-verified
  pixels; no send/share/save/download/export/public-URL path (`draggable=false`, viewer-open only); projection
  still guarded by the frozen exact-key protocol.
- **CDP (390px, light + dark):** the harness DOM assertions pass for all five card states
  (`inline-ready`, `processing`, `withheld`, `corrupt`, plus the disabled `inbound-media` fixture) — asserting
  `root.dataset.theme` matches the requested theme, exactly 390 CSS px with no horizontal overflow, the
  requested `data-image-state`, the expected per-state copy, the single-button shape, and no enabling controls.
  Known limitation: the harness's saved PNG bytes are unreliable in headless (`Page.captureScreenshot` returns
  a DOM-invariant compositor frame), so the screenshots are NOT relied on as evidence; the live DOM assertions
  are authoritative and a viewed capture confirmed the card + app render (not a white screen).
- **CDP geometry (objective DOM measurement, 390px, both themes):** card `getBoundingClientRect` left=8,
  right=382, width=374 within a 390px viewport → contained, non-cropped (`containedNoCrop=true`), no horizontal
  overflow (`scrollWidth <= clientWidth`); readable metadata present (title "Screenshot"; meta
  "Processed · Revision 2 · Redactions applied"); state signaled by copy/`role`/`aria`, never clay-only.
- **Real-path (non-demo) mount check:** PASS — the built app mounts on `/` with `#root` children and zero
  uncaught exceptions, guarding CSP/service-worker/`main.tsx` against a white-screen regression.

## One flagged spec-vs-implementation nuance (needs operator confirmation)

`spec.md:123` and `checklist.md` CHK-010/011 describe "16px gutters", but the card's measured gutter is **8px**
(`--space-2`, `0.5rem`) — the app's shared transcript-container inset that the card, placed as a transcript
sibling, correctly inherits. P4 did not set this value; it predates the phase, so making the card 16px would
make it INCONSISTENT with the surrounding transcript rows. Treated here as a spec-prose inaccuracy, not a
regression; surfaced for the operator to either amend the spec figure to 8px or request a deliberate
image-card gutter change as a follow-up. All other CHK-010/011 geometry properties are verified.

## Continuation

Next: Phase 5 (`006-fullscreen-privacy-accessibility`) extends the shared viewer lifecycle (fullscreen,
privacy cover, a11y); Phase 6 (`007-host-enablement-security-release`) is the operator-gated enablement. The
inbound-media capability stays OFF until Phase 6 sign-off.
