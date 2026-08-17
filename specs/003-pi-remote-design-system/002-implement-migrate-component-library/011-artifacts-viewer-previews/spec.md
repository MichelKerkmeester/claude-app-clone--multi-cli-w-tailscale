<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Grandchild 11 — Artifacts viewer & previews

## Summary

This grandchild migrates the full-screen artifacts viewer family — the provider, the modal host, the
in-transcript card, the header/status/controls, and the Text/Code/Diff/Markdown/Image/Pdf previews —
onto the design system. It moves their rules onto the token layers, applies the `@ds` grammar to
every editable region and each viewer/preview/resource state, and keeps the digest-verify,
no-fetch-on-open, sanitized-image, and controlled-PDF security behaviours entirely untouched. It is a
value-preserving, security-preserving restyle.

## Problem & Goal

The artifacts viewer is the app's largest read-only surface: a phased modal reader with edge-back
gesture, history integration, focus/scroll restoration, and six preview kinds each with their own
availability and failure states. Its look is authored as bespoke rules with a very large status
vocabulary and no labelled seams. A designer cannot restyle the viewer chrome, the preview controls,
or any of the many resource states without reading the resource hook and the security-sensitive
preview code. The goal is to move the whole family onto the token library and the `@ds` grammar so a
low-code designer can adjust styling, slots, layout, and each state safely, while react-aria and the
resource/security logic keep owning behaviour.

## Scope

### In scope

- Migrate `ArtifactViewerProvider`, `ArtifactViewerHost`, `ArtifactCard`, `ArtifactHeader`,
  `ArtifactStatus`, `PreviewControls`, and the Text/Code/Diff/Markdown/Image/Pdf/Unsupported previews
  onto the semantic and component token layers.
- Apply the `@ds` grammar: `@ds surface:` per component, `@ds slot:` for viewer chrome (header /
  controls / body / status) and card peek regions, `@ds edit: layout` for full-bleed iPhone layout
  and safe-area, and one `@ds state:` block per viewer, dismissal, preview, and resource state.
- Cover every visual state as its own labelled seam: viewer phase (`closed`, `opening`, `ready-diff`,
  `exiting`); dismissal reason (`close`, `escape`, `history`, `edge-back`, `voiceover-scrub`); preview
  kind (image, pdf, text, markdown, code, diff); Image (`loading`, `ready`, `corrupt`, `too-large`);
  Pdf (`loading`, `ready`, `corrupt`, `too-large`, `withheld`); and the full `ArtifactResourceStatus`
  set (idle, loading, stalled, ready, empty, whitespace, offline, stale, denied, expired, missing,
  revoked, conflict, corrupt, too-large, rate-limited, relay-error, aborted, closed).
- Fence the resource hook (digest-verify, no-fetch-on-open), the sanitized-image decode/re-encode,
  and the controlled-PDF worker behind `@ds guardrail: do-not-edit`.

### Out of scope

- Any change to a frozen source value or to Inter + Source Serif 4.
- **Any change to the digest-verified race-safe resource fetch, the no-fetch-on-open rule, the
  sanitized-image PNG decode/re-encode metadata-strip, the controlled PDF.js worker (annotations/XFA
  disabled, text-layer only when relay-attested), the authenticated exact-tuple read endpoint, or the
  policy-gated Share.** The migration restyles the family; it never touches these security behaviours.
- The shared overlay/modal primitive itself — that is grandchild `012`; this grandchild consumes it.

## User-facing behavior + states

No behaviour change. Every viewer, dismissal, preview, and resource state renders identically before
and after: the same opening/exiting choreography, the same edge-back and VoiceOver dismissal, the
same per-preview loading/corrupt/too-large/withheld treatment, and the same large resource-status
copy — now driven by tokenized, comment-labelled `@ds state:` blocks.

## Acceptance criteria

- Every artifacts component reads its colours from the semantic and component tokens; no raw source
  value is hard-coded in its rules.
- Each component declares `@ds surface:`, its slots, its layout seam, and one `@ds state:` block per
  viewer/dismissal/preview state and per `ArtifactResourceStatus`; the security wiring carries
  `@ds guardrail`.
- Every state renders identically to its pre-migration baseline in light and dark across all six
  preview kinds and the full status vocabulary.
- The security behaviours are provably unchanged (the artifact-viewer, image, and PDF tests stay
  green).
- `npm run typecheck`, `npm test`, `npm run test:web`, and `npm run build` pass; the true-390px
  light/dark captures of the viewer and each preview are visually unchanged.

## Security & Redaction

Styling-only, over the app's most security-sensitive read surface. The migration touches no
digest-verify, no-fetch-on-open, sanitized-image, controlled-PDF, exact-tuple read, or policy-gated
Share behaviour; all of that stays behind `@ds guardrail` comments and unchanged. No new dependency
is added (pdfjs-dist stays pinned as-is). The frozen read-only-by-default posture — auth-first,
ticket-free, no-store/nosniff/same-origin — is preserved verbatim.

## Dependencies & affected areas

- Surface (all in `apps/pi-remote-web/src/artifacts/`): `ArtifactViewerProvider.tsx`,
  `ArtifactViewerHost.tsx`, `ArtifactCard.tsx`, `ArtifactHeader.tsx`, `ArtifactStatus.tsx`,
  `PreviewControls.tsx`, `TextPreview.tsx`, `CodePreview.tsx`, `DiffPreview.tsx`, `MarkdownPreview.tsx`,
  `ImagePreview.tsx`, `PdfPreview.tsx`, `UnsupportedPreview.tsx`.
- Logic (read, not restyled): `apps/pi-remote-web/src/artifacts/useArtifactResource.ts`,
  `useArtifactHistory.ts`, `artifact-share.ts`.
- Styles: the artifact-viewer and preview rules in `apps/pi-remote-web/src/style.css`.
- Consumes: grandchild `012-overlays-sheets-modals` (the modal primitive) and the token library.
- Tests: `apps/pi-remote-web/tests/ArtifactViewer.test.tsx` and the image/PDF/preview suites.
- Baseline evidence: `scripts/design-system-cdp.mjs` with the artifact-viewer and preview fixtures.
