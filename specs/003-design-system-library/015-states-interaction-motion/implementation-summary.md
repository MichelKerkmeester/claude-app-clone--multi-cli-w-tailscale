<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Implementation Summary — 003 P2 grandchild 014 (state vocabulary, interaction & motion)

## Final state — COMPLETE (with physical status-unification deferred)

The cross-cutting state / motion / interaction primitives are now formalized in the `@ds` grammar: a
documented `@ds surface: status` vocabulary over the app's scattered status enums, the motion tokens
labelled as the design-system motion scale (`@ds edit: tokens`), and the `:focus-visible` /
reduced-motion / contrast / forced-colors behaviours documented and fenced as accessibility-guaranteed
primitives. Value-preserving: no status text, transition timing, or a11y guarantee changes. Built by
**DeepSeek V4 Flash MAX (Cline CLI)**; orchestrated and independently verified by Claude on `main`
outside the sandbox.

## What shipped

- **`apps/pi-remote-web/src/style.css`** (+42/0) — comments only:
  - `@ds edit: tokens — motion scale` on the `--duration-fast` (120ms) / `--duration-state` (220ms) /
    `--ease-out` / `--ease-out-interface` block, documenting each role and its reader surfaces; no ms
    or bezier changed.
  - `@ds surface: status` marking the shared status/badge families (idle · loading · stalled · ready ·
    empty · offline · stale · denied · expired · missing · error) across the connection status-pill,
    the runtime/mode glyphs, the artifact resource-status, the slash-panel states, and the file-preview
    availability — a documented convention over the existing rules.
  - `@ds surface: focus-ring` on the shared AA focus ring, and `@ds guardrail: do-not-edit` on the
    reduced-motion zeroing, the high-contrast re-render, the forced-colors yield, and the focus ring —
    each named an accessibility guarantee a designer may retune but never remove.
  - `@ds guardrail: do-not-edit` marking the per-surface state machines and status-text sources.

## Scope decision — documented convention now, physical unification deferred

The spec suggested mapping per-surface badge classNames onto one shared vocabulary class. Like the
overlay-primitive extraction (012), that is a structural refactor whose rendering-identity the
browser-free token/rule resolver cannot verify (it changes which selectors apply to which elements)
and headless CDP renders unstyled here. Per verify-first, the physical unification is **deferred**; the
vocabulary ships as the fully-verifiable documented `@ds` convention. Value-preserving; every surface
byte-identical.

## Verification (Claude, on `main`, OUTSIDE the sandbox)

- **Scope:** 1 file — `style.css`; **no `.tsx`, no test, no tokens.md, no dependency.**
- **Comments-only:** 42/0 (0 deletions); a scan for non-comment additions returned only `@ds` comment
  continuations — no declaration, timing, selector, or token change.
- **Token identity:** token resolver **CHANGED 0, MISSING 0** (no timing/easing changed).
- **Rule identity:** rule-level resolver **CHANGED 0 / VANISHED 0 / ADDED 0** across light/dark/system.
- **Gates:** `npm run typecheck` **0**; `npm run build` **0**; `npm run test:web` **0 — 670 passed /
  62 files** (incl. the reduced-motion / contrast / focus / status suites, unmodified); `git diff
  --check` clean; backend unaffected (pre-existing WASM flake only).
- **Comment hygiene:** clean; `@ds` comments carry the durable WHY.
- **User-flagged safety:** `specs/context/` (the two untracked repos) re-confirmed `?? … untouched`.

## Route & cost note

Built on the **Cline CLI** (`cline-pass/deepseek-v4-flash`, `--thinking xhigh`). A first attempt died
mid-read on a transient provider outage (the inference gateway gave up after 4 retries, zero files
written); re-dispatched from the same clean baseline `c364be1` and landed in 27 iterations.
Goal-named routes remain hard-exhausted; safeguarded by clean-baseline + comments-only diff review +
browser-free token/rule resolvers.

## Continuation

Grandchild 014 (state vocabulary, interaction & motion) is complete (physical status-unification
deferred). **Next:** `015-catalog-docs-preview` — the final P2 surface: the standalone design-system
catalog/docs page.
