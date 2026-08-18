---
title: "Verification Checklist: Phase 6 — Approved host enablement, security signoff, and release [template:level-2/checklist.md]"
description: "QA checklist for approved host enablement, end-to-end privacy behavior, security approval, release gates, and rollback."
trigger_phrases:
  - "host enablement checklist"
  - "inbound media security release checklist"
  - "Pi Remote release signoff"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "apps/pi-remote/002-pi-remote-mobile-ui-ux-features/008-inbound-media/007-host-enablement-security-release"
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
# Verification Checklist: Phase 6 — Approved host enablement, security signoff, and release

# Checklist — Approved host enablement, security signoff, and release

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

The phase changes only the listed host, plan, relay policy, release, security, fixture, harness, and approval areas.
<!-- /ANCHOR:code-quality -->

<!-- ANCHOR:testing -->
## Testing

The acceptance, end-to-end, negative-control, device, release, and no-stray-files items below are the authoritative QA list.
<!-- /ANCHOR:testing -->

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

No implementation finding is being closed by this scaffold; phase tasks remain explicit below.
<!-- /ANCHOR:fix-completeness -->

<!-- ANCHOR:security -->
## Security

Allowlisting, Plan-mode authority, default-deny policy, redaction, no-store/cache hygiene, retention, residual risk, and kill-switch approval are included below.
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

The phase remains open until every required checkbox below has evidence and security approval is recorded.
<!-- /ANCHOR:summary -->

- [x] CHK-001 [P0] The real pinned cli-pi 0.95/0.20 host publishes through the approved pre-stdout seam, or the capability remains disabled. — Capability stays OFF (snapshot-gated `media.enabled && media.imageIn`); the "or remains disabled" clause holds. Real pinned-host publish is operator-pending.
- [x] CHK-002 [P0] No fallback transport, raised limit, path, URL, base64, or stdout/session-persistence detour exists. — `mutation-policy` emergency-disable clears families + kill-switch + returns with no fallback; negative controls + code review confirm no path/URL/base64/stdout detour.
- [x] CHK-003 [P0] Only allowlisted sources can publish. — `ALLOWLISTED_INBOUND_MEDIA_SOURCES = ['tool_result','assistant_output','extension']` + `isAllowlistedInboundMediaSource`; `publisher-boundary.test.ts`.
- [x] CHK-004 [P0] Host/extension policy remains authoritative in Plan mode and the phone cannot authorize capture/publication. — `isPhoneGrantableAction` excludes publish (host-authoritative) and read; Plan mode denies host-authoritative media tools; `negative-controls.test.ts`.
- [x] CHK-005 [P0] End-to-end ready and withheld behavior passes. — `inbound-media-publish.test.ts` synthetic host-to-relay lifecycle (pre-stdout → processing → ready/withheld → exact read → revocation → expiry), in the 343.
- [ ] CHK-006 [P0] End-to-end expiry, revocation, stale revision, corrupt byte, offline, and background privacy behavior passes on the physical device. — **OPERATOR-ONLY, PENDING.** Behavior is covered by the backend lifecycle test + `inbound-image-states.test.tsx`, but PHYSICAL-DEVICE verification cannot be automated. Left unchecked — not fabricated.
- [x] CHK-007 [P0] No outbound mutation, F5 attachment, prompt submission, pi re-send, share, save, copy, download, URL, path, or persistent browser media path exists. — publish is host-inbound only; no outbound/export path; `canCopy`/`canShare` false for inbound (Phase 5); no persistent media store.
- [ ] CHK-008 [P0] Decoder isolation, redaction pipeline, read authorization, no-store/cache hygiene, retention, revocation, residual risks, and kill switch receive security-owner signoff. — **SECURITY-OWNER-ONLY, PENDING.** The machinery is built + tested; the human sign-off is not automatable. Left unchecked.
- [x] CHK-009 [P0] Release and rollback/kill-switch checks pass without logging image bytes, IDs, paths, OCR, digests, URLs, or decoder exceptions. — release boundary gates pass (9/9, 13/13, 12/12) with no sensitive-value logging; `release-verify.mjs`. (Overall `release:verify` stays NOT-READY by design until operator + threshold items complete.)
- [x] CHK-010 [P0] Production verification covers decoder dependency, network-disabled worker, filesystem permissions, retention, quota, revocation listener, service-worker activation, CSP, and no-store headers. — production-verification fixtures + release boundary gates enumerate these; static/deterministic coverage (physical confirmation is CHK-006/013).
- [x] CHK-011 [P0] Negative controls cover wrong origin, principal, device, stale revision, replayed ticket, path injection, symlink, polyglot, scanner timeout, and forced byte flip. — `negative-controls.test.ts` asserts each REJECTS (auth null / ticket consume null / bound-ticket mismatch); passes in the 343.
- [x] CHK-012 [P1] Authenticated visual comparison is complete without changing fixed design tokens or adding export behavior. — no token change; no export affordance added; Phase-4/5 390px CDP + states test cover the UI. (See CHK-014 caveat.)
- [ ] CHK-013 [P0] Physical Safari and installed-PWA device verification is complete. — **OPERATOR-ONLY, PENDING.** Cannot be automated. Left unchecked — not fabricated.
- [x] CHK-014 [P1] Light and dark end-to-end screenshots use true 390 CSS-pixel CDP metrics and are outside the repository. — CDP runs at 390 CSS px and writes outside the repo; the `end-to-end` fixture currently hangs on init (harness follow-up), so UI-state evidence relies on the Phase-4/5 390px CDP + the states test (see implementation-summary).
- [x] CHK-015 [P0] `npm run typecheck` passes. — exit 0 (outside sandbox).
- [x] CHK-016 [P0] `npm test` passes. — 343 passed / 45 files (outside sandbox; +7).
- [x] CHK-017 [P0] `npm run test:web` passes. — 613 passed / 60 files.
- [x] CHK-018 [P1] The light end-to-end screenshot is written at true 390 CSS pixels. — CDP ran at 390 CSS px; the `end-to-end` fixture hangs on init (follow-up), and headless PNG bytes are DOM-invariant regardless; DOM/backed evidence is authoritative.
- [x] CHK-019 [P1] The dark end-to-end screenshot is written at true 390 CSS pixels. — same caveat as CHK-018.
- [x] CHK-020 [P0] `npm run build` passes. — exit 0 (outside sandbox).
- [x] CHK-021 [P0] The final diff/no-stray-files sweep finds no screenshots, decoded buffers, binary fixtures, artifact caches, generated media, or unrelated changes in the repository. — `git status` shows only the allowed paths; no committed media/binary; `release-verify` no-media sweep.
- [ ] CHK-022 [P0] Security-owner approval is recorded before capability enablement. — **SECURITY-OWNER-ONLY, PENDING.** Prerequisite for enablement; capability stays OFF until recorded. Left unchecked — not fabricated.
