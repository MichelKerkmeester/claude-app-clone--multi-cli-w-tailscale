# Plan — Artifacts viewer & previews

## Approach

Restyle in place, value-preserving and security-preserving. Read the artifact-viewer and preview
rules, map each colour onto the semantic role tokens, wrap every editable region and each viewer /
dismissal / preview / resource state in the `@ds` grammar, and leave the resource hook, sanitized
image, and controlled PDF worker untouched behind guardrail comments. Prove pixel-identity across all
six preview kinds and the full status vocabulary, and prove the security behaviours unchanged by
keeping the artifact/image/PDF tests green.

## Steps

1. Inventory the artifact-viewer and preview rules in `style.css` and record each viewer phase,
   dismissal, preview kind, and resource-status appearance.
2. Map each component's colours onto the semantic role tokens (and component-token sets for the viewer
   chrome and preview controls where warranted), resolving to the same values.
3. Add `@ds surface:` per component, label slots (`@ds slot:` header / controls / body / status and
   card peek), and the layout seam (`@ds edit: layout` for full-bleed iPhone layout and safe-area).
4. Wrap each visual state in a `@ds state:` block: viewer phase; dismissal reason; preview kind;
   Image loading/ready/corrupt/too-large; Pdf loading/ready/corrupt/too-large/withheld; and each
   `ArtifactResourceStatus` value.
5. Fence the resource hook (digest-verify, no-fetch-on-open), the sanitized-image decode/re-encode,
   the controlled PDF.js worker, the exact-tuple read, and the policy-gated Share with
   `@ds guardrail: do-not-edit`.
6. Run the artifact-viewer, image, and PDF tests to prove the security behaviours are unchanged.
7. Capture the viewer and each preview at true-390px light/dark across their principal states and diff
   against the pre-migration baseline.

## Files to change

- `apps/pi-remote-web/src/artifacts/ArtifactViewerProvider.tsx`, `ArtifactViewerHost.tsx`,
  `ArtifactCard.tsx`, `ArtifactHeader.tsx`, `ArtifactStatus.tsx`, `PreviewControls.tsx`,
  `TextPreview.tsx`, `CodePreview.tsx`, `DiffPreview.tsx`, `MarkdownPreview.tsx`, `ImagePreview.tsx`,
  `PdfPreview.tsx`, `UnsupportedPreview.tsx` (class/slot/state labels; behaviour and security unchanged)
- `apps/pi-remote-web/src/style.css` (artifact-viewer and preview rules onto tokens)
- `apps/pi-remote-web/src/design-system/tokens.md` (document any viewer/preview component-token set)
- `scripts/design-system-cdp.mjs` (artifact-viewer and preview capture support, if needed)

## Verification gate

Run from the repository root:

```text
npm run typecheck
npm test
npm run test:web
npm run build
node scripts/design-system-cdp.mjs --surface artifacts-viewer --viewport-width 390 --theme light --output <temporary-directory>/artifacts-viewer-light.png
node scripts/design-system-cdp.mjs --surface artifacts-viewer --viewport-width 390 --theme dark --output <temporary-directory>/artifacts-viewer-dark.png
```

The gate passes only when all suites and the build pass, the artifact-viewer / image / PDF tests stay
green proving the security behaviours are unchanged, the CDP runner reports exactly 390 CSS pixels
with zero page horizontal overflow, and every viewer/preview/resource state is visually identical to
its pre-migration baseline in both themes with no source value changed and no security behaviour
touched.
