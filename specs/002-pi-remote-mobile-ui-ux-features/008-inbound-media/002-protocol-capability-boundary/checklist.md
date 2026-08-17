---
title: "Verification Checklist: Phase 1 — Protocol and pre-stdout capability boundary [template:level-2/checklist.md]"
description: "QA checklist for the versioned protocol, host seam, unsupported behavior, and 390px verification gate."
trigger_phrases:
  - "protocol verification checklist"
  - "pre-stdout verification"
  - "inbound media phase one QA"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "apps/pi-remote/002-pi-remote-mobile-ui-ux-features/008-inbound-media/002-protocol-capability-boundary"
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
# Verification Checklist: Phase 1 — Protocol and pre-stdout capability boundary

# Checklist — Protocol and pre-stdout capability boundary

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

The phase changes only the listed protocol, host, compatibility, and harness areas.
<!-- /ANCHOR:code-quality -->

<!-- ANCHOR:testing -->
## Testing

The acceptance and verification items below are the authoritative QA list.
<!-- /ANCHOR:testing -->

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

No implementation finding is being closed by this scaffold; phase tasks remain explicit below.
<!-- /ANCHOR:fix-completeness -->

<!-- ANCHOR:security -->
## Security

The no-byte, no-path, no-URL, host-authority, and fail-closed requirements are included below.
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

- [x] CHK-001 [P0] All valid processing, ready, and terminal `inbound_image` shapes are accepted by the protocol guard. — `guards.test.ts` valid-lifecycle fixtures pass (backend 307/307).
- [x] CHK-002 [P0] Unknown fields, unsafe paths/URLs/base64/OCR values, malformed digests or revisions, invalid bounds, and inconsistent availability/content combinations are rejected. — exact-key guard + `isInboundSafeText` reject `/`,`\`,`data:`/`blob:`/`javascript:`, base64/PNG/PDF sigs, `ocr`, filename patterns; digest-derived IDs + `latest`/`.`/`..` rejected; `shareAllowed===false` enforced; adversarial fixtures pass.
- [x] CHK-003 [P1] Existing transcript kinds and F5 `ImageContent` remain type-compatible. — full backend suite green incl. existing transcript/protocol tests.
- [x] CHK-004 [P1] Unknown inbound blocks render as the existing unsupported/redacted row and are not silently dropped. — `state.ts` routes `inbound_image` → unknown-display; `App.tsx` renders the unsupported row with the original kind.
- [x] CHK-005 [P0] The host capability is advertised only after cli-pi 0.95/0.20 pre-stdout interception is proven. — `createInboundMediaHostAdapter` sets `capability = undefined` unless `interception.available === true`; pi 0.84.2 → no capability.
- [x] CHK-006 [P0] The unavailable-seam test proves no image-bearing content reaches stdout or session writes. — `publisher-boundary.test.ts` spies stdout/session and asserts nothing forwarded when interception is unavailable.
- [x] CHK-007 [P0] No image byte, base64, path, or URL is added to JSONL, sync, transcript, or durable state. — no publication route added; the durable block is metadata-only (guard rejects bytes/paths/URLs); no transport ceiling raised.
- [x] CHK-008 [P0] Plan mode remains read-only and the phone cannot authorize capture. — `pi-remote-plan` unchanged; the seam is host-only and the phone is never a capture/publication authorizer.
- [x] CHK-009 [P1] The disabled/unsupported fixture shows no feature-enabling control in light and dark themes. — CDP `mediaAffordances=0` at 390px light+dark; demo disabled/unsupported fixture.
- [x] CHK-010 [P1] The CDP runner uses `Emulation.setDeviceMetricsOverride` or equivalent at exactly 390 CSS pixels. — CDP harness sets device metrics width 390 (verified `width=390` both themes).
- [x] CHK-011 [P0] `npm run typecheck` passes. — exit 0.
- [x] CHK-012 [P0] `npm test` passes. — 307/307 outside sandbox (+4 over 303; codex in-sandbox EPERM not reproduced).
- [x] CHK-013 [P0] `npm run test:web` passes. — 581/581.
- [x] CHK-014 [P1] The light screenshot is written to `/private/tmp/...`. — `008p1-composer-light.png` under `/private/tmp/...scratchpad` (outside the repo), 390px light.
- [x] CHK-015 [P1] The dark screenshot is written to `/private/tmp/...`. — `008p1-composer-dark.png` under `/private/tmp/...scratchpad` (outside the repo), 390px dark.
- [x] CHK-016 [P0] `npm run build` passes. — exit 0.
- [x] CHK-017 [P0] Security review is recorded before the Phase 2 binary publication boundary is exposed. — feature-level `008-inbound-media/adversarial-security-review.md` (APPROVED, capability off; two MUST-FIX for Phase 2).
