# Spec 003 — Implementation phases

The designer-editable coded design system is delivered in four phases. Phase 1 decides the
architecture, the designer-editability model, and the token library (research-first). Phase 2
implements that decision and migrates every component group onto it. Phase 3 audits and
refines that a low-code designer can actually edit the system safely. Phase 4 plans a
dedicated `sk-code` mode so future Mobile-CLI app work auto-loads these conventions.

Every leaf is independently shippable and verifiable. Every migration gate includes the
repository typecheck, unit tests, web tests, build, and true-390px CDP captures in both
themes. The two frozen contracts — the ink-on-parchment source values and the read-only
security posture — travel in every phase and are never weakened.

## Phase 1 — Architecture, conventions, and the token library (research-first)

### Objective

Produce the single build-ready decision that governs Phase 2: the component architecture and
file/setup conventions, the designer-editability model (exactly how styling, markup, layout,
and per-state presentation are exposed for low-code editing), and the dedicated token-library
architecture (primitive → semantic → component layers, theming, the frozen palette as source).

### Kind and structure

Research-first phase parent. Its first sub-phase is `001-research/` (a lean spec-kit phase
that records the research phase in the packet graph); the research artifacts live in
`001-architecture-conventions-tokens/research/`. The phase requires **20 deep-research
iterations**. This packet **scaffolds** that research only — a `BRIEF.md`, a `research.md`
placeholder for the synthesized decision, a `deep-research-config.json` manifest, a
`PROVENANCE.md`, and an `iterations/` scaffold expecting ~20 passes. The **research models
are TBD** (the operator defines the roster later) and the **20 iterations are not run** here.

### What the research must decide

- The component architecture: how a component is authored, its file layout, and how a
  component's variants, states, and slots are declared.
- The designer-editability model: token-first CSS; a documented inline-comment grammar that
  labels each editable region and each per-state block; variant/slot conventions; explicit
  "edit here" seams; and guardrails so a designer edit cannot reach logic or the security
  boundary. Cite the Untitled UI React library and comparable designer-editable systems
  (e.g. shadcn/ui, Radix Themes, Material 3, Polaris token tiers) as reference direction to
  investigate — not as a decision.
- The token-library architecture: the primitive token layer (raw palette, the frozen values
  as source), the semantic layer (role tokens like surface/ink/accent that themes remap), and
  the component layer (per-component tokens like the existing `--model-sheet-*` / `--slash-*`
  sets), plus how light/dark theming and WCAG AA contrast are guaranteed at the token level.

### Verification gate (this packet)

Scaffold-only. The gate for Phase 1 in this packet is that the research structure exists and
is internally linked, `research/research.md` is present as a labelled placeholder that states
the decision is pending, and the `001-research/` phase validates. Running the 20 iterations
and writing the synthesized decision is later operator work, not part of this scaffolding.

## Phase 2 — Implement the architecture, migrate every component group, stand up the library

### Objective

Take Phase 1's synthesized decision and (a) implement the architecture and the token library,
(b) migrate every component group onto tokens plus the inline-comment conventions and update
its states, and (c) wire everything into a live catalog. Prefer more, smaller grandchildren
over fewer large ones.

### Grandchildren (build order)

Foundation first, then per-surface, then states/motion, then catalog/docs last:

| Grandchild | Purpose |
|---|---|
| `001-tokens-foundation` | Stand up the primitive → semantic → component token library; formalize the frozen palette as the source of truth |
| `002-theming-light-dark` | Formalize the light/dark theming mechanism and bake WCAG AA contrast into the token layer |
| `003-primitives-react-aria` | Migrate the shared control primitives (Button/Toggle/Disclosure/Field/status/glyphs) onto the system |
| `004-app-shell-header-nav` | Migrate the app shell, headers, home/review/inbox surfaces, and session layout |
| `005-transcript-message-blocks` | Migrate the transcript list and per-kind message blocks, streaming and live-edge states |
| `006-composer-input` | Migrate the composer input tray and its viewport-anchored keyboard behavior |
| `007-model-effort-sheet` | Migrate the model picker + effort/reasoning sheet content onto the system |
| `008-slash-command-autocomplete` | Migrate the slash-command autocomplete and palette surfaces |
| `009-plan-mode-controls` | Migrate the plan-mode controls, cards, review/leave sheets, and announcers |
| `010-rich-content-cards` | Absorb the rich-content command/output, code, and text-artifact cards into the system |
| `011-artifacts-viewer-previews` | Migrate the artifacts viewer shell and Text/Code/Diff/Markdown/Image/Pdf previews |
| `012-overlays-sheets-modals` | Formalize the shared overlay/sheet/modal primitive and its choreography |
| `013-question-todos-surfaces` | Migrate the plan/todo checklist surface and scaffold the ask-question/todos surfaces |
| `014-states-interaction-motion` | Unify the shared status vocabulary, motion tokens, focus, and reduced-motion behavior |
| `015-catalog-docs-preview` | Stand up the live preview/catalog surface and the designer documentation |

Each grandchild is a leaf with `spec.md` + `plan.md` + `tasks.md` + `checklist.md` and its
own verification gate. Each migrates its surface onto the Phase-1 architecture, tokens, and
inline-comment conventions; updates its per-state presentation; and registers itself in the
catalog stood up by `015`.

### Verification gate (each grandchild)

```text
npm run typecheck
npm test
npm run test:web
npm run build
node scripts/design-system-cdp.mjs --surface <surface> --viewport-width 390 --theme light --output <temporary-directory>/<surface>-light.png
node scripts/design-system-cdp.mjs --surface <surface> --viewport-width 390 --theme dark --output <temporary-directory>/<surface>-dark.png
```

A grandchild passes only when all suites and the build pass, the migrated surface renders
identically to its pre-migration baseline at true 390 CSS pixels in both themes with zero
page horizontal overflow, the frozen source values are unchanged, and no security boundary
is touched.

## Phase 3 — Refine and audit for designer-editability

### Objective

Prove that a designer with low-level code knowledge can actually and safely adjust styling,
markup, layout, and per-state presentation across the migrated surface — and refine the
ergonomics where they cannot.

### Scope

An editability audit against representative designer edit tasks (retint a role token, change
a card's radius, relabel a state block, reorder a slot), a guardrail audit (a designer edit
cannot reach logic or the security boundary), a repeat a11y/contrast pass over the token
layer, and a designer guide. Produces editability evidence and the guide; changes source
values or security posture in neither.

### Verification gate

Typecheck, unit tests, web tests, and build stay green; the editability evidence documents
each representative edit task with a before/after and confirms the guardrails held; the
contrast checks pass in both themes.

## Phase 4 — Dedicated `sk-code` mode for Mobile-CLI app work (plan-only)

### Objective

Plan — do not build — a new mode/packet under the `sk-code` parent hub, purely for
Mobile-CLI app work, so future code work on this app auto-loads the design-system and
designer-editability conventions.

### Scope

Read `.opencode/skills/sk-code/SKILL.md` (its §2 Smart Routing and how existing surface modes
are structured) and design: the mode identity (`graph-metadata.json`), its registration in
`mode-registry.json`, its surface-detection markers (how the router recognizes Mobile-CLI app
work), its verification commands, and how it encodes the token library, the inline-comment
grammar, and the editability guardrails. The plan describes the mode; no skill files are
authored in this packet.

### Verification gate

Plan-only. The gate is that the plan names the real `sk-code` hub conventions
(mode-registry, graph-metadata identity, surface markers, verification commands), maps each
convention to a concrete section of the future mode, and states explicitly that building the
mode is out of scope for this packet.
