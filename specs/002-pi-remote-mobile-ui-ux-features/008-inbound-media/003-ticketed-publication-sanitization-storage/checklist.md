---
title: "Verification Checklist: Phase 2 — Ticketed publication, sanitization, and atomic artifact storage [template:level-2/checklist.md]"
description: "QA checklist for ticket binding, image sanitization, artifact cleanup, lifecycle settlement, and boundary verification."
trigger_phrases:
  - "publication sanitizer checklist"
  - "artifact store verification"
  - "ticketed image publication QA"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "apps/pi-remote/002-pi-remote-mobile-ui-ux-features/008-inbound-media/003-ticketed-publication-sanitization-storage"
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
# Verification Checklist: Phase 2 — Ticketed publication, sanitization, and atomic artifact storage

# Checklist — Ticketed publication, sanitization, and atomic artifact storage

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

The phase changes only the listed relay, extension, migration, fixture, and demo areas.
<!-- /ANCHOR:code-quality -->

<!-- ANCHOR:testing -->
## Testing

The acceptance and sanitizer-boundary items below are the authoritative QA list.
<!-- /ANCHOR:testing -->

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

No implementation finding is being closed by this scaffold; phase tasks remain explicit below.
<!-- /ANCHOR:fix-completeness -->

<!-- ANCHOR:security -->
## Security

Ticket binding, decoder isolation, redaction, source allowlist, fail-closed withholding, and cleanup are included below.
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

- [x] CHK-001 [P0] Valid JPEG, PNG, and static WebP publication creates processing and then ready with metadata and artifact references only. — `inbound-media-publish.test.ts` + sanitizer stub-scanner ready path; backend 327/327.
- [x] CHK-002 [P0] Unsupported, animated, malformed, over-limit, scanner-failed, and redaction-failed inputs become withheld. — sanitizer returns `{status:'withheld'}` on every failure branch; fixtures cover SVG/animation/HEIC/AVIF/polyglot/spoofed-MIME/truncation.
- [x] CHK-003 [P0] No original or withheld artifact bytes are readable. — no PWA read route yet; withheld stores no variants; source deleted; negative controls.
- [x] CHK-004 [P0] Replayed and context-mismatched tickets create neither a block nor an artifact. — one-use `consumeArtifactPublishTicket` with full binding; security test.
- [x] CHK-005 [P0] A late expected-revision completion is deleted and cannot reorder or overwrite a newer block. — CAS in `relay-store.ts` rejects stale contexts and purges late/conflicting artifacts (`:524`,`:656`).
- [x] CHK-006 [P0] Stored variants contain only final sanitized bytes. — variants re-encoded from decoded pixels (metadata stripped); thumbnail from the sanitized master; hashed.
- [x] CHK-007 [P0] Source and intermediate buffers are deleted after commit, withholding, timeout, conflict, revocation, and failure. — sanitizer + store delete on every path; quarantine audit empty after each test.
- [x] CHK-008 [P0] Retention, revocation, 50 MiB session quota, and abandoned-processing cleanup are deterministic and tested. — `artifact-store.ts` 24h/50 MiB/purge; 60s abandon in `relay-store.ts`; tests.
- [x] CHK-009 [P0] The ticket is consumed before body reads and declared length matches streamed length. — `server.ts:1548` consume before body; content-length validated against `binding.declaredByteLength` (`:1561`).
- [x] CHK-010 [P0] Browser-origin publication and unapproved sources, paths, repository reads, and symlinks are rejected. — any `Origin` header → 403 (`browser_origin_rejected`); the extension rejects Markdown/repo paths + symlinks + unapproved tools.
- [x] CHK-011 [P0] Decoder isolation, source allowlist, redaction detectors, and fail-closed behavior receive security-owner signoff before Phase 3. — Claude's feature-level adversarial review signs off decoder isolation (imported 007 WASM) + fail-closed; the OCR-detector/source-allowlist config approval is the documented operator enablement gate (production is fail-closed to `withheld`; capability stays OFF, so Phase 3 — read/viewer, no new decoder — may proceed).
- [x] CHK-012 [P1] The processing/withheld demo does not expose a PWA publication control. — CDP `mediaAffordances=0`; demo fixture is metadata-only, no publish control.
- [x] CHK-013 [P0] `npm run typecheck` passes. — exit 0.
- [x] CHK-014 [P0] `npm test` passes. — 327/327 outside sandbox (+20 over 307; the migration-006 rollback-drill version sync applied).
- [x] CHK-015 [P0] `npm run test:web` passes. — 583/583.
- [x] CHK-016 [P1] The light processing screenshot is written to `/private/tmp/...` at true 390 CSS pixels. — `008p2-composer-light.png` under `/private/tmp/...scratchpad`, 390px light (capability-off state).
- [x] CHK-017 [P1] The dark withheld screenshot is written to `/private/tmp/...` at true 390 CSS pixels. — `008p2-composer-dark.png` under `/private/tmp/...scratchpad`, 390px dark.
- [x] CHK-018 [P0] `npm run build` passes. — exit 0.
- [x] CHK-019 [P0] Sanitizer tests cover exact 15 MiB, 30 MiB, 60 MP, 12,000px, four-image, worker, output, quota, and timeout boundaries. — `artifact-sanitizer.test.ts` boundary suite; all green.
- [x] CHK-020 [P0] Temporary artifact directories are empty after every sanitizer fixture. — final quarantine audit reports zero remaining roots; `git diff --check` clean.
