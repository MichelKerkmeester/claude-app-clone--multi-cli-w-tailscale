# Checklist — Artifacts viewer & previews

- [ ] Every artifacts component reads its colours from the semantic and component tokens; no raw
      source value is hard-coded in its rules.
- [ ] Each component declares `@ds surface:`, its slots, its layout seam, and one `@ds state:` block
      per viewer/dismissal/preview state and per `ArtifactResourceStatus`.
- [ ] The resource hook (digest-verify, no-fetch-on-open), sanitized image, controlled PDF worker,
      exact-tuple read, and policy-gated Share carry `@ds guardrail: do-not-edit` and are unchanged.
- [ ] Every state renders identically to its pre-migration baseline in light and dark across all six
      preview kinds and the full status vocabulary.
- [ ] The artifact-viewer / image / PDF tests stay green, proving the security behaviours are unchanged.
- [ ] No source value or security behaviour is changed; no new dependency is added (pdfjs-dist pinned).
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run test:web` passes.
- [ ] `npm run build` passes.
- [ ] The true-390px light capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline.
- [ ] The true-390px dark capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline.
