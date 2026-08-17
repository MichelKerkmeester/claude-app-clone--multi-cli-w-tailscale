---
title: "Verification Checklist: Phase 5 — Fullscreen interaction, privacy lifecycle, and accessibility hardening [template:level-2/checklist.md]"
description: "QA checklist for exact viewer interaction, privacy covering/purge, accessibility alternatives, device behavior, and release readiness."
trigger_phrases:
  - "fullscreen viewer checklist"
  - "privacy lifecycle verification"
  - "mobile viewer accessibility QA"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "apps/pi-remote/002-pi-remote-mobile-ui-ux-features/008-inbound-media/006-fullscreen-privacy-accessibility"
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
# Verification Checklist: Phase 5 — Fullscreen interaction, privacy lifecycle, and accessibility hardening

# Checklist — Fullscreen interaction, privacy lifecycle, and accessibility hardening

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

The phase changes only the listed viewer, resource, lifecycle, style, test, and harness areas.
<!-- /ANCHOR:code-quality -->

<!-- ANCHOR:testing -->
## Testing

The acceptance, privacy, accessibility, CDP, and device items below are the authoritative QA list.
<!-- /ANCHOR:testing -->

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

No implementation finding is being closed by this scaffold; phase tasks remain explicit below.
<!-- /ANCHOR:fix-completeness -->

<!-- ANCHOR:security -->
## Security

Exact identity, integrity-before-pixels, opaque privacy covering, synchronous purge, and no export actions are included below.
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

- [x] CHK-001 [P0] Opening freezes the exact ID/revision/digest. — `capturePreview` deep-`Object.freeze`s block + artifact (full/thumbnail) + presentation/redaction/content; `InboundImageViewer.test.tsx`.
- [x] CHK-002 [P0] Opening blurs the composer, preserves transcript scroll, pushes one history child, traps focus, and restores focus/scroll on every specified close path. — `markViewerOpen` blurs composer (`data-artifact-viewer-open` → `.composer-region` blur); one history child via `useArtifactHistory`; close restores; `viewer-interaction.test.tsx`.
- [x] CHK-003 [P0] Thumbnail remains visible while the full variant fetches. — `clearArtifactFullResourceStore` drops full but keeps the verified thumbnail; Host keeps `thumbnailResource` until `viewer-ready`.
- [x] CHK-004 [P0] Full pixels appear only after length, digest, ETag/Content-Digest, and decode checks pass. — Host `viewer-ready` requires `resource.objectUrl !== null`, created only after length+revision+contentType+ETag/Content-Digest+SHA-256+`requireImageDecode`; failed check commits zero full pixels; `viewer-races.test.tsx`.
- [x] CHK-005 [P0] Direct-manipulation zoom/pan and visible single-pointer/keyboard alternatives both work. — `PreviewControls` zoom/fit + directional pan buttons and keyboard handlers; `viewer-interaction.test.tsx`.
- [x] CHK-006 [P0] Viewer gestures do not conflict with transcript scroll or dismiss the viewer. — pointer handling scoped to the stage; `viewer-interaction.test.tsx` / `viewer-races.test.tsx`.
- [x] CHK-007 [P0] Full-degraded, stalled, offline-loaded, offline-unavailable, denied, corrupt, stale, revoked, privacy-covered, closing, and aborted states match the state table with bounded retry. — Host state→phase mapping + `useArtifactResource` stalled(15s)/offline/abort/one-generation retry; `viewer-races.test.tsx`.
- [x] CHK-008 [P0] Backgrounding, pagehide, logout, session switch, revocation, transcript supersession, and close synchronously cover and purge pixels, URLs, and retained resources. — `close(reason)` shows opaque curtain + strips `src`/`srcset` + `purgeArtifactResourceStore` (revokes URLs, cancels requests) + generation bump, wired to every event; `privacy-lifecycle.test.tsx`.
- [x] CHK-009 [P0] Light/dark, 320px, 200% text, RTL, increased contrast, reduced motion, portrait, and landscape have no obscured controls or page-level overflow. — CDP 390px light+dark no page overflow; `style.css` `@media (prefers-contrast: more)` + reduced-motion + safe-area/100dvh geometry; `accessibility.test.tsx`. (No dedicated `contrast.test.tsx` — functional CSS only; see implementation-summary.)
- [x] CHK-010 [P1] Opaque carbon stage, safe areas, visual viewport, 100dvh/100svh, overscroll, focus rings, and 44px controls follow the fixed design and accessibility contract. — `style.css` curtain `#24221f`/inset:0/z-index, 100dvh-100svh, focus rings, ≥44px controls, token-only colors.
- [x] CHK-011 [P0] No export, capture, re-send, share, save, copy, download, or public URL action exists. — `canCopy`/`canShare` are `inbound === null`-gated (false for images); CDP `viewer-ready` asserts zero forbidden controls in the opened dialog (both themes); images non-draggable; object URLs memory-only/revoked.
- [ ] CHK-012 [P0] The manual Safari and installed-PWA matrix passes on the oldest supported iPhone before Phase 6. — **OPERATOR-ONLY, PENDING.** Physical VoiceOver / Switch Control / Voice Control / edge-back / App-Switcher-cover / bfcache / landscape / RTL / 320px / 200%-text verification on the oldest supported iPhone in Safari + installed-PWA standalone. Cannot be automated; a Phase-6 enablement prerequisite. Left unchecked — not fabricated.
- [x] CHK-013 [P0] `npm run typecheck` passes. — exit 0 (outside sandbox).
- [x] CHK-014 [P0] `npm test` passes. — 336 passed / 45 files (clean, outside sandbox).
- [x] CHK-015 [P0] `npm run test:web` passes. — 613 passed / 60 files (+16 over 597).
- [x] CHK-016 [P1] The light `viewer-ready` screenshot is written at true 390 CSS pixels. — CDP `viewer-ready` ran at 390 CSS px (viewer opened + asserted). Caveat: headless PNG bytes are DOM-invariant; DOM assertions are authoritative (see implementation-summary).
- [x] CHK-017 [P1] The dark `viewer-ready` screenshot is written at true 390 CSS pixels. — same as CHK-016 (dark); content caveat noted.
- [x] CHK-018 [P0] `npm run build` passes. — exit 0 (outside sandbox).
