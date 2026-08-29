---
title: "Phase 8 implementation summary — screenshot archive integrity (COMPLETE)"
description: "Three components that rendered wrong in the live app are fixed: the file-preview card had no styling because the rules it named are scoped to a different component, artifact details had no rule at all, and the session status disc painted white on white because currentColor resolved against its own colour. Story repairs, a corrected fixture, and two determinism defects in the capture itself are also closed, leaving four consecutive runs byte-identical including the manifest."
trigger_phrases:
  - "screenshot archive integrity implementation summary"
  - "screenshot archive integrity phase"
  - "implementation summary"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/008-uiux-features-mining/008-screenshot-archive-integrity"
    last_updated_at: "2026-08-29T09:00:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Fixed three live-app render defects and two capture determinism defects."
    next_safe_action: "Operator picks phase 009; the archive is now trustworthy evidence."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 8 implementation summary — screenshot archive integrity

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|-------|-------|
| **Parent** | `008-uiux-features-mining` |
| **Level** | 2 |
| **Status** | Complete |
| **Scope** | Archive-wide; 334 stories, 308 shots |
| **Commits** | `d0879ba` |
| **Executors** | Grok 4.6 xhigh via Cursor and GPT-5.6 Luna xhigh via Codex, on disjoint files |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

- **The file-preview card got the styling it never had.** `card-file-preview.svelte` rendered
  `class="artifact-card"` with no `<style>` of its own, while those rules live as SCOPED css on
  `card-artifact.svelte`. Svelte scoping means a scoped rule only reaches the component that declares it,
  so the card rendered as one run-on string in the live transcript, not only in Storybook. It now carries an
  ancestor-scoped `:global(.artifact-card)` rule and renders as icon, eyebrow, title, action and metadata rows.
- **Artifact details got a rule at all.** `artifact-details.svelte` rendered `.artifact-details` and no such
  rule existed anywhere in the tree. It is now a labelled two-column panel.
- **The session status disc became visible.** `session-state-icon.svelte` set
  `background: currentColor; color: var(--surface)` on the same element. `currentColor` resolves to that
  element's OWN computed colour, which the second declaration sets to the surface, so the disc was
  surface-on-surface everywhere it rendered. The glyph colour moved to a nested span so the disc inherits the
  status colour the parent already supplies.
- **Four story classes stopped lying.** The ask-question card left its loading skeleton, the status icon
  gained a wrapper matching its real consumers, three surfaces stopped showing a relay error as their default
  while keeping an explicit error story each, and the headless button gained a consumer story.
- **The capture became honestly deterministic.** Two defects in the harness itself were closed: a sandboxed
  frame could be shot before it painted, and the manifest sorted only on image path so entries without an
  image tied and reordered between runs.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Two executors on disjoint files, then verification by a fresh adversarial reviewer that never saw their
reasoning. Every fix was checked against a REAL CONSUMER rather than an isolated story: the status disc was
diagnosed by reading computed styles inside a rendered session card, which is what proved it was a live-app
defect rather than an isolation artefact. The reviewer independently compiled both components to confirm the
`:global()` rule cannot leak onto the sibling that shares the class.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

- **Views keep the content crop rather than a clamped device frame.** A screen now captures its full scroll
  height instead of one screenful. Clamping would hide exactly the below-fold content the refinement phases
  exist to review, and the width still reflects the real layout. The cost is that a tall screen reads as a
  strip rather than as a phone, which is accepted deliberately.
- **The shared card rules were not promoted to `app.css`.** Completing that move would also mean deleting the
  scoped copy on `card-artifact.svelte`, which was owned by another lane; copying the block instead would have
  left two copies. An ancestor-scoped rule keeps the fix local and provably non-leaking.
- **Ten identical placeholder states are recorded, not faked apart.** The image placeholder draws one generic
  well whatever its state; the differentiating copy lives on a sibling component. Making the stories differ
  would have misrepresented the component.
- **A blank frame is still never written.** Twenty-six stories render nothing a sighted person can see; they
  stay recorded in the manifest without an image rather than emitting a picture that reads as "this is how it
  looks".
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

- `npm run typecheck -w @pi-remote/web` — 1248 files, 0 errors (6 warnings, the standing baseline).
- `npm run test:web` — 114 files / 782 passed + 3 skipped, and 83 files / 772 passed, from the final state.
- `node scripts/token-identity.mjs verify app-mobile/src/app.css` — `PASS: all 35 tokens.md goldens`.
- `node scripts/story-coverage.mjs` — PASS.
- `npm run story:shots` run four consecutive times: byte-identical PNGs AND a byte-identical `MANIFEST.json`,
  each reporting 0 unstable and 0 failed.
- Measured proof per fix: the status disc went from 0.0% to 17.1% ink; the file-preview card from a run-on
  string to 394x214 at 83% opaque; artifact details to 394x335 at 87% opaque.
- `artifact-card--default`, the sibling sharing the patched class, is byte-identical to `HEAD`.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

- **Determinism was claimed once before it was true.** The first check hashed only the PNGs, so a manifest
  that reordered between runs passed unnoticed until an adversarial review measured it. The check now covers
  the manifest as well; the lesson is that a determinism claim must cover every generated artefact, not the
  ones that are convenient to hash.
- **Two capture defects were found only under load.** A sandboxed frame shot before painting, and a
  confirming frame taken back-to-back with the first could agree on the same unpainted state. Both are fixed
  with a paint barrier and a spaced confirm, but neither reproduced in isolation — only under concurrent
  workers, which is how they escaped earlier.
- **The file-preview fix duplicates layout intent rather than sharing it.** The honest home for those rules
  is `app.css` with the scoped copy on `card-artifact.svelte` removed. That is a two-component change and was
  out of this phase's scope; until it happens, two components describe similar card layout separately.
- **Full-screen shots are tall.** A screen can capture as a 382x2009 strip, which is complete but is not what
  a person sees on a phone.
<!-- /ANCHOR:limitations -->
