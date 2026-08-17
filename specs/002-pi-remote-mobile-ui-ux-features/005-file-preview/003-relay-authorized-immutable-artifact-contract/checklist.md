# Checklist — Relay-authorized immutable artifact contract

- [x] A valid `FilePreviewBlock` passes strict protocol guards and carries only relay-authored identity and safe metadata. — new guard + valid-descriptor cases in `guards.test.ts`.
- [x] Guards reject unknown fields, host paths, invalid digests, invalid bounds, and invalid renderer/redaction/completeness/content combinations. — negative guard cases green.
- [x] The relay stores only sanitized bytes and metadata, publishes SHA-256 digest/ETag identity, and rejects reuse of one identity with different bytes. — `artifact-store.test.ts` "rejects identity reuse with different bytes" → throws `/immutable/`.
- [x] Exact authenticated `(session, artifactId, revision)` reads succeed; cross-session, wrong-revision, `latest`, path-bearing, unauthenticated, expired, and revoked requests fail with no body disclosure. — `artifact-http.test.ts` (auth-first 401, 405 on query/`latest`, expired/revoked not-200 + no body); store exact-tuple lookup enforces cross-session/wrong-revision.
- [x] Artifact reads are read-only, ticket-free, rate/size bounded, range-consistent, and return private no-store/nosniff/same-origin headers. — server route: GET-only, `artifactReadLimiter`, MAX_ARTIFACT_READ_BYTES, 416 range, `private, no-store` + `nosniff` + `same-origin` + CSP.
- [x] Missing or unavailable sources become `withheld`, `missing`, or `unsupported`; no client-inferred read or blank/dead card exists. — sanitizer availability states; artifact-states demo + CDP shows safe metadata cards.
- [x] Relay projection requires an explicit allowlisted snapshot and leaves existing diff projection intact when no snapshot is approved. — `getAllowlistedArtifactSnapshot` requires an approval marker; diff projection unchanged.
- [x] Artifact bodies, references, URLs, and shareable payloads are absent from local storage, persisted transcript state, Cache Storage, and service-worker caches after open/close/reload fixtures. — `pwa-cache.test.tsx` "network-only, never opens Cache Storage"; state/cache strip inline bodies/refs.
- [x] Ready metadata, withheld, missing, denied, and unsupported demo states work without relay contact. — double-gated `demo.ts` fixtures; CDP artifact-states exercised offline.
- [x] Phase 1 diff behavior, focus/history behavior, and locked light/dark styling remain green. — Phase-1 tests unchanged and green in the 476 total.
- [x] `npm run typecheck` passes. — exit 0.
- [x] `npm test` passes, including relay, migration, redaction, and negative security coverage. — exit 0, 231 passed (30 files).
- [x] `npm run test:web` passes, including cache/service-worker exclusion. — exit 0, 476 passed (27 files).
- [x] The light artifact-state CDP command passes at exactly 390 CSS pixels and its screenshot is inspected. — exit 0, 390 CSS px, no overflow, PNG inspected.
- [x] The dark artifact-state CDP command passes at exactly 390 CSS pixels and its screenshot is inspected. — exit 0, 390 CSS px, no overflow, PNG inspected.
- [x] No files outside this phase folder were created or modified by the documentation scaffolding. — only spec docs edited here; code changes are the allowlisted phase-2 files plus the necessary migration-companion drill/doc updates.
