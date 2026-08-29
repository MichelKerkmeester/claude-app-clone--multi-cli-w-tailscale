---
title: "Phase 11 implementation summary — refine transcript (COMPLETE)"
description: "The file-preview peek cut its metadata mid-word because it emitted a class whose rule is scoped to a different component, which is the same Svelte scoping trap this file fell into once before. The command output well sliced a row in half because its window was not a whole number of lines. Both are fixed and proven by the rendered pixels, not by the diff."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/011-refine-transcript"
    last_updated_at: "2026-08-29T06:01:34.396Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Fixed the peek ellipsis and the sliced output row."
    next_safe_action: "Operator reviews; the archive and the audit are the evidence."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 11 implementation summary — refine transcript

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|-------|-------|
| **Parent** | `008-uiux-features-mining` |
| **Level** | 2 |
| **Status** | Complete |
| **Scope** | 39 transcript screenshots |
| **Commits** | `50198e2`, `1d8ad32` |
| **Executors** | Grok 4.6 xhigh via Cursor and GPT-5.6 Luna xhigh via Codex, on disjoint files |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

- **The file-preview peek ellipsizes instead of slicing.** It rendered its metadata as one raw text
  blob and cut mid-word — "application/octet-s" — while the sibling artifact card wrapped each line in
  a class carrying `text-overflow: ellipsis`. The peek now wraps its lines the same way AND declares
  the rule locally, which is the part that actually mattered.
- **The command output well shows whole rows.** Its window was `8.5rem` against a `1.45` line-height,
  so the last visible row was cut through its middle while the caption below claimed eight lines. The
  height is now derived from the well's own line-height and padding, giving six complete rows.
- **The transcript's code and diff wells became readable in dark theme**, through the shared
  invariant-ink fix recorded in the artifacts phase; `transcript-list`, the normalized block view and
  the file-preview cards all rendered their text in their own background colour before it.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

The peek fix was landed twice. The first attempt added the per-line markup, matched the sibling
exactly, passed typecheck and the full suite — and changed nothing on screen, because the class it
emitted has no rule in this component. Svelte scoped CSS only reaches the component that declares it.
The screenshot was byte-identical, which is what exposed it; the diff looked correct throughout.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

- **The peek still clips; only the cut changed.** Its own comment states the clipping is intended, so
  the fix gives each line an ellipsis rather than making the well wrap or grow.
- **The output well was not made scrollable.** A nested scroller inside a transcript card is worse
  than a bounded window, and the card already offers Copy and an Open handoff for the full output.
- **A vertical clip under an authored `max-height` is reported separately from an unbounded one.** A
  card showing the first six lines of a file is doing its job; the audit says so rather than counting
  22 deliberate peeks as defects.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

- `node scripts/ui-audit.mjs` — no high or medium finding on any `transcript-*` story in either theme.
  The peek's `CLIP_X` and the output well's `CLIP_Y` are both gone.
- The rendered proof rather than the diff: `file-preview-card--unsupported.png` changed bytes and now
  reads "application/octe…"; the output well measures 139px against an 18.85px line-height, six whole
  rows, with no partial row.
- `npm run typecheck -w @pi-remote/web` — 1250 files, 0 errors (6 warnings, the standing baseline).
- `npm run test:web` — exit 0; 114 files / 782 passed + 3 skipped, and 83 files / 772 passed.
- `npx eslint` on the changed file — clean; the keyless `{#each}` this phase introduced is keyed.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

- **The same scoping trap remains available.** Nothing prevents another component from emitting
  `artifact-card-peek--line` and getting no styling; the rule lives in two scoped copies now. The
  honest home is a shared stylesheet, which is a larger change than this phase owns.
- **A pre-existing keyless `{#each}` remains** in the sibling `card-artifact.svelte`, left alone as
  out of scope.
- **Transcript touch targets** — the turn actions measure 73x32 and 77x32, clearing WCAG 2.5.8 at AA
  but not the 44px the project asserts elsewhere.
- **The live-edge and virtualized-list shots are identical, correctly.** `running` drives the
  streaming dots only while no assistant token block exists yet, which the component states in its
  own comment. The shared fixture already contains token blocks, so the dots are suppressed in both.
  A fixture without tokens would photograph the streaming state; the current one cannot.
<!-- /ANCHOR:limitations -->
