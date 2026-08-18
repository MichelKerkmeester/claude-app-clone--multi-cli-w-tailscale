# Designer guide — editing the Pi Remote design system

A practical guide for the low-code designer who edits this design system. It explains the three-layer
token model, the four kinds of editable seam (token, slot, state, layout), the worked edit examples
that are proven to behave in production, and the lines a designer must never cross. Read it with the
token reference in `tokens.md` (full token list) and the live catalog in `catalog.html` (visual
index of every surface) open beside you.

---

## 1. The three-layer token model

Every colour in the system travels through exactly three layers, in this order:

| Layer | Tokens | What it is | A designer may edit it |
| ----- | ------ | ---------- | ---------------------- |
| **Primitive (source)** | `--pi-*` | The 8 frozen source values, re-declared per theme | No — frozen contract |
| **Semantic role** | `--canvas`, `--ink`, `--accent`, … | Names a role, reads a primitive | Yes — retint a role here |
| **Component** | `--model-sheet-*`, `--slash-*`, `--diff-*` | Per-surface alias that reads a role | Yes — retint one surface |

### Layer 1 — primitives are frozen

The primitives are `--pi-bone`, `--pi-raised`, `--pi-carbon`, `--pi-muted`, `--pi-clay`,
`--pi-accent-txt`, `--pi-accent-ui`, `--pi-selection`. Each theme re-declares the same name with its
own frozen value:

```css
:root {                               /* light                /* dark */
  --pi-bone: #f8f8f6;                 /* page      #24221f    */
  --pi-raised: #ffffff;               /* raised    #2d2a26    */
  --pi-carbon: #24221f;               /* text      #f8f8f6    */
  --pi-muted: #6c6a65;                /* muted     #9f998f    */
  --pi-clay: #d97757;                 /* clay      #d97757    */
  --pi-accent-txt: #8a452f;           /* accent-txt #f0b19a   */
  --pi-accent-ui: #b85f42;            /* (ui, fixed both themes) */
  --pi-selection: #f3e4de;            /* selection #3a2720    */
}
```

These blocks are fenced in the source with `@ds guardrail: do-not-edit — frozen source`. Changing a
value here is the single lever that retints the whole app in lockstep, but it is off-limits to a
designer: it is the palette contract every other layer reads from.

### Layer 2 — semantic roles are where you retint a role

A role token names a job and reads a primitive, so it follows that primitive in both themes:

```css
--canvas: var(--pi-bone);
--ink: var(--pi-carbon);
--accent: var(--pi-clay);
--accent-ink: var(--pi-accent-txt);
--accent-strong: var(--pi-accent-ui);
--accent-soft: var(--pi-selection);
```

This is the layer to change when you want every surface that plays a role to update together.

### Layer 3 — component tokens are where you retint one surface

A component token is a thin per-surface alias to a role:

```css
--model-sheet-accent: var(--accent-ink);
--model-sheet-raised: var(--surface);
```

This is the layer to change when you want one surface retinted and nothing else. Every component
token resolves through the chain **primitive → semantic → component**, so it stays in sync with
global retints unless you override it here.

---

## 2. The four edit classes

### 1 · Token edits — retint a role or a surface

- **Seam:** the `@ds edit: tokens` rows in `tokens.md` and the matching blocks in the stylesheet.
- **Retint a role:** change a semantic `--…` row (`--canvas`, `--ink`, `--accent`, …) on `:root`.
- **Retint one surface:** change a component `--model-sheet-*` / `--slash-*` / `--diff-*` row in that
  surface's block.
- **Verify:** reload the catalog and the app; confirm the change shows up on the expected surfaces in
  both light and dark.
- **Stop:** never touch a `--pi-*` primitive value, and never add a brand-new role unless a component
  needs it.

### 2 · Slot edits — reorder or relabel a named region

- **Seam:** a named region marked `@ds slot:` inside a component's template.
- **What a slot is:** a typed markup region — a named chunk of a surface. It is safe to reorder slot
  regions or relabel them within the template.
- **Verify:** the catalog renders the surface in every state; confirm the region appears where you
  moved it and the rest of the surface still reads correctly.
- **Stop:** the surrounding logic is off-limits. Reorder the regions, not the behaviour that fills
  them.

### 3 · State edits — restyle a state's presentation only

- **Seam:** each surface's discrete appearances are marked `@ds state:` — idle · loading · stalled ·
  ready · empty · offline · stale · denied · expired · missing · error, and so on.
- **What you may do:** restyle a state's **presentation** — its colour, spacing, typography, layout.
- **Verify:** exercise that state in the catalog (every state is rendered in light and dark) and in
  the app.
- **Stop:** do not change the state **machine** and do not change the status **text**. Both are fenced
  `@ds guardrail: do-not-edit`. The machine decides *when* a state appears; the text is content a user
  reads. Neither is a styling concern.

### 4 · Layout edits — adjust spacing, grid, flow

- **Seam:** blocks marked `@ds edit: layout`.
- **What you may do:** adjust spacing, grid, and flow within those blocks.
- **Verify:** the surface stays aligned and legible in both themes at the sizes the catalog shows.
- **Stop:** anything outside a `@ds edit: layout` block — and never touch the >=44 px target-size rule
  below.

---

## 3. Worked examples — proven edit propagation

These two edits are the ones to trust: they are measured, not guessed, and they show you the two ends
of the seam.

### One primitive, system-wide lockstep

Retinting the single primitive `--pi-clay` cascades to **45 rendered declarations** across light,
dark and the system block. Every accent fill, accent text, and even `color-mix()`-derived accent
borders update in lockstep — the action-button background, the composer primary send state, the
enrollment action button backgrounds and borders, the running agent-dot colour, and the block-text
border colour derived via `color-mix()`. One edit, the whole system follows, and no orphaned
reference is left behind.

Measure it in the catalog: change `--pi-clay`, reload, and every accent surface moves together.

### One component token, contained to one surface

Retinting the component token `--model-sheet-accent` changes only the model-effort-sheet surface: its
rows, nav buttons, policy and mutation rows, search-clear, reconcile button, and unavailable state.
There is **zero leak** into the slash panel, the diff view, artifacts, or the composer.

Measure it in the catalog: change `--model-sheet-accent`, reload, and only the model-effort-sheet
surface moves. Component edits stay contained by construction.

---

## 4. What you must never cross — the guardrails

All of the following are fenced `@ds guardrail: do-not-edit` in the source. Each matters for a
specific, load-bearing reason:

| Guardrail (fenced in source) | Why it matters |
| ---------------------------- | -------------- |
| The frozen `--pi-*` primitive source values | The whole palette contract; every other layer resolves through them |
| The shared focus ring and `:focus-visible` treatment | WCAG focus visibility — keyboard users must always see where they are |
| `prefers-reduced-motion` / `prefers-contrast` / `forced-colors` blocks | Accessibility guarantees — they adapt the UI to user system settings |
| >=44 px interactive target sizes | WCAG target size — small hit areas are hard to use |
| Per-surface state machines and status-text sources | That is logic and content, not presentation |
| The plan-mode authority-gating overlay and the atomic execute/review path | Security enforcement — who may act, and the act is atomic |
| The redaction affordance chip | Presence of the chip signals that text is being redacted — a security signal |
| Bounded-reading overflow / unicode-bidi / scroll-anchoring rules | Safe reading of untrusted text — these rules keep hostile payloads contained |

### Why the token / slot / layout seams are safe

CSS and token edits are **presentation-only**. They change what a surface looks like but cannot reach
state computation, the mutation/ticket path, redaction, or plan-mode enforcement — all of that lives
in TypeScript logic, never in the stylesheet. That is precisely why a visual designer can edit tokens,
slots, state presentation, and layout with confidence: you are changing paint, not behaviour. The
moment an edit stops being paint — a state machine, status text, security or redaction code — it is
fenced as a do-not-edit guardrail.

---

## 5. How to verify an edit

Run the same loop every time, no matter which edit class:

1. **Open the live catalog** (`catalog.html`, built as its own entry). It renders every surface in
   every state in light and dark over deterministic offline fixtures — no mutation, host action, or
   network call.
2. **Make the edit** — token, slot, state presentation, or layout.
3. **Reload the catalog** — the change should appear *everywhere it should* and *nowhere it should
   not*. Use the two worked examples above as your expectation: a primitive is system-wide, a
   component token is surface-contained.
4. **Reload the app** — the same change should hold in the real running product.
5. **Check both themes** — keep light and dark both legible. The contrast suite enforces WCAG AA, so
   if a retint drops contrast below AA in one theme, the gate flags it.

The catalog is read-only design tooling; if an edit "works" in the app but looks wrong in the
catalog, the catalog is the more faithful rendering of every surface and state — trust it, then fix
the edit.

---

## 6. References

- **`tokens.md`** (this same folder) — the full token catalogue: every primitive, semantic role, and
  component token, what it resolves to, in light and dark, and which rows are safe to edit.
- **`catalog.html`** (this same folder) — the live visual index; every migrated surface in every
  declared state, in light and dark.