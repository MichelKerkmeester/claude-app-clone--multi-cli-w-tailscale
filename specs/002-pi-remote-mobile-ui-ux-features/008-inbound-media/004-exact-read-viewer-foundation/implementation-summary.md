# Implementation Summary — 008 Phase 3 (slice 3a: relay read lane)

## Final state — PARTIAL (relay read lane complete; web viewer slice HELD)

The Phase-3 **relay read lane** is complete and verified (automated gates + Claude security sign-off + 390px
CDP). The **web viewer / resource-fetch / service-worker / CSP slice (3b) is intentionally HELD** — its
files (`apps/pi-remote-web/*`, `service-worker.js`, `index.html` CSP, `main.tsx`) are the exact area
implicated in an open production white-screen regression on the installed iPhone PWA, so I did not stack the
web viewer onto that area until the regression is understood. The inbound-media capability stays OFF.
Implemented by GPT-5.6 Luna Max (via the Codex CLI); orchestrated, security-reviewed, and verified by Claude
on `main`.

## What shipped (relay only)

- **`http/server.ts`** — `POST /api/artifacts/read` (body `{sessionId, artifactId, revision, variant}`),
  authenticated + READ-ONLY. Exact-tuple `readInboundVariant`; rejects `latest`/paths/URLs/digest-as-
  authority/cross-session/unknown fields/mutation tickets; status matrix 404 (unknown) / 410 (expired|
  revoked) / 429 (rate-limited). Success (200) headers exactly: content-type image/png|jpeg, content-length,
  **Content-Digest** (SHA-256), immutable **ETag**, content-disposition attachment (generic filename),
  **Cache-Control private, no-store, max-age=0**, **X-Content-Type-Options nosniff**, **Cross-Origin-Resource-
  Policy same-origin**, **Referrer-Policy no-referrer**. A byte-length integrity check 404s a mismatch; the
  route mints no ticket and cannot invoke pi.
- **`store/artifact-store.ts`** — `readInboundVariant({sessionId, artifactId, revision, variant})` returning
  the exact stored variant bytes + mediaType + length + SHA-256 digest + immutable ETag, or typed
  not-found/expired/revoked. Exact-tuple only.
- **`auth/policy.ts` + `auth/auth-service.ts`** — `artifact:read` as a distinct read-only action (allowed in
  Plan mode; mints/consumes no mutation ticket).
- **`auth/rate-limit.ts`** — `ArtifactReadRateLimiter`: 60 thumbnail + 30 full reads / 5 min per device/
  session; ≤2 thumbnail + 1 full concurrent; 429 + Retry-After.
- Tests: `artifact-read.test.ts`, `artifact-headers.test.ts`, `artifact-auth.test.ts` — exact-tuple auth,
  the rejection set, the status matrix, header integrity, a flipped-byte digest failure, Plan-mode read, and
  no-ticket/no-pi/no-mutation.

## Two bugs Claude fixed (codex could not verify these — its sandbox cannot bind sockets, so EPERM masked every socket test)

1. **Test WS handshake (3 files):** `connectForeground` opened the foreground WebSocket with only
   `{ origin }`, missing the `tailscale-user-login` (principal) header every working relay test passes → the
   `/api/sync` upgrade returned 403. Added the header; the tests then connect.
2. **Source `isSafeInboundOwner` (real bug):** its charset `[A-Za-z0-9._:-]` rejected `@`, but `ownerPrincipal`
   is the authenticated email-like principal — so the store could not store an artifact owned by a real
   principal. Added `@` to the charset. (Both fixed and verified by re-running the suite outside the sandbox.)

## Verification (Claude, on `main`, OUTSIDE the codex sandbox)

- Scope: relay-only (server/store/auth/rate-limit + 3 relay tests); NO web file touched.
- `npm run build` 0; `npm run typecheck` 0.
- `npm test` → **336 passed / 45 files** on re-run (+9 over the 327 baseline; the known `auth.test.ts` socket-
  close flake blipped once and passed on re-run).
- `npm run test:web` → **583 passed** (delta 0).
- CDP: 390px light + dark, capability off → composer/transcript unchanged, no overflow, zero affordances.
- Security sign-off: read-only exact-tuple read; no mutation ticket / pi invocation / workspace write; the
  full required header set (no-store/nosniff/CORP/no-referrer/Content-Digest/immutable ETag); byte-integrity
  check; rate limits; Plan-mode read allowed.

## Held for slice 3b (pending the white-screen resolution)

The web `useArtifactResource` (verified fetch → decode → object URL), the shared viewer/resource foundation
(`ArtifactViewerProvider/Host/Header/Details/PreviewControls/useArtifactHistory`), the exact-read `relay.ts`
consumer, `cache.ts` artifact-stripping, the `service-worker.js` network-only artifact rule, the `index.html`
CSP (`img-src self blob:`), and `main.tsx` — checklist items CHK-006..011 and CHK-016..017. These touch the
white-screen suspect files and will be built once the regression is confirmed resolved on-device.

## Frozen contracts

- Design: no UI added; ink-on-parchment untouched (CDP-confirmed).
- Security preserved: the read surface is read-only + no-store + exact-tuple; capability OFF; no transport
  ceiling raised; read-only-by-default + host-enforced plan mode unchanged.
