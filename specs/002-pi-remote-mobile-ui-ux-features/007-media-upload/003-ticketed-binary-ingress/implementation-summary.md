# Implementation Summary — Phase 2 — Ticketed Binary Ingress, Quarantine, and Cleanup

## Final state

Complete and verified (automated gates + Claude security sign-off + 390px light/dark CDP); the installed-PWA
device pass is operator-required. This phase adds the secure relay attachment lane — reservation, one-use
operation-specific tickets consumed before body read, bounded streaming binary ingress into outside-webroot
`0600` quarantine, a **memory-isolated WASM image decoder** with header-time bomb rejection, normalization
to sanitized JPEG/PNG, per-device quotas/rate limits, and lifecycle reaping — with no Pi delivery, no
transcript, and no UI (later phases). `PI_REMOTE_MEDIA_ENABLED` stays OFF; attachment routes return 404.
The decoder architecture (operator decision: WASM codecs, client-side HEIC→JPEG) was proven in Node before
the build. Implemented by GPT-5.6 Luna Max (via the Codex CLI, `--sandbox workspace-write`); orchestrated,
security-reviewed, and verified by Claude on `main`.

## What shipped (relay, all under apps/pi-remote-relay)

- **`attachments/attachment-decoder.ts`** — the sole codec boundary. Loads `@jsquash/jpeg`+`png`+`webp`
  WASM modules once from on-disk `.wasm` (Node needs explicit compile+`init`; the browser `fetch` path
  fails). `assertLinearMemory()` verifies each module exports isolated WASM memory. `sniffImage()` parses
  ONLY headers (JPEG SOFn, PNG IHDR, WebP VP8/VP8L/VP8X) and rejects unsupported MIME (incl. HEIC/HEIF),
  MIME mismatch, animation, frames>1, channels>4, and over-ceiling dimensions/area **before** any decode.
  `decodeImage()` runs inside the WASM sandbox under a wall-clock timeout and re-checks the decoded RGBA
  shape (`byteLength === w*h*4`).
- **`attachments/attachment-normalizer.ts`** — sniff → decode → apply EXIF orientation → downscale to
  ≤2000 px → alpha-aware JPEG/PNG re-encode (strips all source metadata) → iterative quality/size reduction
  to the 2 MiB cap. Every transient pixel buffer (source, decoded, raster, discarded output) is zeroed in
  `finally`.
- **`attachments/attachment-service.ts`** — reservation ownership, per-device quota accounting, submission
  idempotency, atomic set state, revision/model/policy binding, streaming ingress with exact Content-Length
  + running byte count + digest compare, normalized-derivative commit, and source deletion. Quarantine root
  is asserted absolute and outside the workspace; files are relay-generated `randomBytes(32)` opaque names
  (client `setId`/`partId` never touch a path), `0700` dir / `0600` exclusive-create files. `owns()`
  enforces set→device ownership on every op. No pixel-bearing DTO field; no SQLite/transcript/sync/console.
- **`attachments/attachment-limits.ts`**, **`attachment-types.ts`**, **`attachment-reaper.ts`** — shared
  fixed limits + coarse log buckets; opaque-ID/lifecycle/redacted DTOs; reaper for TTL, cancellation,
  logout, device revocation, epoch change, shutdown, startup crash recovery, and delivery ambiguity.
- **`auth/auth-service.ts`** + **`auth/rate-limit.ts`** — operation-specific one-use reserve/upload/status/
  cancel tickets bound to principal/session/device/origin/set/part/revision/digest; 12-per-5-min +
  120-MiB-per-hour device limits.
- **`http/server.ts`** + **`index.ts`** — host-gated route handlers (404 unless the flag is `1`), the
  binary PUT that consumes the ticket and verifies its full binding BEFORE reading the stream (upload-body
  deadline enforced), authenticated status with ownership, ticketed cancel; reaper/startup/shutdown wiring.
- Deps: `@jsquash/jpeg@1.6.0`, `@jsquash/png@3.1.1`, `@jsquash/webp@1.5.0`, exact-pinned into the relay
  workspace by Claude (external models don't install; consistent with the 005 pdfjs pin).

## Verification (Claude, on `main`, OUTSIDE the codex sandbox)

- Scope: exactly the 6 new `attachments/` files + 4 modified relay files + 3 new test files; `package.json`
  + `package-lock.json` reflect only the Claude-run codec install; no stray files.
- `npm run build` → 0; `npm run typecheck` → 0.
- `npm test` → **287 passed / 35 files** (+21 attachment/normalization/security tests over the 266 baseline;
  the known `auth.test.ts` flake passed). codex's in-sandbox run showed the usual false `listen EPERM`
  loopback failures — not reproduced out of sandbox.
- `npm run test:web` → 0, **545 passed** (delta 0 — no web change).
- CDP: 390 px light + dark with the flag off → composer + transcript present, no horizontal overflow, zero
  media affordances; PNGs inspected (composer unchanged both themes).
- Security sign-off (Claude read every security-critical diff): **MUST-FIX #1** — WASM linear-memory
  isolation, no `worker_threads`, no native/FFI codec (verified by scan + `assertLinearMemory`); a decoder
  RCE/OOM is contained to WASM memory. **MUST-FIX #2** — header-parse dimension/channel/frame/animation
  rejection precedes any codec allocation; post-decode shape re-check + wall-clock cap. Ticket consumed
  before body read with exact binding; quarantine outside webroot with opaque relay-generated names (no
  traversal); ownership enforced; HEIC/HEIF rejected; no pixel/id/hash reaches SQLite/transcript/sync/SW/
  logs (passing negative controls); transient pixels zeroed.

## Frozen contracts

- Design: no UI added; ink-on-parchment tokens, AA, ≥44px untouched (CDP-confirmed both themes).
- Security preserved: read-only-by-default holds except the explicitly ticketed, host-flag-gated, fail-closed
  upload exception; every mutation is one-use-ticket + exact-bind + foreground; redaction is structural
  (no pixel-bearing durable field); the phone cannot enable media. The decoder isolation satisfies the two
  adversarial-review MUST-FIX items.

## Deferred / operator-required (NOT fabricated)

- The installed-PWA physical-device checklist (Safari standalone, VoiceOver, RTL, 200% text) is
  operator-required; no device evidence claimed.
- HEIC/HEIF is rejected at relay ingress by design; client-side HEIC→JPEG conversion lands in the Phase-4
  composer (operator-approved architecture).
- `PI_REMOTE_MEDIA_ENABLED` stays OFF until the feature's Phase-5 blocking review.
- Host decode budget (≤60 MP ⇒ ~240 MB/image transient) is a known, documented residual (advertise lower
  limits if a host cannot accommodate it); parallelism is capped at 2.
