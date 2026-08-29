<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Implementation Summary — 003 P2 grandchild 011 (artifacts viewer & previews)

## Final state — COMPLETE (with one deferred sub-task, documented below)

The artifacts viewer family — `ArtifactViewerProvider`, `ArtifactViewerHost`, `ArtifactCard`,
`ArtifactHeader`, `ArtifactStatus`, `PreviewControls`, and the Text/Code/Diff/Markdown/Image/Pdf/
Unsupported previews (13 components) — now carries the full `@ds` grammar, in both the `.tsx` and the
style.css rules, with one `@ds state:` block per viewer/dismissal/preview state and the full
`ArtifactResourceStatus` vocabulary, and every security seam fenced `@ds guardrail: do-not-edit`.
Value- and security-preserving: every state renders and behaves identically, and the digest-verify,
no-fetch-on-open, sanitized-image, controlled PDF.js worker, exact-tuple read, and policy-gated Share
are byte-identical. Built by **DeepSeek V4 Flash MAX (Cline CLI)**; orchestrated and independently
verified by Claude on `main` outside the sandbox.

## Deferred sub-task — the literal→token migration (honest disclosure)

Spec 011's acceptance criterion "no raw source value is hard-coded in its rules" is **partially met and
otherwise deferred.** The first migration attempt tried to rewrite the artifacts' ~27 raw palette
literals to semantic tokens. Many artifact rules are **theme-invariant fixed literals** — the
syntax-highlight palette (`.artifact-code-token.is-keyword { color:#f0b19a }`, the same in every theme)
and the always-on reading surfaces — and mapping them to **theme-varying** semantic tokens like
`var(--accent-ink)` regressed **18 dark/system resolved values**. The rule resolver caught this
(CHANGED 18) and the attempt was **rejected** — shipping it would have weakened the frozen design
contract (dark-mode colour changes).

Rather than ship a regression or hand-tune a fragile mapping, this phase delivers the full `@ds`
annotation (the primary editability deliverable) with **every value preserved**, and defers the
literal→token rewrite to a value-preserving-by-construction `--artifact-*` component-token set (define
each token to its exact current per-theme value, then point the rules at it — impossible to regress).
That work is a tracked follow-up, best folded into **P3 (the editability audit)**. Flagged for operator
visibility.

## What shipped

- **Thirteen artifacts `.tsx` files** — `@ds surface:`/`@ds slot:`/`@ds state:`/`@ds guardrail:`
  annotations fencing the resource hook, sanitized-image decode, PDF.js worker, exact-tuple read, and
  policy-gated Share. **Comments only, 0 deletions**; a non-comment security scan returned empty.
- **`apps/pi-remote-web/src/style.css`** (+309/0) — `@ds surface:`/`@ds slot:`/`@ds edit:`/`@ds state:`
  labels across the artifact/preview rules and the full `ArtifactResourceStatus` vocabulary, plus
  `@ds edit: tokens` on the existing `--diff-*` component tokens. **Comments only** — no declaration,
  value, selector, or token changed.

## Verification (Claude, on `main`, OUTSIDE the sandbox)

- **Scope:** 14 files — the 13 `.tsx` + `style.css`; **no test file touched**; `tokens.md` unchanged.
- **`.tsx` security-preserving:** all 13 comments-only (0 deletions); a scan for `fetch`/`import`/
  `digest`/`sanitiz`/`pdfjs`/`worker`/`writeText`/`onPress`/`useState`/`createObjectURL` on non-comment
  lines returned **empty** — no resource, sanitizer, PDF-worker, or share line changed.
- **Token identity:** token resolver **CHANGED 0, MISSING 0**.
- **Rule identity:** rule-level resolver **CHANGED 0 / VANISHED 0 / ADDED 0** — every one of 8,571
  theme-expanded declarations byte-identical across light / dark / system. (This is the check that
  rejected the first attempt's 18-value regression; the shipped annotation-only pass is clean.)
- **Gates:** `npm run typecheck` **0**; `npm run build` **0**; `npm run test:web` **0 — 670 passed /
  62 files** (incl. the artifact/image/PDF/preview suites, unmodified); `git diff --check` clean;
  backend unaffected (pre-existing WASM flake only).
- **Comment hygiene:** clean; `@ds` comments carry the durable WHY.
- **User-flagged safety:** `specs/context/` (the two untracked repos) re-confirmed `?? … untouched`
  across the revert and both dispatches.

## Route & cost note

Built on the **Cline CLI** (`cline-pass/deepseek-v4-flash`, `--thinking xhigh`): a first full pass (73
iterations) whose style.css literal→token migration was rejected for an 18-value dark/system
regression; the 13 clean `.tsx` annotations were kept, style.css + tokens.md were reverted to baseline,
and a focused annotation-only corrective (39 iterations) landed clean. Goal-named routes remain
hard-exhausted; safeguarded by clean-baseline + comments-only diff review + browser-free token/rule
resolvers + a security-diff read.

## Continuation

Grandchild 011 (artifacts viewer & previews) is complete (with the literal→token sub-task deferred to
P3). **Next:** `012-overlays-sheets-modals` — the shared overlay/sheet/modal primitive that 007/009/
010/011 all consume.
