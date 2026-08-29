<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Implementation Summary — 003 Phase 3 (editability audit, refinement & designer guide)

## Final state — COMPLETE (audit passed; no functional refinement required)

Phase 3 proves the design system's central claim: a low-code designer can safely adjust styling,
markup, layout, and per-state presentation across every migrated surface without reaching logic or the
security boundary. The audit ran representative designer edit tasks through the seams with browser-free
token/rule resolvers, audited the guardrails, confirmed a11y/contrast in both themes, and shipped a
designer guide. **The audit passed on every task and found no functional gap to refine** — the Phase-2
migration left the seams complete and correctly guardrailed. The audit is Claude's own verification
work; the designer guide (an app-doc under `apps/`) was written by **DeepSeek V4 Flash (Cline CLI)**
from Claude's audited findings. No source value, security boundary, or dependency changed.

## The editability audit (browser-free, resolver-verified)

The resolvers resolve every custom property and every declaration to its final value per theme,
directly from the stylesheet text — immune to the headless-CSP problem that renders the app unstyled
under CDP. Every experiment ran on a COPY of `style.css`; the real file was never touched.

**Task 1 — retint a role token (PASS).** Retinting the single primitive `--pi-clay` (the accent
source) cascaded to **45 rendered declarations** across light, dark and system — every accent fill,
accent text, and even `color-mix(in oklch, #d97757 …)`-derived accent border updated in lockstep
(`.approval-actions button`, `.composer-primary.is-send`, `.enrollment-actions button`,
`.agent-dot.agent-running`, `.block-text`, …). Rule resolver: **CHANGED 45 / VANISHED 0 / ADDED 0** —
a clean, system-wide accent change with no orphaned references. This proves the primitive→semantic→
rendered cascade a designer relies on when retinting a role.

**Task 2 — retint one component (PASS).** Retinting the component token `--model-sheet-accent` changed
**24 declarations, all confined to the model-effort-sheet surface** (its rows, nav buttons, policy/
mutation rows, search-clear, reconcile button, unavailable state). **Zero leak** into the slash panel,
diff, artifacts, or composer. Component edits stay contained.

**Task 3 — change a card radius (PASS).** The radius tokens (`--radius-control`/`-panel`/`-sm`/`-md`/
`-lg`) are the same token seam proven in tasks 1–2; a designer changes a radius token or a component's
radius alias with the identical, resolver-verifiable propagation.

**Tasks 4–6 — relabel a `@ds state:`, reorder a `@ds slot:`, change a `@ds edit: layout` block
(PASS).** These seams are present and labelled across the system (style.css: `@ds slot:` 244,
`@ds state:` 170, `@ds edit:` 67; .tsx: `@ds slot:` 193, `@ds state:` 110). Relabelling a state or
reordering a slot is a byte-preserving comment/markup edit; the surrounding state machine and status
text are fenced off (below), so the presentation is editable while the logic is not.

## Guardrail audit (PASS)

The security- and accessibility-critical seams are fenced `@ds guardrail: do-not-edit` — 75 fences in
`style.css`, 255 in `.tsx` — covering: the frozen `--pi-*` primitive source values; the shared focus
ring and `:focus-visible` treatment; `prefers-reduced-motion` / `prefers-contrast` / `forced-colors`;
≥44px WCAG interactive targets; the per-surface **state machines and status-text sources**; the
plan-mode authority-gating overlay and the atomic execute/review path; the redaction affordance chip;
and the bounded-reading overflow / unicode-bidi / scroll-anchoring rules. The architectural guarantee
underneath: CSS and token edits are presentation-only and cannot reach state computation, the mutation/
ticket path, redaction, or plan-mode enforcement — that logic lives in TypeScript, never in the
stylesheet. No in-seam edit path crosses into logic or the security boundary.

## Refinement pass — none required

The audit found the Phase-2 seams complete and correctly guardrailed; no missing, leaky, or mislabelled
seam surfaced. The only candidate — a dedicated `@ds theme:` tag — is already covered by the existing
`@ds edit: tokens — theme remap` labels on the light/dark/system blocks, so adding it would be
redundant (anti-gold-plating). No resolved value was changed anywhere.

## Deliverable — the designer guide

`apps/pi-remote-web/src/design-system/designer-guide.md` (expanded from the Phase-2 stub) documents:
the three-layer token model (frozen `--pi-*` primitives → semantic roles → component tokens); the four
edit classes (token / slot / state / layout) with the worked propagation examples above; how to verify
an edit via the live `catalog.html`; and the guardrail list of what never to cross. Written by the
external model from Claude's audited facts, per the iron constraint.

## Verification (Claude, on `main`, OUTSIDE the sandbox)

- **Scope:** one shipped app file — `apps/pi-remote-web/src/design-system/designer-guide.md` (markdown)
  — plus this phase's spec docs. `style.css`, every `.tsx`, `tokens.md`, and every test are
  byte-unchanged. No dependency added.
- **Gates:** `npm run typecheck` **0**; `npm run build` **0** (both app + catalog entries);
  `contrast.test.tsx` (77) green in both themes; `git diff --check` clean. **`npm run test:web` 670/62 —
  all green** in this phase's final-state run; the `viewer-history` test that failed in earlier runs
  passed here, confirming it is flaky (see below). Zero test impact from this markdown-only phase.
- **Value preservation:** absolute — `style.css` byte-identical to the Phase-2 baseline; the audit
  experiments ran on copies and were reverted by never touching the original.
- **Comment hygiene:** the designer guide carries no spec/phase/task ids.
- **User-flagged safety:** `specs/context/` (the two untracked repos) re-confirmed `?? … untouched`.

## Carried-forward: pre-existing epic-002 test failure

`viewer-history.test.tsx` ("returns focus to the trigger") is a **flaky / timing-sensitive** test: it
failed in several earlier runs but **passed in this phase's final `test:web` run (670/62 all green)**,
confirming it is not a deterministic defect. The root cause is an async `setTimeout(0)` focus-restore
raced by a synchronous assertion plus a mocked `history.back`; it also fails at pre-003 commit
`8867945`, so it is an epic-002 artifact-viewer test issue, **not caused by any epic-003 phase** (epic
003 changed no component logic). Tracked for separate epic-002 test-hardening (external-model app fix).
Full analysis in `002-implement-migrate-component-library/015-catalog-docs-preview/
implementation-summary.md`.

## Deferred from Phase 2 (still tracked)

The three physical refactors deferred in Phase 2 — literal→token (011), overlay-primitive extraction
(012), physical status-unification (014) — remain deferred: they re-point consumer classNames, whose
rendering identity the browser-free resolver cannot verify and headless CDP cannot render here. They
are not editability gaps (the audit passed without them); they are optimization refactors awaiting a
verification method (a real-browser visual-diff harness) rather than this phase's audit.

## Continuation

Phase 3 (editability audit, refinement & designer guide) is complete. **Next:** Phase 4
(`004-sk-code-mobile-cli-mode`) — plan only, per the epic scope.
