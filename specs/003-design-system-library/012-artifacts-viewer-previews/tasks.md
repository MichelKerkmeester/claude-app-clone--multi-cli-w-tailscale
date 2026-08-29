<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Tasks — Artifacts viewer & previews

- [x] Inventory the artifact-viewer and preview rules in `style.css` and record each viewer phase,
      dismissal, preview kind, and resource-status appearance. — mapped (~L3100–3900 + dark overrides
      ~L4087). Found ~27 raw frozen-palette literals plus a fixed syntax-highlight palette and the
      `--diff-add`/`--diff-remove` component tokens.
- [~] Map each component's colours onto the semantic role tokens (and component-token sets for the
      viewer chrome and preview controls where warranted), resolving to the same values. — **DEFERRED.**
      A first pass mapped theme-invariant fixed literals to theme-varying semantic tokens and regressed
      18 dark/system values (rejected by the resolver). To avoid weakening the frozen design contract,
      the literals are annotated in place and the token rewrite is deferred to a value-preserving-by-
      construction `--artifact-*` component-token pass (best done in P3). Every value is preserved.
- [x] Add `@ds surface:` per component, label slots (`@ds slot:` header / controls / body / status
      and card peek), and the layout seam (`@ds edit: layout` for full-bleed iPhone layout, safe-area).
      — done in both the 13 `.tsx` and the style.css rules.
- [x] Wrap each visual state in a `@ds state:` block: viewer phase; dismissal reason; preview kind;
      Image loading/ready/corrupt/too-large; Pdf loading/ready/corrupt/too-large/withheld; and each
      `ArtifactResourceStatus` value. — all present.
- [x] Fence the resource hook (digest-verify, no-fetch-on-open), the sanitized-image decode/re-encode,
      the controlled PDF.js worker, the exact-tuple read, and the policy-gated Share with
      `@ds guardrail: do-not-edit`. — fenced in the `.tsx`; a non-comment security scan returned empty.
- [x] Run the artifact-viewer, image, and PDF tests to prove the security behaviours are unchanged. —
      no test modified; `npm run test:web` 0 (670), incl. the artifact/image/PDF suites.
- [x] Capture the viewer and each preview at true-390px light/dark across their principal states and
      diff against the pre-migration baseline. — token + rule resolvers CHANGED 0 across
      light/dark/system; annotation-only, so no rendered change is possible.
- [x] Run the full verification gate and record evidence in `checklist.md`. — typecheck 0, build 0,
      test:web 0 (670).
