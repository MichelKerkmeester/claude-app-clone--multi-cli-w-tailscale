---
title: "Verification Checklist: Phase 3 — Exact read lane and shared F6 viewer/resource foundation [template:level-2/checklist.md]"
description: "QA checklist for exact read authorization, integrity verification, shared viewer lifecycle, and no-store cache hygiene."
trigger_phrases:
  - "exact artifact read checklist"
  - "viewer resource verification"
  - "shared F6 viewer QA"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "apps/pi-remote/002-pi-remote-mobile-ui-ux-features/008-inbound-media/004-exact-read-viewer-foundation"
    last_updated_at: "2026-08-16T00:00:00Z"
    last_updated_by: "spec-author"
    recent_action: "Scaffolded phase docs from implementation-phases.md"
    next_safe_action: "Implement and verify this phase"
    blockers: []
    key_files: []
    completion_pct: 0
    open_questions: []
    answered_questions: []
---
# Verification Checklist: Phase 3 — Exact read lane and shared F6 viewer/resource foundation

# Checklist — Exact read lane and shared F6 viewer/resource foundation

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

<!-- ANCHOR:protocol -->
## Verification Protocol

P0 items block the phase; P1 items are required; P2 items may be deferred only with an explicit reason.
<!-- /ANCHOR:protocol -->

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

The source spec, plan, dependencies, and fixed security posture have been read.
<!-- /ANCHOR:pre-impl -->

<!-- ANCHOR:code-quality -->
## Code Quality

The phase changes only the listed relay read, web resource/viewer, cache, CSP, test, and harness areas.
<!-- /ANCHOR:code-quality -->

<!-- ANCHOR:testing -->
## Testing

The acceptance and integrity/persistence items below are the authoritative QA list.
<!-- /ANCHOR:testing -->

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

No implementation finding is being closed by this scaffold; phase tasks remain explicit below.
<!-- /ANCHOR:fix-completeness -->

<!-- ANCHOR:security -->
## Security

Exact tuple authorization, read-only behavior, no-store delivery, integrity-before-pixels, and memory-only resources are included below.
<!-- /ANCHOR:security -->

<!-- ANCHOR:docs -->
## Documentation

The four phase documents remain synchronized to the implementation phase source.
<!-- /ANCHOR:docs -->

<!-- ANCHOR:file-org -->
## File Organization

Only the four requested Markdown files belong in this phase folder; generated JSON metadata is deferred.
<!-- /ANCHOR:file-org -->

<!-- ANCHOR:summary -->
## Verification Summary

The phase remains open until every required checkbox below has evidence.
<!-- /ANCHOR:summary -->

- [x] CHK-001 [P0] An authorized exact session/artifact/revision/variant tuple returns the requested sanitized variant with matching digest and ETag. — `artifact-read.test.ts` (exact-tuple → 200 + Content-Digest + ETag).
- [x] CHK-002 [P0] `latest`, paths, URLs, cross-session tuples, unknown fields, expired/revoked tuples, and unauthorized principals are rejected with the specified status mapping. — `artifact-read.test.ts` + `artifact-auth.test.ts` (404/410/429; rejection set).
- [x] CHK-003 [P0] Reads cannot invoke pi, mint a mutation ticket, or change workspace state. — `artifact-auth.test.ts` asserts no ticket minted/consumed, no publish, no mutation; handler has no issueTicket/consumeTicket/pi call.
- [x] CHK-004 [P0] Response headers include no-store and the required content type, length, digest, ETag, disposition, nosniff, origin, and referrer controls. — `artifact-headers.test.ts`; handler writes the exact header set (`server.ts:1192-1201`).
- [x] CHK-005 [P1] Read rate limits and thumbnail/full concurrency limits are enforced. — `ArtifactReadRateLimiter` (60 thumb/30 full per 5 min; 2/1 concurrent); tested.
- [x] CHK-006 [P0] The client creates no object URL until streamed length, SHA-256, ETag/Content-Digest, and image decode pass. — `useArtifactResource.ts`: byteLength check + `subtle.digest('SHA-256')` + ETag/Content-Digest compare + `image.decode()` precede `createObjectURL`; `artifact-resource.test.ts` asserts no URL before verification.
- [x] CHK-007 [P0] Strict Mode, close, abort, revision replacement, logout, revocation, and backgrounding leave no resource leak. — ref-counted object URLs revoked on every lifecycle event; `viewer-provider.test.tsx` Strict-Mode + lifecycle coverage.
- [x] CHK-008 [P0] The shared provider mounts outside the virtualized transcript with deterministic history, focus, and scroll ownership. — reused 005 `ArtifactViewerProvider`/`Host` + `useArtifactHistory`; `viewer-history.test.tsx`; `ArtifactViewer.test.tsx` 28/28.
- [x] CHK-009 [P0] Cache Storage, IndexedDB, localStorage, history, persisted transcript state, and service-worker caches contain no artifact resource. — `cache.ts` strips artifact bytes/URLs; `service-worker.js` keeps `/api/artifacts/` network-only; `artifact-cache.test.ts`.
- [x] CHK-010 [P0] The web test flips a served byte and proves corruption renders zero pixels. — `artifact-resource.test.ts` flips a byte → digest mismatch → no object URL, zero pixels.
- [x] CHK-011 [P1] The shared viewer foundation uses safe metadata only and does not introduce send/export/share/save/copy/download actions. — `ArtifactDetails.tsx` safe-metadata only; no export/share/save/copy/download action in the viewer.
- [x] CHK-012 [P0] Security review confirms the read surface remains read-only and no-store before Phase 4 card promotion. — Claude read the read-route diffs: read-only exact-tuple, no ticket/pi/mutation, full no-store header set.
- [x] CHK-013 [P0] `npm run typecheck` passes. — exit 0.
- [x] CHK-014 [P0] `npm test` passes. — 336/336 outside sandbox (+9; the two socket-test bugs codex couldn't verify were fixed).
- [x] CHK-015 [P0] `npm run test:web` passes. — 583/583 (relay slice touched no web file).
- [x] CHK-016 [P1] The light 390px screenshot is written to `/private/tmp/...`. — `008p3b-composer-light.png` (flag-off, 390px light); the real-path mount check also passed after the CSP/service-worker changes. The inbound viewer-shell opens only from a ready card (Phase 4).
- [x] CHK-017 [P1] The dark 390px screenshot is written to `/private/tmp/...`. — `008p3b-composer-dark.png` (flag-off, 390px dark).
- [x] CHK-018 [P0] `npm run build` passes. — exit 0.
