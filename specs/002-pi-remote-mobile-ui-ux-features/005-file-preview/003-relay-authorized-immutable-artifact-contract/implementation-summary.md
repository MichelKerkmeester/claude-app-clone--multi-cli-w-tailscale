# Implementation Summary — Phase 2 — Relay-authorized immutable artifact contract

## Final state

Complete and verified. Complete-file preview now has a relay-owned, immutable, exact-revision contract: a strict `FilePreviewBlock` descriptor, a sanitized immutable SQLite artifact store, an allowlisted publication boundary, and one authenticated exact-tuple read endpoint — with image/PDF bytes held `withheld` until Phase 4. A browser can never turn a path, filename, diff header, or assistant-authored text into a workspace read. Implemented by GPT-5.6 Luna Max (via the OpenCode CLI, opencode-go provider); orchestrated and verified by Claude.

## What shipped (protocol + relay + web)

- **Protocol** (`packages/pi-rpc-protocol/`): `FilePreviewBlock` union member + strict guard + exports. Relay-authored identity only — opaque artifact id, STRING revision (distinct from numeric block revisions), SHA-256 digest, renderer/MIME, redaction + completeness, content mode (`inline-text`/`artifact-ref`/`none`), availability (`ready`/`withheld`/`missing`/`denied`/`unsupported`). Guards reject unknown fields, host paths, invalid digest, out-of-bounds sizes, and invalid renderer/redaction/completeness/content combinations. New fixtures in `guards.test.ts`.
- **Immutable store** (`store/artifact-store.ts` + migration `005-artifacts.{up,down}.sql`): immutable `(sessionId, artifactId, revision)` rows of sanitized bytes, SHA-256 digest/ETag, byte length, range reads, retention (7-day cap), expiry, revocation, purge — inside the existing SQLite transaction boundary. Reusing an identity with different bytes throws (immutable); `isArtifactRevision` rejects `latest`/`.`/`..`/slashes; 50 MB bound; expiry boundary fail-closed.
- **Fail-closed sanitizer** (`store/artifact-sanitizer.ts`): publishes only from an explicitly allowlisted snapshot (`approved`/`allowlisted`/`source:relay-allowlisted` marker); no approval → no artifact. `displayName` rejects control/bidi chars, `http(s)/file://`, absolute unix/windows paths, secret-assignment patterns, and any basename with a slash. Binary renderers (image/PDF) forced to `withheld` this phase; text/code bounded (2 MB) + redaction-projected; digest over sanitized bytes.
- **Projection** (`store/transcript-projector.ts`, `store/relay-store.ts`, `src/index.ts`): a `FilePreviewBlock` is emitted only from an allowlisted snapshot; existing diff projection is byte-for-byte unchanged when none is approved; raw source bytes never surface through transcript pages.
- **Read endpoint + policy** (`auth/policy.ts`, `http/server.ts`): `artifact:read` policy + exact-tuple route `/api/sessions/{s}/artifacts/{a}/revisions/{r}`. Auth-first (401), GET-only + any query string rejected (405, blocks `?latest`), rate-limited (429), range-validated (416), read-only + ticket-free. Success returns `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, `Cross-Origin-Resource-Policy: same-origin`, CSP `default-src 'none'`, ETag, revision header. Cross-session / wrong-revision / unauthenticated / expired / revoked / oversized → redacted failure, no body disclosure.
- **Web transport/state/cache + SW** (`relay.ts`, `state.ts`, `cache.ts`, `App.tsx`, `demo.ts`, `public/service-worker.js`): a direct exact-revision read (own `fetch`, `cache: 'no-store'`) that verifies status + headers + content-type + revision + ETag + byte budget + digest; descriptor cards reuse the Phase-1 viewer; persisted transcript/localStorage strips inline bodies + artifact references; the service worker treats artifact routes network-only and never opens Cache Storage. Deterministic double-gated fixtures for ready/withheld/missing/denied/unsupported without relay contact.

## Verification (Claude, in the worktree)

- `npm run build` → exit 0; `npm run typecheck` → exit 0.
- `npm test` → exit 0, **231 passed (231)** across 30 files (+10: artifact-store immutable identity + range + expiry/revocation, sanitizer fail-closed + path/secret display rejection, artifact-http auth/latest/expired/revoked/no-store, negative controls, redaction). Zero regressions.
- `npm run test:web` → exit 0, **476 passed (476)** across 27 files (+4: direct artifact transport + wrong-revision, network-only/Cache-Storage-exclusion). Phase-1 diff/focus/history behavior unchanged.
- CDP: `file-preview-cdp.mjs --fixture artifact-states --theme {light,dark}` → both exit 0, exactly 390 CSS px, no horizontal overflow; screenshots inspected — ready/withheld/missing/denied/unsupported render as explicit safe-metadata cards (basename displayName only, content withheld), never blank/dead.
- Security review (Claude read the diffs): read endpoint auth-first, exact-tuple, read-only, ticket-free, no-store/nosniff/same-origin/CSP, redacted failures; store immutable + digest-verified + path-safe revision + fail-closed expiry/revocation; sanitizer fail-closed with path/secret display rejection and allowlist-gated publication; SW + transport keep artifacts out of Cache Storage. Consistent with the single-operator (host+workspace) relay model — the exact-tuple store lookup is the cross-session boundary. No Phase-1, redaction, or Plan-mode regression.

## Necessary companion change (migration blast radius)

Adding migration `005-artifacts` advanced the latest schema version 4→5. The release rollback drill asserts the reversed latest-migration version in two coupled places; both were moved 4→5 (drill guard `rollback-drill.ts`, test `tests/rollback-drill.test.ts`), plus doc counts in `migrations/README.md` and `tests/README.md` — exactly as they moved 3→4 when migration 004 landed. The drill still proves session, indeterminate-lease, and native-session-boundary preservation across restore + down-migration.

## Frozen contracts

- Design: locked ink-on-parchment tokens only; unavailable states render as safe metadata cards, never blank.
- Security strengthened: relay-authored immutable identity; authenticated exact-tuple read-only ticket-free reads; fail-closed sanitizer + allowlisted publication; no browser path/`latest` read; artifacts excluded from every cache; read-only-by-default and Plan mode preserved.

## Deferred / operator-required

- Image/PDF renderers + binary sanitization are intentionally `withheld` until Phase 4.
- The manual installed-PWA/Safari/VoiceOver device pass is operator-required; code + automated axe/DOM/CDP checks are in place.
