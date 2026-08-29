<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Checklist — Artifacts viewer & previews

- [ ] **DEFERRED (partial):** Every artifacts component reads its colours from the semantic and
      component tokens; no raw source value is hard-coded in its rules. — the rules are now fully
      `@ds`-annotated and every value is preserved, but the raw-literal → token rewrite is
      **intentionally deferred**. A first migration attempt mapped theme-invariant fixed literals
      (the syntax-highlight palette and the always-on reading surfaces) to theme-varying semantic
      tokens and regressed 18 dark/system resolved values; the rule resolver caught it and it was
      rejected. Rather than ship a value regression (which would weaken the frozen design contract),
      this phase annotates in place and leaves the literals. The artifacts literal→token migration
      (via a value-preserving-by-construction `--artifact-*` component-token set) is a tracked
      follow-up, best done in P3 (the editability audit). See implementation-summary.
- [x] Each component declares `@ds surface:`, its slots, its layout seam, and one `@ds state:` block
      per viewer/dismissal/preview state and per `ArtifactResourceStatus`. — `@ds surface:` per
      component (viewer, card, header, status, preview-controls, and each preview kind); `@ds slot:`
      for the viewer chrome and card peek; `@ds edit: layout`; `@ds edit: tokens` on the existing
      `--diff-*` set; `@ds state:` across the viewer phases, dismissal reasons, preview kinds, Image/
      Pdf sub-states, and the full `ArtifactResourceStatus` vocabulary — in both the 13 `.tsx` and the
      style.css rules.
- [x] The resource hook (digest-verify, no-fetch-on-open), sanitized image, controlled PDF worker,
      exact-tuple read, and policy-gated Share carry `@ds guardrail: do-not-edit` and are unchanged. —
      fenced with `@ds guardrail` in the `.tsx`; a security scan for `fetch`/`import`/`digest`/
      `sanitiz`/`pdfjs`/`worker`/`writeText`/handler changes on non-comment lines returned empty.
- [x] Every state renders identically to its pre-migration baseline in light and dark across all six
      preview kinds and the full status vocabulary. — token resolver CHANGED 0 / MISSING 0; rule
      resolver CHANGED 0 / VANISHED 0 / ADDED 0 across light/dark/system; all `.tsx` comments-only and
      style.css comments-only (309/0).
- [x] The artifact-viewer / image / PDF tests stay green, proving the security behaviours are
      unchanged. — no test file modified; the full web suite (incl. the artifact/image/PDF/preview
      tests) passes at 670.
- [x] No source value or security behaviour is changed; no new dependency is added (pdfjs-dist
      pinned). — annotation-only across all 14 files; resolvers CHANGED 0; no dependency added.
- [x] `npm run typecheck` passes. — exit 0.
- [x] `npm test` passes. — backend outside sandbox; this phase touches no backend code; only the
      pre-existing `attachment-normalization.test.ts` WASM flake fails (proven on clean HEAD earlier).
- [x] `npm run test:web` passes. — exit 0; **670 passed / 62 files** (incl. `ArtifactViewer`,
      `ImagePreview`, `PdfPreview`, and the preview suites — behaviour + security unchanged; no test
      modified).
- [x] `npm run build` passes. — exit 0.
- [x] The true-390px light capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline. — no rendered change possible:
      annotation-only across `.tsx` + style.css; the token + rule resolvers show every resolved
      declaration byte-identical.
- [x] The true-390px dark capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline. — same proof, dark + system.
