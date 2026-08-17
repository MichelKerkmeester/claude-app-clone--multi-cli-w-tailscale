# Tasks — Artifacts viewer & previews

- [ ] Inventory the artifact-viewer and preview rules in `style.css` and record each viewer phase,
      dismissal, preview kind, and resource-status appearance.
- [ ] Map each component's colours onto the semantic role tokens (and component-token sets for the
      viewer chrome and preview controls where warranted), resolving to the same values.
- [ ] Add `@ds surface:` per component, label slots (`@ds slot:` header / controls / body / status
      and card peek), and the layout seam (`@ds edit: layout` for full-bleed iPhone layout, safe-area).
- [ ] Wrap each visual state in a `@ds state:` block: viewer phase; dismissal reason; preview kind;
      Image loading/ready/corrupt/too-large; Pdf loading/ready/corrupt/too-large/withheld; and each
      `ArtifactResourceStatus` value.
- [ ] Fence the resource hook (digest-verify, no-fetch-on-open), the sanitized-image decode/re-encode,
      the controlled PDF.js worker, the exact-tuple read, and the policy-gated Share with
      `@ds guardrail: do-not-edit`.
- [ ] Run the artifact-viewer, image, and PDF tests to prove the security behaviours are unchanged.
- [ ] Capture the viewer and each preview at true-390px light/dark across their principal states and
      diff against the pre-migration baseline.
- [ ] Run the full verification gate and record evidence in `checklist.md`.
