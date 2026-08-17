# Spec 003 — Build strategy: the designer-editable coded design system

> How the design system is built and, above all, how it is authored so a **designer with
> low-level code knowledge** can safely edit it. The **what** lives in each phase's docs;
> this file is the **how**: the designer-editability model, the inline-comment grammar, the
> token-library architecture, the delegation rule, and the per-phase verification gates.
> Companion docs: [`implementation-phases.md`](implementation-phases.md) (the four phases),
> [`spec.md`](spec.md) (root purpose), [`README.md`](README.md) (orientation).

---

## 1. Goal

Every page and component of `apps/pi-remote-web/` sits on one coded design system that a
non-engineer can adjust. "Adjust" means: retint or resize through tokens, relabel or reorder
a component's markup and slots, change layout, and change how a specific **state** looks — all
guided by clear inline comments and a token-driven architecture, and none of it able to reach
application logic or the security boundary.

- **Definition of done (packet):** every component group is migrated onto the token library
  and the inline-comment conventions; the live catalog renders every component in every state
  in both themes; a designer guide plus editability evidence prove a low-code designer can
  make each representative edit safely; the frozen source values and security posture are
  unchanged.
- **Definition of done (per leaf):** `npm run typecheck`, `npm test`, `npm run test:web`, and
  `npm run build` exit 0; the leaf's `checklist.md` items are checked with evidence; the
  migrated surface matches its pre-migration baseline at true-390px light + dark; and the
  designer seams for that surface exist and are documented.

## 2. The designer-editability model

The model is what makes this system "one step further" than a conventional coded library. It
rests on four layers a designer edits and one layer they do not.

### 2.1 Layers a designer edits

1. **Tokens (the safest edit).** Colour, type, spacing, radius, motion, and per-component
   look are all `var(--token)` reads. A designer retints the whole system, or one component,
   by changing a token value — never by hunting through rules.
2. **Markup / slots.** Each component exposes named, comment-labelled slots (header, body,
   actions, status). A designer can reorder, relabel, or hide a slot within the seams without
   touching the component's behaviour.
3. **Layout.** Layout is expressed with logical properties and tokenized spacing inside
   comment-fenced layout blocks, so a designer can change stacking, gaps, and alignment in one
   labelled place.
4. **Per-state presentation.** Every visual state (default, hover, pressed, disabled, loading,
   streaming, error, empty, selected) has its own comment-labelled block. A designer changes
   how a state looks without knowing how the state is computed.

### 2.2 The layer a designer does not touch

**Logic and security.** State computation, the mutation/ticket path, redaction, plan-mode
enforcement, and transport live in `.ts`/`.tsx` logic behind the seams and carry a
`do-not-edit` guardrail comment. A designer edit that stays inside the token, slot, layout,
and state seams cannot change what a control *does* — only how it *looks*.

## 3. The inline-comment grammar

Phase 1 finalizes the grammar; Phase 2 applies it. The working proposal Phase 1 investigates
and Phase 2 must not fall below:

```css
/* @ds surface: model-effort-sheet — the bottom sheet that picks model + effort */
/* @ds edit: tokens — retint by changing these; do not add new colours here */
/* @ds edit: layout — safe to change stacking, gaps, alignment */
/* @ds slot: header | body | actions | status */
/* @ds state: default */
/* @ds state: pressed */
/* @ds state: disabled */
/* @ds state: loading */
/* @ds guardrail: do-not-edit — this block wires behaviour/security; change looks via tokens above */
```

- **`@ds surface:`** names the component and its one-line purpose — the designer's anchor.
- **`@ds edit:`** marks a region a designer may change and says what is safe to change.
- **`@ds slot:`** enumerates the component's named markup slots.
- **`@ds state:`** opens a per-state presentation block; one block per visual state.
- **`@ds guardrail: do-not-edit`** fences logic/security so a designer knows to stop.

The grammar is greppable (a catalog can enumerate every `@ds surface:` and every `@ds state:`),
lintable (a check can assert every migrated component declares a surface, its slots, and its
states, and that no token colour is hard-coded outside the primitive layer), and human-first
(a designer reads it without knowing CSS internals).

## 4. The token-library architecture

Three layers, each a designer touches differently, with the frozen palette as the source.

1. **Primitive tokens** — the raw ink-on-parchment palette and raw scales, the frozen source
   values verbatim (bone `#f8f8f6`, raised `#ffffff`, carbon `#24221f`, muted `#6c6a65`, clay
   `#d97757`, AA text accent `#8a452f`, AA UI accent `#b85f42`, soft selection `#f3e4de`; dark
   page `#24221f`, raised `#2d2a26`, text `#f8f8f6`, muted `#9f998f`, accent text `#f0b19a`,
   soft selection `#3a2720`). Primitives are the one place raw values live; a designer rarely
   edits these.
2. **Semantic tokens** — role tokens the app reads (`--surface`, `--surface-raised`, `--ink`,
   `--ink-muted`, `--accent`, `--accent-strong`, `--accent-ink`, `--accent-soft`, `--line`,
   `--danger`, `--success`, `--focus`, spacing/radius/motion roles). Themes remap semantic
   tokens onto primitives; the existing `:root`, `:root[data-theme='dark']`, and
   `@media (prefers-color-scheme: dark) :root[data-theme='system']` blocks are the theming
   mechanism. Contrast (WCAG AA) is guaranteed by the semantic→primitive mapping, not per-rule.
3. **Component tokens** — per-component tokens (the existing `--model-sheet-*` and `--slash-*`
   sets generalized to every component). A designer retints one component here without
   affecting the rest.

The migration keeps the existing single `src/style.css` authorship model (one greppable,
comment-labelled stylesheet) and Tailwind 4's in-CSS `@theme` wiring; it does not introduce a
`tailwind.config`, CSS modules, or a runtime CSS-in-JS layer. react-aria continues to own
behaviour and state; the system styles react-aria's state attributes and the `@ds state:`
blocks in one place.

## 5. Delegation and ownership

Consistent with the sibling `002` packet: **the orchestrator plans and verifies; external
models may implement; the orchestrator never hand-writes application code and never weakens a
frozen contract.** Every dispatch carries the frozen source values, the security posture, an
explicit `ALLOWED WRITE PATHS` list from the leaf's `plan.md`, and `BANNED OPERATIONS`
(no source-value changes, no security-boundary edits, no new dependencies unless the leaf
requires them, no deletes outside scope). Isolated worktree per leaf or per phase; baseline
commit before dispatch; verify outside any sandbox.

## 6. Per-phase verification gates

- **Phase 1 (research, scaffold-only here):** the research structure exists and links
  internally; `research.md` is a labelled placeholder; the `001-research/` phase validates.
  The 20 iterations and the synthesized decision are later operator work (models TBD).
- **Phase 2 (each migration leaf):** `npm run typecheck` · `npm test` · `npm run test:web` ·
  `npm run build`, plus a true-390px light + dark `design-system-cdp.mjs` capture of the
  migrated surface with zero page horizontal overflow and no source-value change. The surface
  must declare its `@ds surface:`, slots, and per-state blocks, and register in the catalog.
- **Phase 3 (audit):** the four checks stay green; editability evidence documents each
  representative designer edit with a before/after and confirms guardrails held; contrast
  passes in both themes.
- **Phase 4 (plan-only):** the plan maps every real `sk-code` hub convention (mode-registry,
  graph-metadata identity, surface markers, verification commands) to a concrete mode section
  and states that building the mode is out of scope for this packet.

## 7. Scope of this document

This file defines the editability model, the grammar, the token architecture, and the process.
It does not change the frozen source values, the security posture, the stack, or any phase's
acceptance criteria — those remain owned by `spec.md`, `implementation-phases.md`, and the
per-phase docs.
