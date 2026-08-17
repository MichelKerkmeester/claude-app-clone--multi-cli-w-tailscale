# Implementation Summary — 008 Phase 1 — Protocol and pre-stdout capability boundary

## Final state

Complete and verified (automated gates + Claude security review + 390px light/dark CDP). This phase adds
the versioned `inbound_image` metadata-only transcript contract, an isolated host-adapter seam that
advertises NO capability when pre-stdout interception is unavailable, and honest old-client behavior — with
zero image bytes, no decoder, no OCR, no publication route, and the inbound-media capability OFF. Implemented
by GPT-5.6 Luna Max (via the Codex CLI); orchestrated, security-reviewed, and verified by Claude on `main`.

## What shipped

- **`packages/pi-rpc-protocol/src/{types,guards,index}.ts`** — `InboundImageBlock` (schemaVersion 1) with the
  exact processing / ready / terminal (withheld|expired|revoked) shapes; strict exact-key guards that reject
  unknown/missing keys, paths (`/`,`\`), `data:`/`blob:`/`javascript:` schemes, base64/PNG/PDF signatures,
  `ocr` markers, image-filename patterns, digest-derived artifact IDs, `latest`/`.`/`..` revisions, invalid
  digests/timestamps/dimensions/MIME, unsafe/oversized text, and `shareAllowed !== false`; added to the
  `TranscriptBlock` union + `isTranscriptBlock` switch; exported. Modeled on the 007 `RedactedAttachmentBlock`.
- **`extensions/pi-remote-inbound-media/`** (new, zero deps) — the isolated host seam:
  `createInboundMediaHostAdapter` sets `capability = undefined` and never subscribes/forwards when the
  pre-stdout interception seam is unavailable; the callback receives only an opaque handle and writes to no
  transport. `publisher-boundary.test.ts` spies stdout/session writes and proves nothing is forwarded.
- **`apps/pi-remote-web/src/{state,App}.tsx`** — an `inbound_image` block an old/not-yet-enabled client
  doesn't understand routes to the existing unsupported/redacted row (kind preserved, never dropped);
  virtualization + tool-disclosure boundaries intact.
- **`apps/pi-remote-web/src/demo.ts`** — a disabled/unsupported inbound fixture (no image bytes).
- **`scripts/inbound-media-cdp.mjs`** — new 390px light/dark CDP harness.

## Verification (Claude, on `main`, OUTSIDE the codex sandbox)

- Scope: protocol (3 src + tests) + the new extension + web compat (state/App/demo) + the CDP harness; no
  file outside the allowed paths; no new external dependency; `pi-remote-plan` and root `package.json`
  untouched (`extensions/*` already globbed); the extension's `node_modules`/`dist` are gitignored.
- `npm run build` 0; `npm run typecheck` 0.
- `npm test` → **307 passed / 39 files** (+4 over the 303 baseline: protocol guard + extension boundary
  tests; codex's in-sandbox EPERM/socket artifacts not reproduced outside the sandbox).
- `npm run test:web` → **581 passed** (delta 0; old-client compat covered by existing block-normalization tests).
- CDP: 390px light + dark → transcript + composer render, no overflow, **zero feature-enabling controls**.
- Security review (Claude read the guard + seam diffs): the durable block is metadata-only with an exact-key
  allowlist rejecting every unsafe field; the host seam is fail-closed (no capability, no forwarding when
  interception is unavailable — the current pi-0.84.2 reality); no transport ceiling raised.

## Notes / gates (feature-level, not Phase-1 blockers)

- The feature-level hard-gate adversarial review is recorded at `008-inbound-media/adversarial-security-review.md`
  (APPROVED, capability OFF). Enablement is operator/environment-gated: the OCR secret-detection engine +
  detectors (fail-closed to `withheld` until approved) and the pinned cli-pi 0.95/0.20 pre-stdout seam
  (installed pi is 0.84.2). Phase 2 (`003-...`) carries the two MUST-FIX decoder items (reuse the 007 WASM
  decoder). CDP screenshots are under `/private/tmp` (outside the repo).

## Frozen contracts

- Design: no image UI added; ink-on-parchment untouched (CDP-confirmed both themes).
- Security preserved: metadata-only durable state; fail-closed host seam; the phone is never a capture/
  publication authorizer; read-only-by-default + host-enforced plan mode unchanged; no transport ceiling raised.
