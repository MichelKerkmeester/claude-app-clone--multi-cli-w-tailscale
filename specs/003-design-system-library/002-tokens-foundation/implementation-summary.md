# Implementation Summary — 003 P2 grandchild 001 (token library foundation)

## Final state — COMPLETE

The single `style.css` now carries an explicit **primitive → semantic → component** token library,
labelled with the `@ds` inline-comment grammar, with the frozen ink-on-parchment palette as the
primitive source. It is a pure value-preserving refactor: every rendered pixel is unchanged. Built by
**DeepSeek V4 Flash MAX (Cline CLI)**; orchestrated and independently verified by Claude on `main`
outside the sandbox. No token value, security boundary, logic, or dependency changed.

## What shipped (web token layer only)

- **`apps/pi-remote-web/src/style.css`** (token blocks only) — three labelled layers in each of the
  three theme selectors (`:root`, `:root[data-theme='dark']`, and the
  `@media (prefers-color-scheme: dark) :root[data-theme='system']` block):
  - **Primitive** — a `--pi-*` block fenced `@ds guardrail: do-not-edit — frozen source`, holding the
    raw palette verbatim (light `--pi-bone/raised/carbon/muted/clay/accent-txt/accent-ui/selection`;
    each theme block re-declares the same names with that theme's frozen values).
  - **Semantic** — the role tokens the app reads, fenced `@ds edit: tokens — semantic roles`,
    re-pointed to `var(--pi-…)` where a core primitive resolves byte-identical. Secondary shades with
    no named primitive (`--canvas-subtle`, `--surface-muted`, `--line*`, `--control-border`,
    success/warning/danger, focus, shadow, spacing/radius/duration/ease/layout) stay literal at the
    semantic layer — a deliberate foundation scope; later grandchildren may extend primitive coverage.
  - **Component** — `--model-sheet-*` and `--slash-*` fenced with `@ds surface: … / @ds edit: tokens /
    @ds end surface: …`. Kept literal (not re-pointed): re-pointing the dark ui-accent onto
    `--accent-strong` (the research example) would change the pixel (`#f0b19a` vs `#b85f42`), so the
    literals were preserved and only fenced + documented — pixel-identity over tidiness.
- **`apps/pi-remote-web/src/design-system/tokens.md`** (new) — the token reference: every token, its
  layer, its resolved light/dark value, and what a designer changes by editing it.
- **`scripts/design-system-cdp.mjs`** (new) — a 390px CDP structural runner (boots the demo web app,
  asserts exactly 390 CSS px with zero horizontal overflow per theme). Imports only node builtins +
  the existing `ws` — no new dependency.

## Verification (Claude, on `main`, OUTSIDE the sandbox)

- **Scope (objective):** `git status` shows only the three allowed paths — `style.css` (modified),
  `design-system/tokens.md` (new), `scripts/design-system-cdp.mjs` (new). No `.tsx`/`.ts`, no
  `main.tsx`/`index.html`, no protocol/relay/extension/test file, no dependency, no token value.
- **Pixel-identity (authoritative, browser-free):** an independent resolver computed every custom
  property's final value per theme scope (`:root` + every component selector) directly from the
  stylesheet text — **207 pre-existing (scope,theme,token) entries: CHANGED 0, MISSING 0**, across
  light + dark + system; 24 additive entries, **all `--pi-*`** and equal to the frozen palette. The
  resolver covers spacing/radius/motion tokens too, so layout is provably unchanged. (The headless
  CDP screenshot path renders the app **unstyled** — its CSP blocks Vite's inline-style injection
  under CDP — so a screenshot diff is not a valid proof here; the token-value resolver is.)
- **Frozen values verbatim:** all light (`#f8f8f6 #ffffff #24221f #6c6a65 #d97757 #8a452f #b85f42
  #f3e4de`) and dark (`#24221f #2d2a26 #f8f8f6 #9f998f #d97757 #f0b19a #3a2720`) values present
  verbatim on `--pi-*`; the primitive guardrail marker is in all three blocks.
- **Gates (final state, outside sandbox):** `npm run typecheck` **0**; `npm run build` **0**;
  `npm run test:web` **0 — 665 passed / 62 files** (identical to the pre-migration baseline);
  `npm test` (backend) **377 / 379** — the 2 failures are `attachment-normalization.test.ts` (WASM
  image-decode) which fail **identically on the clean committed HEAD `4e47998`** with all changes
  stashed (negative control), a pre-existing environmental flake in code this phase never touched.
  `git diff --check` clean; ESLint on changed files 0 errors.
- **390px structural (CDP):** light, dark, and system all report innerWidth 390 with
  `scrollWidth == clientWidth` (zero horizontal overflow).
- **Comment hygiene:** 0 ephemeral spec/grandchild/task/CHK labels in any code comment; the `@ds`
  comments carry the durable WHY.
- **Security:** styling-only — read-only posture, redaction, ticketing, plan mode, and CSP all
  untouched; no mutation path; no dependency added.

## Route & cost note

Built on the **Cline CLI** (`cline-pass/deepseek-v4-flash`, `--thinking xhigh`), **cost ≈ $0.076**.
The goal-named routes remain hard-exhausted (cli-codex Luna usage-limit, opencode-go DeepSeek weekly
cap, OpenRouter out of credits); this cheap route is the deviation, taken with clean-baseline +
full-diff-review + browser-free value-identity safeguards, consistent with the cost concern.

## Continuation

Grandchild 001 (token foundation) is complete. **Next:** `002-theming-light-dark` hardens the
tri-state theming as a semantic-layer-only remap and adds the `on-` pairing invariant + a static
contrast manifest gate, per the Phase-1 migration contract. The `--pi-*` primitive layer and the
`@ds` grammar established here are the base every later grandchild (`003`–`015`) builds on.
