---
title: "Phase F implementation summary — BEM CSS rename"
description: "The app-mobile CSS classes renamed to a block--element BEM form — 402 of 499, with the is-* state family kept single-dash — proven behaviour-preserving by token-identity 0-diff across 65 tokens × 3 themes, zero class-context orphans, an over-rename scan at 0, and a before/after screenshot diff (514/534 frame-pairs pixel-identical) that surfaced and closed 4 dynamic-class regressions; test:web 734 pass, fences 277."
contextType: "implementation"
importance_tier: "normal"
trigger_phrases:
  - "bem css implementation summary"
  - "bem css packet"
  - "implementation summary"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/020-source-structure/006-bem-css"
    last_updated_at: "2026-08-25T07:46:27.261Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "402 renamed; 4 dynamic-class regressions fixed; token-identity 0-diff, test:web green."
    next_safe_action: "None — the source-structure group is complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase F implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `020-source-structure` |
| Level | 2 |
| Status | Complete |
| Requirements shipped | REQ-001 … REQ-005 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

The app-mobile CSS classes were renamed to a dash-delimited BEM form — a block keeps its name, an element
or modifier of it is `block--part`. `402` of `499` classes were renamed; the `97` kept are blocks,
singletons, and the `25`-class `is-*` state family. A handful of words were unified for literalness
(glyph→icon, kicker→eyebrow, grabber→handle, chip→pill). Every rendered value, rule, markup structure and
behaviour is identical — only the class names changed — and the class-selector consumers in `scripts/`
were updated in lockstep so the CDP tooling still finds the app by class.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

One injective old→new map drove a mechanical token-boundary pass over every app-mobile file; the dynamic
class-construction sites were then fixed per-site. The completeness scans (zero class-context orphans, an
over-rename scan at `0`) and the token-identity value oracle (`0` diffs, `65` tokens × 3 themes) all
passed — but none of them can see a dynamic class that renders against a rule that no longer exists. The
before/after screenshot diff did: it built Storybook from a detached-HEAD pre-BEM worktree and from the
working tree, rendered every story in both themes, and pixel-diffed each pair, using an after-vs-after
control and a computed-style tree-diff to separate a real change from render nondeterminism. It caught
four broken bindings, each fixed and re-diffed clean, ending at `514/534` frame-pairs pixel-identical.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Keep the `is-*` state family single-dash.** The map's has-children heuristic kept `is-plan`/`is-executing`
(prefixes of `is-plan-mode`) but renamed `is-applying`→`is--applying`, so the dynamic `is--${kind}` markup
rendered `is--plan` against CSS `.is-plan` and the plan-mode button lost its tint. `is-` is a
state-modifier prefix, not a BEM block; forcing it into `is--part` is non-idiomatic and was inconsistent.
The whole family was reverted to its original single-dash form — consistent and lockstep-correct.

**Fix underscore/compound kinds the map never saw.** `block-file_diff` and `attention-needs_input` (kinds
with `_`) were absent from the extracted map, so their selectors stayed single-dash against `block--file_diff`
/ `attention--needs_input` markup — the file-diff card regained a stray outer border. A map-entry audit
cannot catch a class that is not in the map; the fix was to scan the tree for residual single-dash
`.fam-<kind>` selectors of every dynamic family and rename the two survivors.

**Leave ids, keys and custom properties alone.** `slash-option-${}` (a DOM id) and `--diff-add` (a custom
property) share a class's string; the executor over-renamed both. They are data, not classes — reverted,
and caught by `test:web` and token-identity respectively.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Name-map injectivity | `499` classes, `402` renamed, 97 kept, `0` collisions |
| Class-context orphans | `0` (31 raw hits all import paths / component filenames) |
| Over-rename scan | `0` `--` tokens outside the map's values |
| Token identity (app.css) | 0 CHANGED / 0 VANISHED / 0 ADDED across light, dark, system (`65` tokens) |
| Before/after screenshot diff | `514/534` frame-pairs pixel-identical; 4 regressions caught + fixed; 4 residuals proven noise |
| `test:web` | 68 files / 545 passed + 3 skipped, and 17 files / 189 passed |
| Guardrail fences | `scan-comments.mjs` `277`, unchanged |
| `validate.sh --strict` | exit `0` via realpath |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

The screenshot diff renders Storybook stories; `16` interaction-gated stories (sheets, dialogs) never mount
headless in either build, so their internals are not pixel-covered — token identity, the DOM tree-diff and
`test:web` are the backstops. Dynamic class construction remains the one hazard a static rename cannot fully
prove: the diff is the gate that closes it, and any future kind added to a dynamic family must land its
matching `block--kind` rule. This is the last child under `020-source-structure`.
<!-- /ANCHOR:limitations -->
