# Implementation Summary — 008 Phase 2 — Ticketed publication, sanitization, and atomic artifact storage

## Final state

Complete and verified (automated gates + Claude security sign-off + 390px light/dark CDP). This phase builds
the secure RELAY-side inbound publication path: an extension-only ticketed binary route creates a `processing`
transcript block, the relay decodes→redacts→re-encodes→hashes→stores only bounded derivatives and commits
`ready` via expected-revision CAS; every other outcome becomes `withheld` with no retrievable original. The
PWA inbound-media capability stays OFF; verified entirely through relay/extension fixtures. Implemented by
GPT-5.6 Luna Max (via the Codex CLI); orchestrated, security-reviewed, and verified by Claude on `main`.

## What shipped (relay + extension + migration)

- **`store/artifact-sanitizer.ts`** (extended) — the mandatory sanitization order using the **imported 007
  WASM decoder** (`../attachments/attachment-decoder.js:31`, memory-isolated `@jsquash`, header ceilings
  before allocation — satisfies both adversarial-review MUST-FIX items; no `worker_threads`, no native FFI,
  no new dependency): streaming byte-ceiling → magic-byte/decoder-detected format (reject GIF/APNG/animated-
  WebP/SVG/HEIC/AVIF/PDF/TIFF/BMP/ICO/RAW) → decode → orientation + 8-bit sRGB → metadata strip → exclusion
  masks → OCR scan via a **dependency-injected scanner** → burn confirmed masks (opaque carbon, +6px) →
  thumbnail from the sanitized master → deterministic bounded encode → hash + delete source/intermediate.
  **Fail-closed:** `scanner === undefined` (production) ⇒ `withheld`; any scanner-unavailable/timeout/decode/
  unsupported/over-limit/mask/quota failure ⇒ `withheld`, zero retrievable renditions. A test-injected stub
  exercises the ready+mask path (seeded secret masked in both variants).
- **`store/artifact-store.ts`** (extended) — inbound artifact identity (random ≥128-bit opaque ID, not
  digest-derived), immutable revision, thumbnail+full variants (digest/ETag), 24h retention, 50 MiB session
  quota, expiry/revocation purge, random names + 0700 dirs / 0600 files outside repo/webroot/SQLite/pi-workspace.
- **`auth/policy.ts` + `auth/auth-service.ts`** — `artifact:publish` as a distinct action; one-use ticket
  bound to principal/host-extension/session/run/turn/blockId/submissionId/expectedTranscriptRevision/
  declaredByteLength/declaredMediaFamily/90s deadline.
- **`http/server.ts`** — the extension-only publish-ticket + binary publish routes. Any browser-`Origin`
  request is **403** (`browser_origin_rejected`); the binary route **consumes the ticket before reading the
  body** (`:1548`), validates content-length/digest/media-family against the ticket binding, enforces a 60s
  deadline, and 409s on revision conflict.
- **`store/relay-store.ts` + `transcript-projector.ts`** — insert `processing`; settle `ready`/`withheld`
  via expected-revision CAS preserving block ID + sequence; reject stale contexts; purge late/conflicting
  artifacts + partial bodies; finalize abandoned processing at 60s.
- **`migrations/006-inbound-artifacts.{up,down}.sql`** — metadata-only artifact schema (no source bytes,
  path, URL, OCR, or decoder detail).
- **`extensions/pi-remote-inbound-media/src/index.ts`** — only approved capture handles / in-memory bytes
  enter the route; rejects Markdown paths, repo paths, symlinks, unapproved tools; still advertises no
  capability without the pre-stdout seam.
- **Rollback-drill migration-version sync** (`release/rollback-drill.ts` + root `tests/rollback-drill.test.ts`):
  adding migration 006 bumps the restored version 5→6; the drill's hardcoded guard + the test expectation
  were updated 5→6 (a mechanical consequence of the migration — the only cross-cutting change outside the
  phase's own files, verified green).

## Verification (Claude, on `main`, OUTSIDE the codex sandbox)

- Scope: the extended store/auth/http/projector files + migration 006 + extension + 5 test files + demo
  fixture, all within the allowed paths; the 007 `attachments/` decoder is untouched (import-only); no new
  dependency; no `worker_threads`.
- `npm run build` 0; `npm run typecheck` 0.
- `npm test` → **327 passed / 42 files** (+20 over the 307 baseline: artifact/sanitizer/publish/security/
  extension tests + the rollback-drill fix; codex's in-sandbox EPERM artifacts not reproduced outside the sandbox).
- `npm run test:web` → **583 passed** (delta 0).
- CDP: 390px light + dark, capability off → transcript + composer render, no overflow, zero media affordances.
- Security sign-off (Claude read the security-critical diffs): decoder = imported 007 WASM (MUST-FIX #1/#2);
  fail-closed sanitization (no scanner ⇒ withheld); extension-only publish (browser-Origin 403) with
  ticket-before-body + full-binding validation; CAS settlement + late-revision purge + 60s abandon;
  quarantine 0700/0600 random names outside the repo; metadata-only migration; no byte/base64/URL/path in
  durable/relational fields or logs.

## Notes / gates (feature-level, not Phase-2 blockers)

- Enablement stays operator/environment-gated (see the feature-level `adversarial-security-review.md`): the
  real OCR engine + approved detectors (production is fail-closed to `withheld` until then) and the pinned
  cli-pi 0.95/0.20 pre-stdout seam (installed pi is 0.84.2). The capability is OFF and no PWA read UI exists
  yet (Phase 3+).

## Frozen contracts

- Design: no UI added; ink-on-parchment untouched (CDP-confirmed both themes).
- Security preserved: read-only-by-default except the extension-only ticketed publish exception; fail-closed
  everywhere; metadata-only durable state; no transport ceiling raised; capability OFF.
