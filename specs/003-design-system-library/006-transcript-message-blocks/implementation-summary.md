<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Implementation Summary — 003 P2 grandchild 005 (transcript & message blocks)

## Final state — COMPLETE

The transcript renderer — `TranscriptList`, `Block` (per-kind), `ActivityGroup`, `CollapsedEvidence`,
`AssistantActions`, `FilePreviewCard`, `RuntimeStatusRegion` — now carries the full `@ds` grammar with
one `@ds state:` block per block kind and per transcript state, and a documented `@ds slot:
rich-content-cards` seam in `Block`. Value- and behaviour-preserving: every block kind and state
renders identically, the list stays virtualized, and measured row heights are unchanged. Built by
**DeepSeek V4 Flash MAX (Cline CLI)**; orchestrated and independently verified by Claude on `main`
outside the sandbox. No token value, virtualization/turn-grouping/normalization/streaming logic, or
dependency changed; `turns.ts` and `state.ts` were confirmed read-only and untouched.

## What shipped

- **`apps/pi-remote-web/src/App.tsx`** (+38 comment lines) — `@ds surface:`/`@ds slot:`/`@ds state:`/
  `@ds guardrail:` annotations across the transcript, fencing virtualization layout,
  `measureElement`/`estimateSize`, normalization + turn-grouping, live-edge/scroll handlers, the
  announce effect, the sr-only announcer, `role="status"`/`aria-live`, and the react-aria wiring.
  **Comments only** — no className, markup, prop, handler, hook, aria-*, role, or state changed.
- **`apps/pi-remote-web/src/style.css`** (+35/−6) — `@ds` labels + **2** value-preserving structural
  changes (no colour/spacing value changed): `padding: A B` → `padding-block: A; padding-inline: B`
  on `.transcript-block > header` (`0.75rem 1rem`) and `.streaming-marker` (`0.5rem 0`). Both map to
  identical top/bottom + left/right longhands (symmetric inline values), so vertical padding — and
  therefore measured row height — is unchanged. No literal→token conversions (the residual literals
  resolve to a token in only some themes, or belong to the out-of-scope artifacts rules).

## Verification (Claude, on `main`, OUTSIDE the sandbox)

- **Scope:** only `App.tsx`, `style.css`. `turns.ts`/`state.ts` untouched (confirmed via `git
  status`); no other file, no dependency.
- **`.tsx` comments-only:** `git diff --numstat` App.tsx = 38/0 — **0 deletions**; no non-comment
  addition. Virtualization/measurement logic byte-identical.
- **Token identity:** token resolver **CHANGED 0, MISSING 0**.
- **Rule identity:** rule-level resolver **CHANGED 0**; the only delta is 6 VANISHED / 12 ADDED, which
  is exactly the 2 `padding` → `padding-block`+`padding-inline` conversions across the three themes —
  proven-equivalent property renames (`0.75rem 1rem` and `0.5rem 0` map to identical longhands), not a
  resolved-value change. Row heights preserved (padding-block = the old vertical value).
- **Gates:** `npm run typecheck` **0**; `npm run build` **0**; `npm run test:web` **0 — 670 passed /
  62 files** (incl. transcript-placement / turns / normalizeTranscriptBlocks — behaviour + heights
  unchanged); backend unaffected (pre-existing WASM flake only). `git diff --check` clean; ESLint 0.
- **Comment hygiene:** clean; `@ds` comments carry the durable WHY (the rich-content seam is named
  without a grandchild number).
- **Security:** annotation + 2 equivalent property swaps only; transcript stays read-only; redaction,
  ticketing, plan mode, CSP untouched.

## Route & cost note

Built on the **Cline CLI** (`cline-pass/deepseek-v4-flash`, `--thinking xhigh`), **cost ≈ $0.126**.
Goal-named routes remain hard-exhausted; recorded deviation, safeguarded by clean-baseline +
comments-only/equivalent-swap diff review + browser-free token/rule resolvers.

## Continuation

Grandchild 005 (transcript & message blocks) is complete. **Next:** `006-composer-input` — the message
composer — continuing the per-surface migrations (`006`–`014`) before the catalog (`015`).
