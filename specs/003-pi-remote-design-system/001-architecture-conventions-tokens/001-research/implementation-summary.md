# Implementation Summary — 003 Phase 1 (Architecture, Conventions & Token Library research)

## Final state — COMPLETE

Phase 1 of epic 003 is a research-first phase; its deliverable is one build-ready decision that
governs the whole Phase-2 migration of ~55 components. That decision is written and verified:
[`../research/research.md`](../research/research.md) is the canonical authority. It formalizes the
existing app into a designer-editable coded design system across three areas — component
architecture, the designer-editability `@ds` inline-comment grammar, and a
primitive→semantic→component token library — and it changes no palette value and weakens no
security boundary. Synthesized by **DeepSeek V4 Flash MAX via the Cline CLI**; orchestrated,
fact-checked, and finalized by Claude on `main` outside any sandbox.

## What was produced (research artifacts only — no app code)

- **`../research/research.md`** (≈440 lines, replaces the 43-line placeholder) — three decisions,
  each with choice / evidence / rejected alternative / concrete Phase-2 implication, plus a
  Security & contrast implications section, five external citations + repo evidence, and a closing
  **Phase-2 migration contract** the 15 grandchildren follow in order.
  - **Decision 1 — Component architecture.** Codify the app as it stands: one `src/style.css` +
    Tailwind-4 `@theme`, surface-grouped file layout (no `components/` dir — the ~55 semantic
    components are the API), react-aria owning behaviour. States = `data-*` attribute selectors,
    variants = class suffixes, slots = named part classes. Rejected: pre-styled library (Radix
    Themes), runtime variant props / CVA, utility-in-JSX. Canonical `.tsx` + `style.css` skeleton given.
  - **Decision 2 — Designer-editability model.** Token-first CSS + a nine-token `@ds` grammar
    (`surface/end/slot/state/variant/edit/guardrail/theme/catalog`) across `style.css` and labelled
    `.tsx` seams. A designer edits styling, layout, per-state presentation, and markup between
    seams; logic, react-aria wiring, a11y invariants, and the security boundary are
    `@ds guardrail`-fenced and unreachable. The catalog is derived from the grammar.
  - **Decision 3 — Token-library architecture.** Three layers in the single stylesheet: primitive
    (`--pi-*`, value-identical frozen palette), semantic/role (existing `:root` roles re-pointed at
    primitives, remapped per theme), component (thin per-surface aliases resolving to semantic —
    collapsing the light/dark/system triple duplication). WCAG AA guaranteed at the token layer by
    an `on-` ink/surface pairing invariant + a static contrast manifest (AA text ≥4.5:1, UI ≥3:1),
    not per-rule.
- **`../research/iterations/iteration-001..006.md`** — six single-lens cited passes (Untitled UI
  React; shadcn/ui; Radix Themes; Material 3; Polaris; the app's own code).
- **`../research/PROVENANCE.md`** — updated to the honest run record.

## Verification (Claude, on `main`, OUTSIDE any sandbox)

- **Scope (objective):** `git status` shows only files under `.../001-architecture-conventions-tokens/`
  changed — `research/research.md` + `research/PROVENANCE.md` modified, six `research/iterations/`
  files added, plus the finalization spec docs. **Zero** app code, token, protocol, relay, or
  extension changes; nothing outside the phase folder.
- **Fact-check of the load-bearing citations (confirmed against the real file):**
  `apps/pi-remote-web/src/style.css` is **6,989 lines** (the doc corrected the brief's stale
  ~5,100 estimate to the real count); `--model-sheet-*` block at **4076**; `--slash-*` block at
  **6343**; `:root[data-theme='dark']` at **94**; system `@media (prefers-color-scheme: dark)` at
  **132**. The frozen hex values in the doc (bone `#f8f8f6`, carbon `#24221f`, muted `#6c6a65`,
  clay `#d97757`, accent-text `#8a452f`, accent-ui `#b85f42`, selection `#f3e4de`) match the source.
- **Frozen contracts intact:** the decision explicitly changes no source value and weakens no
  security boundary; the single contrast-adjacent implication (the `--ink-disabled` /
  `--ink-muted` / `--placeholder` token pooling) is **flagged and deferred** to the Phase-2
  `002-theming-light-dark` grandchild, satisfying the "flag security/contrast-crossing implications
  for Phase 2" acceptance criterion.
- **Honesty of provenance:** `PROVENANCE.md` records that this was an agent-invoked synthesis pass,
  not the 20-pass `/deep:research` state machine, and that deep-loop runtime telemetry
  (`deep-research-state.jsonl`, dashboards, receipts) is intentionally **not fabricated**.
- **Gate:** `validate.sh --strict` on both this child and the parent (recursive) → **exit 0**.
- **No build/test gates apply** — this phase writes only markdown research docs; it touches no code,
  so the code gates run at each Phase-2 grandchild instead (per the migration contract).

## Route & cost note

Per the operator directive ("use DeepSeek V4 Flash MAX for deep research, CLI with the Cline
provider"), the synthesis ran on the **Cline CLI** (`cline-pass/deepseek-v4-flash`, `--thinking
xhigh`), 42 iterations, **total cost ≈ $0.129** — the deliberately cheap route after the earlier
OpenRouter spend. `opencode`'s `cline-pass` provider remained 401 (separate credential store), so
the Cline CLI was used directly; this is the same DeepSeek V4 Flash MAX model the directive named.

## Continuation

Phase 1 is complete. **Next:** Phase 2 — `002-implement-migrate-component-library` (15 ordered
grandchildren) consumes `research/research.md` and follows its Phase-2 migration contract: baseline
CDP first, primitives foundation (`001`) → theming + contrast manifest (`002`) → shared-control
template (`003`) → per-surface migrations (`004`–`014`) → catalog (`015`), each proving pixel-identical
light + dark at 390px and never weakening the security posture.
