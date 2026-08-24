# Iteration 004 — Lens: Material 3 token tiers + on- color roles + token-level contrast

**Pass goal:** borrow the mechanism by which contrast is guaranteed *at the token layer*.

## Findings

- M3 organizes tokens into strongly-typed **core → reference → system** tiers (documented model,
  [C3a]); authored and themable values live upstream of what components consume. The live pages are
  client-rendered (fetched as "requires JavaScript"), so this tier list is carried from the authored
  model.
- The **color-role** scheme is the key accessibility idea: roles like `primary` / `on-primary`,
  `surface` / `on-surface`, and containers make the **ink that sits on a surface a sibling role** —
  contrast is a property of the role pairing (`on-` ink on its named surface), not of an isolated
  color.
- `material-color-utilities` supplies the tooling: `hct` (CAM16×L\*), `contrast` (measure / obtain
  contrastful colours), `scheme` with `SchemeLight`/`SchemeDark`, and `dynamiccolor` that adjusts
  per dark theme and contrast requirements ([C3b]).

## Synthesis for Pi Remote

- Transpose `core→reference→system` onto **primitive→semantic→component** (Decision 3): frozen raw
  values = core/primitive; themed roles = reference/semantic; per-surface aliases = system/component.
- Transpose the **`on-` pairing** onto the app's existing role pairs — `ink` on `surface`,
  `accent-ink` on `accent-soft`, `action-fg` on `action-bg`, `ink-inverse` on `surface-code`.
  These are already chosen to be AA; making them an enumerated `a11yPair` lets the token layer
  *prove* AA rather than hope per-rule.
- Enforce via a **static contrast manifest** (M3's `contrast` module does the math) resolved once
  per theme over every `@ds catalog a11yPair` — a single gate that a designer edit cannot slip.

## Rejected alternative

Per-rule WCAG auditing (scan finished CSS rules). Rejected: works *after* a change, misses the
designer edit path, and cannot assert the invariant at the source. Token-layer manifest is
stronger and cheaper to run (grade-child `002`).

## Confirmed by
- [C3a] <https://m3.material.io/foundations/design-tokens/overview>, <https://m3.material.io/styles/color>
  (JS-rendered; carried as authored model).
- [C3b] <https://raw.githubusercontent.com/material-foundation/material-color-utilities/main/README.md>
  (fetched): `hct`, `contrast`, `scheme`/Session, `dynamiccolor`, `TonalPalette`.