---
title: "Phase 12 implementation summary — refine views (COMPLETE)"
description: "The archived picture of a healthy home screen was an error state, because the story never answered the push-config call. The home hero had been rendering without its base rule since a malformed comment deleted it. And the approval screen's primary action — the most consequential control in the app — was white text on clay at 3.12:1."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/012-refine-views"
    last_updated_at: "2026-08-29T07:30:43.148Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Fixed the home error state, the hero rule and the approve button contrast."
    next_safe_action: "Operator reviews; the archive and the audit are the evidence."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 12 implementation summary — refine views

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|-------|-------|
| **Parent** | `008-uiux-features-mining` |
| **Level** | 2 |
| **Status** | Complete |
| **Scope** | 41 views screenshots |
| **Commits** | `1d8ad32` |
| **Executors** | Grok 4.6 xhigh via Cursor and GPT-5.6 Luna xhigh via Codex, on disjoint files |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

- **The approval screen's primary action became legible.** "Approve once" was white on the clay fill
  at 3.12:1 at 12.48px. The codebase already forbids this — `--on-accent-text` exists and its own
  comment records 5.08:1 on clay — so the literal `white` was a contract violation rather than a
  missing decision. The inbox's inline decision button had the same pairing.
- **Its hover survived the fix.** Dark ink on `--accent-strong` is only 3.59:1, so the first repair
  simply removed the hover change and left resting and hover identical. The hover now lightens the
  clay instead, reaching 6.99:1 against 5.08:1 at rest — distinct, and both passing.
- **The default Home stories stopped showing a host error.** Home embeds push settings, which POSTs to
  the relay; the story never answered it, so the archive's picture of a healthy home screen read
  "Relay returned HTTP 404." The healthy states now answer the call and the explicit Error story keeps
  its behaviour.
- **The home hero got its base rule back.** `screen-home.svelte` documents that the `.hero h1` group
  stays global, and a malformed comment in `app.css` had swallowed it, leaving the headline rendering
  without its weight, tracking and measure. Restored, it now matches the review hero's identical
  declaration set.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

The approve-button defect was invisible to the audit for most of this work, and the reason is worth
recording: the approval cards are time-gated, and the audit ran on the wall clock while the capture
pins one. On the wall clock the fixtures had expired, the cards never rendered, and the audit reported
the page clean because it was measuring a screen with nothing on it. Pinning the same instant the
capture uses surfaced the defect immediately.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

- **The error story was kept, not replaced.** Only the states meant to look healthy stopped erroring;
  the failure surface still has its own recorded picture.
- **A full-screen shot stays a tall strip.** A view captures its whole scroll height rather than one
  screenful, which is complete but is not what a person sees on a phone. Clamping would hide exactly
  the below-fold content these phases exist to review.
- **The decorative orbit that bleeds past the hero is not a clip.** Everything overflowing the hero is
  absolutely positioned, so the audit treats it as a designed bleed rather than content out of reach.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

- `node scripts/ui-audit.mjs` — no high or medium finding on any `views-*` story in either theme.
  Contrast findings for `views-review` go from 8 to 0.
- A scan of all 334 stories for a failure surface rendered as a healthy default returns zero; before
  the fix it returned the three Home stories.
- Measured: approve resting 5.08:1 and hover 6.99:1, deny 6.35:1 and hover 7.21:1, disabled 4.66:1,
  in both themes.
- `npm run typecheck -w @pi-remote/web` — 1250 files, 0 errors (6 warnings, the standing baseline).
- `npm run test:web` — exit 0; 114 files / 782 passed + 3 skipped, and 83 files / 772 passed.
- The restored hero was checked against the review hero's rule, which carries the identical
  declaration set at `screen-review.svelte:240`.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

- **The hover ratios are arithmetic, not browser-measured.** The executor's sandbox refused a local
  socket bind, so the hover and disabled states were computed from the resolved colours rather than
  read from a rendered page. The resting states were measured in a browser.
- **The home hero's restore changes how the headline looks.** It is heavier and tighter than the
  archive previously showed, because the archive was showing the defect. This is a visible change to
  the app's most prominent text and deserves an operator's eye rather than a green check.
- **Views touch targets** — the theme options measure 38x36 and the composer input 38px tall, clearing
  WCAG 2.5.8 at AA but not the 44px the project asserts elsewhere.
<!-- /ANCHOR:limitations -->
