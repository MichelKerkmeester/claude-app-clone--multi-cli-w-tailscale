# Implementation Summary — 003 P2 grandchild 003 (control primitives / react-aria)

## Final state — COMPLETE

The shared control primitives — Button, ToggleButton(Group), Disclosure, StatusPill, Freshness,
EmptyState, SessionStateIcon, the inline glyphs, plus the runtime strip and effort/build-plan toggles
— now carry the full `@ds` grammar (`surface` / `slot` / `state` / `guardrail`), with a canonical
shared focus-visible ring and press state that every later surface reuses. react-aria keeps ownership
of behaviour, focus order, and a11y; only the presentational seams were labelled. Built by
**DeepSeek V4 Flash MAX (Cline CLI)**; orchestrated and independently verified by Claude on `main`
outside the sandbox. Value-preserving AND behaviour-preserving: **the diff is comment annotations
only — 0 deleted lines, 0 non-comment additions.**

## What shipped

- **`apps/pi-remote-web/src/style.css`** (+64 comment lines) — `@ds surface: <name>` on each shared
  control, a canonical `@ds state: focus-visible` and `@ds state: pressed` labelled once and shared,
  and per-surface `@ds state:` labels (hover / selected / disabled / expanded) on the existing
  attribute selectors. The model audited every in-scope control rule and found they **already read
  semantic tokens** — so there were **zero** literal→token conversions to make (no rule value or
  selector changed).
- **`apps/pi-remote-web/src/App.tsx`** (+23 comment lines) and **`RuntimeStrip.tsx`** (+6 comment
  lines) — `@ds surface:` / `@ds slot:` annotations on every shared control and `@ds guardrail:`
  fences on every react-aria wiring seam (Button press+aria-label, ToggleButton/Group
  isSelected/onChange/aria, Disclosure expansion/aria, Copy/Share handlers, `role`, `aria-hidden`).
  **No className, markup, prop, handler, hook, aria-*, role, or state changed.**

## Verification (Claude, on `main`, OUTSIDE the sandbox)

- **Scope:** only `style.css`, `App.tsx`, `RuntimeStrip.tsx` — all allowed. No other file, no
  dependency.
- **Comments-only diff (the strongest proof):** `git diff --numstat` = **23/0, 6/0, 64/0**
  (added/deleted) — **0 deletions**; a scan for added lines that are not comments returns **empty**.
  Comments strip at build, so the compiled CSS, JS logic, and rendered DOM are byte-identical.
- **Token identity:** the token resolver — 231 (scope,theme,token) entries, **CHANGED 0, MISSING 0**.
- **Rule identity (new proof):** a rule-level resolver over the full stylesheet (5,352 resolved
  declarations) — **CHANGED 0, VANISHED 0, ADDED 0**; every selector's every declaration resolves
  byte-identical in light/dark/system.
- **Behaviour/a11y:** `npm run test:web` **0 — 670 passed / 62 files** (unchanged), including the
  accessibility, disclosure-persistence, and App interaction tests — react-aria behaviour and a11y
  proven unchanged.
- **Gates:** `npm run typecheck` **0**; `npm run build` **0**; `git diff --check` clean; ESLint on
  changed files 0 errors. Backend unaffected — this phase touches no backend code; the only failures
  remain the pre-existing `attachment-normalization.test.ts` WASM flake.
- **Comment hygiene:** 0 ephemeral labels; `@ds` comments carry the durable WHY.
- **Security:** annotation-only; read-only posture, redaction, ticketing, plan mode, CSP untouched.

## Route & cost note

Built on the **Cline CLI** (`cline-pass/deepseek-v4-flash`, `--thinking xhigh`), **cost ≈ $0.239**
(higher than 001/002 due to deep reconnaissance across the large `App.tsx`; still the cheap route).
Goal-named routes remain hard-exhausted; recorded deviation, safeguarded by clean-baseline +
comments-only diff review + browser-free value/rule resolvers.

## Continuation

Grandchild 003 (control primitives) is complete; the canonical per-state seam set is the template
every per-surface grandchild reuses. **Next:** `004-app-shell-header-nav` begins the per-surface
migrations (`004`–`014`), each annotating its `.tsx` + `style.css` with the `@ds` grammar and staying
value/behaviour-preserving, before `015-catalog-docs-preview` derives the catalog from the grammar.
