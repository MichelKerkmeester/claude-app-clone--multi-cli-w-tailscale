<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Implementation Summary — 003 P2 grandchild 002 (light/dark theming & contrast)

## Final state — COMPLETE

The three theme states now read as one labelled semantic→primitive remap each, the component dark
sets are fenced as labelled remap blocks, and WCAG AA contrast is guaranteed at the token layer with
the contrast test extended to every role pair. Value-preserving: every surface resolves to the same
colour in light, dark, and system as before. Built by **DeepSeek V4 Flash MAX (Cline CLI)**;
orchestrated and independently verified by Claude on `main` outside the sandbox. No token value,
theming mechanism, security boundary, or dependency changed.

## What shipped

- **`apps/pi-remote-web/src/style.css`** (labels + one safe re-point) — the light, dark, and
  system-dark semantic blocks are each labelled `@ds edit: tokens — theme remap, <state>`; the dark
  and system variants of `--model-sheet-*` / `--slash-*` are fenced as labelled remap blocks. One
  value-preserving re-point: `--surface-code` in the dark and system blocks moves from the literal
  `#24221f` to `var(--pi-bone)` — and `--pi-bone` in those themes **is** `#24221f`, so it resolves
  identically (light `--surface-code` stays the literal `#24221f`). The theming mechanism (selectors,
  the `@media` query, `data-theme`) is untouched; the primitive `@ds guardrail` blocks are intact.
- **`apps/pi-remote-web/tests/contrast.test.tsx`** (additive) — 5 previously-unguarded role pairs
  added: `warning`/`warning-soft` (light + dark), `danger`/`danger-soft` (dark), and the focus ring
  on surface and on canvas (dark). Each hex was verified against the real resolved token value; each
  passes (≥4.5:1 text, ≥3:1 for the non-text focus edges). No existing assertion weakened.

## Verification (Claude, on `main`, OUTSIDE the sandbox)

- **Scope:** only the two allowed paths (`style.css`, `tests/contrast.test.tsx`). No `App.tsx`,
  `SessionHeader.tsx`, `index.html`, `main.tsx`, protocol/relay/extension, other test, or dependency.
- **Pixel-identity (authoritative, browser-free):** the token resolver over the full stylesheet —
  **231 (scope,theme,token) entries: CHANGED 0, MISSING 0, ADDED 0** across light/dark/system. The
  `--surface-code` re-point resolves to `#24221f` in every theme, confirmed.
- **Contrast additions are real:** each new pair's hex matches the resolved token value (dark
  `--danger #ee9b91` on `--danger-soft #3a2522`; dark `--warning #f0b19a` on `--warning-soft #3a2720`;
  light `--warning #8a452f` on `--warning-soft #f3e4de`; `--focus #f8f8f6` on dark `--surface #2d2a26`
  and dark `--canvas #24221f`) — not invented values.
- **Bootstrap confirmed, not changed:** `index.html` `data-theme="system"`; `App.tsx` drives
  `dataset.theme` + `<meta theme-color>` + `localStorage` + `prefers-color-scheme`; both toggle groups
  set the theme. Read-only confirmation; no file changed.
- **Gates (final state):** `npm run typecheck` **0**; `npm run build` **0**; `npm run test:web`
  **0 — 670 passed / 62 files** (+5 vs the 665 baseline); `npm test` (backend) unaffected — this phase
  touches no backend code; the only failures remain the pre-existing `attachment-normalization.test.ts`
  WASM flake proven identical on the clean HEAD. `git diff --check` clean; ESLint 0.
- **390px structural (CDP):** light, dark, and system all report innerWidth 390 with zero horizontal
  overflow.
- **Comment hygiene:** 0 ephemeral labels; `@ds` comments carry the durable WHY.
- **Security:** styling + test only; read-only posture, redaction, ticketing, plan mode, CSP untouched.

## Route & cost note

Built on the **Cline CLI** (`cline-pass/deepseek-v4-flash`, `--thinking xhigh`), **cost ≈ $0.042**.
Goal-named routes remain hard-exhausted; the cheap Cline route is the recorded deviation, safeguarded
by clean-baseline + full-diff review + browser-free value-identity, consistent with the cost concern.

## Continuation

Grandchild 002 (theming & contrast) is complete. **Next:** `003-primitives-react-aria` — the living
template that applies the full `@ds surface/slot/state/variant/edit/guardrail` grammar to the shared
react-aria controls so every later per-surface grandchild (`004`–`014`) mirrors it, then
`015-catalog-docs-preview` derives the catalog from the grammar.
