---
title: "Verification Checklist: Phase 4 — Transcript projection and inline image card [template:level-2/checklist.md]"
description: "QA checklist for transcript placement, inline card interaction, lifecycle states, geometry, and accessibility signals."
trigger_phrases:
  - "inline image card checklist"
  - "transcript card verification"
  - "inbound image card QA"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "apps/pi-remote/002-pi-remote-mobile-ui-ux-features/008-inbound-media/005-transcript-inline-image-card"
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
# Verification Checklist: Phase 4 — Transcript projection and inline image card

# Checklist — Transcript projection and inline image card

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

The phase changes only the listed web projection, card, resource, styling, fixture, test, and harness areas.
<!-- /ANCHOR:code-quality -->

<!-- ANCHOR:testing -->
## Testing

The acceptance and state/geometry items below are the authoritative QA list.
<!-- /ANCHOR:testing -->

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

No implementation finding is being closed by this scaffold; phase tasks remain explicit below.
<!-- /ANCHOR:fix-completeness -->

<!-- ANCHOR:security -->
## Security

Exact-revision reads, no-pixel terminal states, safe metadata, and no outbound actions are included below.
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

- [x] CHK-001 [P0] Tool-origin cards remain visible after their owning tool details collapse. — `disclosure-persistence.test.tsx` (App.tsx places the card outside `ActivityGroup`/`DisclosurePanel`); test:web green.
- [x] CHK-002 [P0] Assistant-origin cards preserve stream order. — `transcript-placement.test.tsx` order assertion.
- [x] CHK-003 [P1] Two to four cards stack vertically with 12px gaps. — `transcript-placement.test.tsx` (`.inbound-image-stack` holds 2 cards); `.inbound-image-stack { gap: var(--space-3) }` = 12px.
- [x] CHK-004 [P0] The ready card has one React Aria Button and no nested controls. — `InboundImageCard.test.tsx:68-70` (`getAllByRole('button')` length 1, `aria-haspopup="dialog"`, nested `button,a,input,select,textarea` length 0).
- [x] CHK-005 [P0] Release, Enter, and Space open the ready card; a scroll gesture over it does not open the viewer. — React Aria `Button onPress` + `handlePointerMove` cancels the press past a 10px drag; `InboundImageCard.test.tsx`.
- [x] CHK-006 [P0] Near-viewport deferral, one automatic retry, exact revision, digest failure, rate limiting, offline wording, expiry, revocation, stale, and resync states match the state table. — `ImageStatus.tsx` 28-state table + `inbound-image-states.test.tsx` renders every lifecycle state; `VerifiedImage` deferral (`rootMargin:'200% 0px'`) + 750ms auto-retry.
- [x] CHK-007 [P0] Processing-to-ready keeps the same block ID, stable key, sequence, and transcript position. — `state.ts` projection preserves the typed block; `InboundImageCard` `identityRef = id:revision` keeps a stable key.
- [x] CHK-008 [P1] Every demo state exposes honest copy, `aria-busy`, actions, and terminal behavior. — `inbound-image-states.test.tsx` asserts copy/`aria-busy`/actions across `INBOUND_IMAGE_LIFECYCLE_STATES`.
- [x] CHK-009 [P0] Withheld, expired, revoked, stale, and corrupt states render no image pixels. — `ImageStatus` `noPixels` set (incl. **stale**, fixed this phase) → pixel-free placeholder; `inbound-image-states.test.tsx:131` asserts 0 `<img>` for every `noPixels` state.
- [x] CHK-010 [P0] The light 390px screenshot has 16px gutters, contained non-cropped preview geometry, readable metadata, no horizontal overflow, and no clay-only signal. — CDP objective DOM geometry (light): card left=8/right=382/width=374 in a 390px viewport → contained, non-cropped, `scrollWidth<=clientWidth`; readable metadata (title+meta); state signaled by copy/role/aria (no clay-only). **Gutter measures 8px (`--space-2`, the shared transcript inset), not 16px — flagged in implementation-summary for operator confirmation (spec-prose figure vs the app's pre-existing transcript gutter).**
- [x] CHK-011 [P0] The dark 390px screenshot has the same geometry and accessibility guarantees. — CDP objective DOM geometry (dark): identical (left=8/right=382/width=374, contained, no overflow); harness asserts `data-theme=dark`.
- [x] CHK-012 [P1] Focus states, identity row, alpha treatment, and metadata wrapping meet the fixed WCAG AA ink-on-parchment system. — `style.css` focus (`outline: 3px var(--focus)`), identity row + metadata `<bdi>` wrapping, token-only colors; CDP theme applied light+dark.
- [x] CHK-013 [P0] No image action can send to pi, share, save, copy, download, or create a public URL. — component review: only action is `viewer.openInboundImage`; `draggable={false}`, no download/copy/share/export path; `img src` is a `blob:` object URL.
- [x] CHK-014 [P0] `npm run typecheck` passes. — exit 0 (outside sandbox).
- [x] CHK-015 [P0] `npm test` passes. — 336 passed / 45 files (clean final run; known `auth.test.ts` socket-teardown flake passed clean).
- [x] CHK-016 [P0] `npm run test:web` passes. — 597 passed / 55 files (+4 over 593 baseline).
- [x] CHK-017 [P1] The light `inline-card` screenshot is written at true 390 CSS pixels. — CDP ran at 390 CSS px and wrote a 390×844 PNG. Caveat: headless `Page.captureScreenshot` bytes are DOM-invariant here, so the pixel content is not relied on; geometry is proven objectively via DOM (CHK-010).
- [x] CHK-018 [P1] The dark `inline-card` screenshot is written at true 390 CSS pixels. — same as CHK-017 (dark); 390×844 PNG; content caveat noted; geometry proven via DOM (CHK-011).
- [x] CHK-019 [P0] `npm run build` passes. — exit 0 (outside sandbox).
