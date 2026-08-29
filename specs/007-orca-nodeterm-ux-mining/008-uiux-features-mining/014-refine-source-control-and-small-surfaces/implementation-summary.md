---
title: "Phase 14 implementation summary — refine source control and small surfaces (COMPLETE)"
description: "Source control used the raw brand clay as body text, which the codebase's own test forbids by name. The attachment tile's remove badge painted a 44px circle across its own status copy, so a rejected upload read as 'Phot preview unavailabl' — a defect no contrast or geometry check can see, because the text is perfectly legible right up until something is painted over it."
trigger_phrases:
  - "refine source control and small surfaces implementation summary"
  - "refine source control and small surfaces phase"
  - "implementation summary"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/014-refine-source-control-and-small-surfaces"
    last_updated_at: "2026-08-29T08:38:57.347Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Fixed clay-as-text in source control and the badge covering tile copy."
    next_safe_action: "Operator reviews; the archive and the audit are the evidence."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 14 implementation summary — refine source control and small surfaces

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|-------|-------|
| **Parent** | `008-uiux-features-mining` |
| **Level** | 2 |
| **Status** | Complete |
| **Scope** | 31 source-control, attachment and primitive screenshots |
| **Commits** | `211c5fc` |
| **Executors** | Grok 4.6 xhigh via Cursor and GPT-5.6 Luna xhigh via Codex, on disjoint files |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

- **Source control stopped using the brand colour as body text.** "Open on web", "Open pull request on
  the provider" and the reviewer status read at 2.94–3.12:1. This was a contract violation rather than
  an open question: `contrast.test.ts` carries a test named "does not treat raw clay as normal-size
  text on bone", and `--accent-ink` exists for exactly this. Three declarations now use it.
- **The attachment remove badge stopped covering the tile's own words.** The badge is 44x44 because
  that is the minimum touch target, and it painted its border and background across all of it, landing
  on the status copy of a 64x64 tile. The hit area is unchanged; only the painted circle shrank to
  22px, taking coverage of that text from 26% to 1.78%.
- **The status copy and the name chip stopped overlapping.** With the badge moved off, the last line
  still ran behind the "Photo 3" chip; the copy now sits above it.
- **The diff gutters inside source control cleared AA** through the shared invariant-muted fix
  recorded in the artifacts phase.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

The badge defect drove a new check. Control-versus-control overlap could not see it, because a badge
overlapping its own thumbnail is deliberate layering and suppressing that noise is what makes the
check usable. The signal that matters is a control painting over TEXT, which needed three corrections
before it was trustworthy: rectangle intersection alone flagged a fixed composer over a scrolling
transcript, hit-testing alone flagged text merely clipped out of its own scroller, and a coarse sample
grid rounded a badge clipping one corner of a label away to nothing.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

- **The touch target was never traded for the fix.** Shrinking the badge to clear the text would have
  been the easy repair and the wrong one; the 44px hit area is kept and only the paint is smaller,
  with the focus ring following the visible circle rather than floating around an invisible box.
- **Screen chrome floating above content is not reported.** A fixed composer over a transcript hides
  words that scrolling reveals. The check only reports a control covering text inside its own
  component, decided by the size of their shared ancestor.
- **The headless button primitive was left alone.** Its default, disabled and submit shots remain
  identical because the primitive is intentionally unstyled and its consumers supply the chrome —
  recorded in an earlier phase and unchanged here.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

- `node scripts/ui-audit.mjs` — no high or medium finding on any `source-control-*`, `attachments-*`
  or `primitives-*` story in either theme. The badge's `OCCLUDES_TEXT` finding is gone.
- Measured: the badge's hit area is still 44x44 at `[44,-12]` with visible chrome 22x22 at `[66,10]`,
  and hover, press and focus-visible were each confirmed to still render.
- Contrast after: accent ink 7.06:1 on white and 6.64:1 on canvas in light, 8.66:1 in dark.
- `npm run typecheck -w @pi-remote/web` — 1250 files, 0 errors (6 warnings, the standing baseline).
- `npm run test:web` — exit 0; 114 files / 782 passed + 3 skipped, and 83 files / 772 passed.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

- **The tile overlap fix is arithmetic, not browser-measured.** The executor's sandbox refused a local
  socket bind, so the 4px gap between the status copy and the name chip is computed from the resolved
  layout rather than read from a rendered page. The rendered archive was re-captured afterwards and
  shows the copy clear of the chip.
- **A 64x64 tile holding three lines of copy, a name chip and a 44px badge is inherently tight.** The
  current layout works, but any longer status string will crowd it again; the real fix is fewer words
  or a larger tile, which is a design decision rather than a refinement.
- **`OCCLUDES_TEXT` reports visual covering only.** A transparent control over text is excluded
  because every word still shows through, but it does still intercept the pointer — which is usually
  intended and is not checked either way.
<!-- /ANCHOR:limitations -->
