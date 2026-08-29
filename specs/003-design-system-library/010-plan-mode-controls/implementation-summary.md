<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Implementation Summary — 003 P2 grandchild 009 (plan-mode controls)

## Final state — COMPLETE

The plan-mode control cluster — `PlanModeButton`, `PlanModeMenu`, `PlanReadyCard`, `PlanReviewSheet`,
`LeavePlanSheet`, `RuntimeStrip`, `RuntimeModeAnnouncer` — now carries the full `@ds` grammar with one
`@ds state:` block per `ModePresentationKind` and per gating state, and every authority / lease /
protocol / mutation seam fenced `@ds guardrail: do-not-edit`. This is the app's most security-sensitive
surface; the migration is value- and security-preserving: every mode presentation and gating state
renders and behaves identically, and the host/extension-enforced plan-mode authority, execution lease,
`set_mode`/`execute_plan` protocol, planToken redaction, and mutation boundary are byte-identical.
Built by **DeepSeek V4 Flash MAX (Cline CLI)**; orchestrated and independently verified by Claude on
`main` outside the sandbox.

## What shipped

- **Seven plan-mode `.tsx` files** — `LeavePlanSheet.tsx` (+19/0), `PlanModeButton.tsx` (+18/0),
  `PlanModeMenu.tsx` (+11/−1), `PlanReadyCard.tsx` (+13/0), `PlanReviewSheet.tsx` (+24/0),
  `RuntimeModeAnnouncer.tsx` (+10/0), `RuntimeStrip.tsx` (+6/0) — `@ds surface:`/`@ds slot:`/`@ds
  state:`/`@ds guardrail:` annotations fencing the runtime state machine, mode authority, execution
  lease, the mutation call, planToken handling, and the react-aria + live-region wiring. **Comments
  only.** The single deletion is `PlanModeMenu`'s `<Popover className="plan-mode-popover">` line, which
  is byte-identical apart from an appended inline `{/* @ds slot: */}` comment. `RuntimeStrip`'s
  pre-existing `@ds` lines were preserved verbatim (purely additive).
- **`apps/pi-remote-web/src/style.css`** (+92/−3) — `@ds surface:`/`@ds slot:`/`@ds edit:`/`@ds state:`
  labels across the plan-mode rules, plus **2 value-preserving physical→logical conversions** on
  `.leave-plan-sheet`: `width: 100%`→`inline-size: 100%` and `border-radius: 1.25rem 1.25rem 0 0`→ the
  four logical corners (`border-start-start`/`start-end`=1.25rem, `end-end`/`end-start`=0). No colour,
  spacing, or size value changed; the scrim literal `rgb(0 0 0 / 35%)` was left as-is (no
  byte-identical token exists). No component-token set was warranted.

## Verification (Claude, on `main`, OUTSIDE the sandbox)

- **Scope:** 8 files — the 7 planned `.tsx` + `style.css`; **no test file touched**; no dependency;
  `tokens.md` unchanged (no new component tokens).
- **`.tsx` security-preserving:** a targeted diff scan for `set_mode`/`execute_plan`/`planToken`/
  `lease`/`ticket`/`consume`/`revision`/`on*`/`use*`/`mutat`/`authority` on non-comment lines returned
  **empty** — no authority, lease, protocol, mutation-boundary, or react-aria wiring line changed. The
  only non-comment `.tsx` line in the diff is the byte-identical `<Popover>` comment-append.
- **Token identity:** token resolver **CHANGED 0, MISSING 0**.
- **Rule identity:** rule-level resolver **CHANGED 0**. The only delta is **6 VANISHED / 15 ADDED**,
  which is exactly the 2 `.leave-plan-sheet` physical→logical conversions across the three themes
  (`border-radius`→4 corners = 12 added, `width`→`inline-size` = 3 added) — proven-equivalent property
  renames, not a resolved-value change. (`max-width: 30ch`→`max-inline-size: 30ch` on a separate rule
  normalizes to the same key, value-identical.)
- **Authority unchanged (positive proof):** the plan-mode / lease / a11y tests were **not modified**
  and stay green in `test:web`, proving the host/extension-enforced authority and mutation boundary
  are untouched by the restyle.
- **Gates:** `npm run typecheck` **0**; `npm run build` **0**; `npm run test:web` **0 — 670 passed /
  62 files**; `git diff --check` clean; backend unaffected (pre-existing WASM flake only).
- **Comment hygiene:** clean; `@ds` comments carry the durable WHY.
- **User-flagged safety:** `specs/context/` (the two untracked repos `nodeterm-main`,
  `remote-for-opencode-master`) was re-confirmed `?? … untouched` before and after the commit.

## Route & cost note

Built on the **Cline CLI** (`cline-pass/deepseek-v4-flash`, `--thinking xhigh`), 53 iterations.
Goal-named routes remain hard-exhausted; recorded deviation, safeguarded by clean-baseline +
comments-only/equivalent-swap diff review + browser-free token/rule resolvers + a security-diff read.

## Continuation

Grandchild 009 (plan-mode controls) is complete. **Next:** `010-rich-content-cards` — continuing the
per-surface migrations (`010`–`014`) before the catalog (`015`).
